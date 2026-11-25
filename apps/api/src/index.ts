import { drizzle } from 'drizzle-orm/d1';
import { eq, and, isNull } from 'drizzle-orm';
import { z } from 'zod';
import * as tables from '../../../packages/database/src/schema';
import {
  eventSchema,
  householdSchema,
  rsvpSchema,
  campaignSchema,
  pledgeSchema,
  commitmentSchema,
  csvCell,
  type EventSettings,
} from '../../../packages/shared/src/index';
import { id, now, hash, randomToken, passwordHash, equal } from './security';

interface Env {
  DB: D1Database;
  ALLOWED_ORIGIN: string;
  ENVIRONMENT: string;
}
type Session = {
  admin_id: string | null;
  invitation_id: string | null;
  household_id: string | null;
  event_id: string | null;
};
class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
function fail(status: number, message: string): never {
  throw new HttpError(status, message);
}
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
const audit = (db: D1Database, actor: string, action: string, resource: string) =>
  db
    .prepare('INSERT INTO audit_logs VALUES(?,?,?,?,?,?)')
    .bind(id(), actor, action, resource, now(), now());
const uuid = (s: string) => z.uuid().parse(s);
async function body(request: Request) {
  const reader = request.body?.getReader();
  if (!reader) fail(400, 'درخواست معتبر نیست.');
  const chunks: Uint8Array[] = [];
  let length = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > 64000) {
      await reader.cancel();
      fail(413, 'درخواست بیش از اندازه بزرگ است.');
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  const text = new TextDecoder().decode(bytes);
  try {
    return JSON.parse(text);
  } catch {
    fail(400, 'درخواست معتبر نیست.');
  }
}
async function session(req: Request, env: Env, admin = false): Promise<Session> {
  const bearer = req.headers.get('Authorization')?.match(/^Bearer ([a-f0-9]{64})$/)?.[1];
  if (!bearer) fail(401, 'لطفاً دوباره وارد شوید.');
  const s = await env.DB.prepare(
    'SELECT s.admin_id,s.invitation_id,t.household_id,h.event_id FROM sessions s LEFT JOIN invitation_tokens t ON t.id=s.invitation_id LEFT JOIN households h ON h.id=t.household_id WHERE s.hash=? AND s.expires_at>? AND (s.admin_id IS NOT NULL OR t.revoked_at IS NULL)',
  )
    .bind(await hash(bearer), now())
    .first<Session>();
  if (!s || (admin && !s.admin_id) || (!admin && !s.household_id))
    fail(401, 'نشست منقضی شده یا دعوت‌نامه لغو شده است.');
  return s;
}
async function issueSession(env: Env, adminId: string | null, invitationId: string | null) {
  const token = randomToken();
  await env.DB.prepare('INSERT INTO sessions VALUES(?,?,?,?)')
    .bind(
      await hash(token),
      adminId,
      invitationId,
      new Date(Date.now() + 8 * 3600000).toISOString(),
    )
    .run();
  return token;
}
async function eventFor(env: Env, eventId: string) {
  const event = await drizzle(env.DB)
    .select()
    .from(tables.events)
    .where(eq(tables.events.id, eventId))
    .get();
  if (!event) fail(404, 'رویداد یافت نشد.');
  return eventSchema.parse(JSON.parse(event.settings));
}
function openEvent(e: EventSettings, deadline = false) {
  if (e.status !== 'open') fail(409, 'این رویداد برای تغییرات بسته است.');
  if (deadline && Date.parse(e.deadline) < Date.now())
    fail(409, 'مهلت پاسخ‌گویی به پایان رسیده است. با میزبان تماس بگیرید.');
}
async function invitation(env: Env, s: Session) {
  const db = drizzle(env.DB);
  const h = await db
    .select()
    .from(tables.households)
    .where(eq(tables.households.id, s.household_id!))
    .get();
  if (!h) fail(404, 'دعوت‌نامه یافت نشد.');
  const e = await eventFor(env, h.eventId);
  if (e.status === 'archived') fail(410, 'این رویداد بایگانی شده است.');
  const [members, response, campaigns, pledges, registry, count, guestbook] = await Promise.all([
    db.select().from(tables.guests).where(eq(tables.guests.householdId, h.id)).all(),
    db.select().from(tables.responses).where(eq(tables.responses.householdId, h.id)).get(),
    env.DB.prepare(
      'SELECT c.*,COALESCE(SUM(p.received_cents),0) received FROM gift_campaigns c LEFT JOIN gift_pledges p ON c.id=p.campaign_id WHERE c.event_id=? GROUP BY c.id',
    )
      .bind(h.eventId)
      .all(),
    db.select().from(tables.pledges).where(eq(tables.pledges.householdId, h.id)).all(),
    env.DB.prepare(
      'SELECT i.id,i.name,i.unit,i.quantity,COALESCE(SUM(c.quantity),0) committed,COALESCE(SUM(CASE WHEN c.household_id=? THEN c.quantity ELSE 0 END),0) mine FROM registry_items i LEFT JOIN registry_commitments c ON c.item_id=i.id WHERE i.event_id=? GROUP BY i.id',
    )
      .bind(h.id, h.eventId)
      .all(),
    env.DB.prepare(
      "SELECT COUNT(*) total FROM guests g JOIN households h ON h.id=g.household_id WHERE h.event_id=? AND g.status='attending'",
    )
      .bind(h.eventId)
      .first<{ total: number }>(),
    env.DB.prepare(
      'SELECT g.id,g.message FROM guestbook_entries g JOIN households h ON h.id=g.household_id WHERE h.event_id=? AND g.approved=1 ORDER BY g.created_at DESC LIMIT 30',
    )
      .bind(h.eventId)
      .all(),
  ]);
  return {
    eventId: h.eventId,
    event: e,
    household: h,
    members,
    response: response || { dietary: '', allergies: '', message: '', contact: '' },
    attending: count?.total || 0,
    campaigns: campaigns.results.map((c) => {
      const config = campaignSchema.parse(JSON.parse(String(c.config)));
      const locked = c.kind === 'mystery' && Number(c.received) < config.targetCents;
      return {
        id: c.id,
        kind: c.kind,
        config: locked ? { ...config, product: '', imageUrl: '' } : config,
        receivedCents: c.received,
      };
    }),
    pledges,
    registry: registry.results,
    guestbook: guestbook.results,
  };
}
async function routes(req: Request, env: Env): Promise<Response> {
  const url = new URL(req.url);
  const path = url.pathname;
  const db = drizzle(env.DB);
  if (path === '/api/health' && req.method === 'GET') return json({ ok: true });
  if (path === '/api/auth/invite' && req.method === 'POST') {
    const { token } = z
      .object({ token: z.string().regex(/^[a-f0-9]{64}$/) })
      .parse(await body(req));
    const t = await db
      .select()
      .from(tables.invitationTokens)
      .where(
        and(
          eq(tables.invitationTokens.hash, await hash(token)),
          isNull(tables.invitationTokens.revokedAt),
        ),
      )
      .get();
    if (!t) fail(401, 'این دعوت‌نامه معتبر نیست یا لغو شده است.');
    const h = await db
      .select()
      .from(tables.households)
      .where(eq(tables.households.id, t.householdId))
      .get();
    if (!h) fail(401, 'دعوت‌نامه معتبر نیست.');
    const e = await eventFor(env, h.eventId);
    if (e.status === 'archived') fail(410, 'این رویداد بایگانی شده است.');
    return json({ session: await issueSession(env, null, t.id) });
  }
  if (path === '/api/auth/admin' && req.method === 'POST') {
    const input = z
      .object({ username: z.string().min(1).max(100), password: z.string().min(1).max(256) })
      .parse(await body(req));
    const a = await db
      .select()
      .from(tables.admins)
      .where(eq(tables.admins.username, input.username))
      .get();
    const derived = await passwordHash(
      input.password,
      a?.salt || 'invalid-user-constant-dummy-salt',
    );
    if (!a || !equal(derived, a.passwordHash)) fail(401, 'نام کاربری یا رمز عبور درست نیست.');
    await audit(env.DB, a.id, 'admin.login', a.id).run();
    return json({ session: await issueSession(env, a.id, null) });
  }
  if (path === '/api/auth/logout' && req.method === 'POST') {
    const token = req.headers.get('Authorization')?.slice(7) || '';
    await env.DB.prepare('DELETE FROM sessions WHERE hash=?')
      .bind(await hash(token))
      .run();
    return json({ ok: true });
  }
  if (path === '/api/invitation' && req.method === 'GET') {
    return json(await invitation(env, await session(req, env)));
  }
  if (path.startsWith('/api/guest/')) {
    const s = await session(req, env);
    const e = await eventFor(env, s.event_id!);
    if (req.method !== 'POST') fail(405, 'روش پشتیبانی نمی‌شود.');
    openEvent(e, path === '/api/guest/rsvp' || path === '/api/guest/plus-one');
    const input = await body(req);
    if (path === '/api/guest/rsvp') {
      const r = rsvpSchema.parse(input);
      const bodyHash = await hash(JSON.stringify(r));
      const previous = await env.DB.prepare(
        'SELECT body_hash,household_id FROM submissions WHERE id=?',
      )
        .bind(r.requestId)
        .first<{ body_hash: string; household_id: string }>();
      if (previous) {
        if (previous.household_id !== s.household_id || previous.body_hash !== bodyHash)
          fail(409, 'شناسهٔ درخواست تکراری است.');
        return json({ ok: true });
      }
      const members = await db
        .select()
        .from(tables.guests)
        .where(eq(tables.guests.householdId, s.household_id!))
        .all();
      if (
        members.length !== r.members.length ||
        new Set(r.members.map((m) => m.id)).size !== members.length ||
        r.members.some((m) => !members.some((g) => g.id === m.id))
      )
        fail(403, 'اعضای دعوت‌نامه معتبر نیستند.');
      const statements = [
        env.DB.prepare(
          'INSERT INTO submissions SELECT ?,?,?,? WHERE EXISTS(SELECT 1 FROM households WHERE id=? AND revision=?)',
        ).bind(r.requestId, s.household_id, bodyHash, now(), s.household_id, r.revision),
        ...r.members.map((m) =>
          env.DB.prepare(
            'UPDATE guests SET status=?,updated_at=? WHERE id=? AND household_id=? AND EXISTS(SELECT 1 FROM households WHERE id=? AND revision=?)',
          ).bind(m.status, now(), m.id, s.household_id, s.household_id, r.revision),
        ),
        env.DB.prepare(
          'INSERT INTO rsvp_responses(id,household_id,dietary,allergies,message,contact,created_at,updated_at) SELECT ?,?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM households WHERE id=? AND revision=?) ON CONFLICT(household_id) DO UPDATE SET dietary=excluded.dietary,allergies=excluded.allergies,message=excluded.message,contact=excluded.contact,updated_at=excluded.updated_at',
        ).bind(
          id(),
          s.household_id,
          r.dietary,
          r.allergies,
          r.message,
          r.contact,
          now(),
          now(),
          s.household_id,
          r.revision,
        ),
        env.DB.prepare(
          'UPDATE households SET revision=revision+1,updated_at=? WHERE id=? AND revision=?',
        ).bind(now(), s.household_id, r.revision),
      ];
      const results = await env.DB.batch(statements);
      if (!results.at(-1)?.meta.changes) {
        const saved = await env.DB.prepare(
          'SELECT body_hash FROM submissions WHERE id=? AND household_id=?',
        )
          .bind(r.requestId, s.household_id)
          .first<{ body_hash: string }>();
        if (saved?.body_hash !== bodyHash)
          fail(409, 'پاسخ در صفحهٔ دیگری تغییر کرده؛ صفحه را تازه کنید.');
      } else await audit(env.DB, s.household_id!, 'rsvp.update', s.household_id!).run();
      return json({ ok: true });
    }
    if (path === '/api/guest/plus-one') {
      const r = z
        .object({ name: z.string().trim().min(1).max(100), kind: z.enum(['adult', 'child']) })
        .parse(input);
      const guestId = id();
      const results = await env.DB.batch([
        env.DB.prepare(
          "INSERT INTO guests SELECT ?,id,?,?,'pending',1,?,? FROM households WHERE id=? AND (SELECT COUNT(*) FROM guests WHERE household_id=? AND is_plus_one=1)<plus_ones",
        ).bind(guestId, r.name, r.kind, now(), now(), s.household_id, s.household_id),
        env.DB.prepare(
          'UPDATE households SET revision=revision+1,updated_at=? WHERE id=? AND EXISTS(SELECT 1 FROM guests WHERE id=?)',
        ).bind(now(), s.household_id, guestId),
      ]);
      if (!results[0].meta.changes) fail(409, 'ظرفیت همراه تکمیل است.');
      await audit(env.DB, s.household_id!, 'guest.plus-one.create', guestId).run();
      return json({ ok: true });
    }
    if (path === '/api/guest/pledge') {
      if (!e.features.gifts) fail(409, 'هدیه غیرفعال است.');
      const r = pledgeSchema.parse(input);
      const c = await db
        .select()
        .from(tables.campaigns)
        .where(
          and(eq(tables.campaigns.id, r.campaignId), eq(tables.campaigns.eventId, s.event_id!)),
        )
        .get();
      if (
        !c ||
        !campaignSchema.parse(JSON.parse(c.config)).enabled ||
        (c.kind === 'mystery' && !e.features.mystery)
      )
        fail(404, 'پویش فعال نیست.');
      const p = await db
        .select()
        .from(tables.pledges)
        .where(
          and(eq(tables.pledges.householdId, s.household_id!), eq(tables.pledges.campaignId, c.id)),
        )
        .get();
      if (p && p.receivedCents > r.amountCents)
        fail(409, 'برای اصلاح هدیهٔ دریافت‌شده با میزبان تماس بگیرید.');
      await env.DB.batch([
        env.DB.prepare(
          'INSERT INTO gift_pledges VALUES(?,?,?,?,0,?,?) ON CONFLICT(household_id,campaign_id) DO UPDATE SET amount_cents=excluded.amount_cents,updated_at=excluded.updated_at',
        ).bind(id(), s.household_id, c.id, r.amountCents, now(), now()),
        audit(env.DB, s.household_id!, 'pledge.update', c.id),
      ]);
      return json({ ok: true });
    }
    if (path === '/api/guest/commitment') {
      if (!e.features.feast) fail(409, 'سفره غیرفعال است.');
      const r = commitmentSchema.parse(input);
      const item = await db
        .select()
        .from(tables.registryItems)
        .where(
          and(eq(tables.registryItems.id, r.itemId), eq(tables.registryItems.eventId, s.event_id!)),
        )
        .get();
      if (!item) fail(404, 'گزینه یافت نشد.');
      await env.DB.batch([
        env.DB.prepare(
          'INSERT INTO registry_commitments VALUES(?,?,?,?,?,?) ON CONFLICT(household_id,item_id) DO UPDATE SET quantity=excluded.quantity,updated_at=excluded.updated_at',
        ).bind(id(), s.household_id, item.id, r.quantity, now(), now()),
        audit(env.DB, s.household_id!, 'registry.update', item.id),
      ]);
      return json({ ok: true });
    }
    if (path === '/api/guest/pomegranates') {
      if (!e.features.pomegranate) fail(409, 'چالش غیرفعال است.');
      const r = z.object({ quantity: z.number().int().min(0).max(e.pomegranateMax) }).parse(input);
      await db
        .update(tables.households)
        .set({ pomegranates: r.quantity, updatedAt: now() })
        .where(eq(tables.households.id, s.household_id!));
      return json({ ok: true });
    }
    if (path === '/api/guest/guestbook') {
      if (!e.features.guestbook) fail(409, 'دفتر یادگاری غیرفعال است.');
      const r = z.object({ message: z.string().trim().min(1).max(500) }).parse(input);
      const count = await env.DB.prepare(
        'SELECT COUNT(*) n FROM guestbook_entries WHERE household_id=?',
      )
        .bind(s.household_id)
        .first<{ n: number }>();
      if ((count?.n || 0) >= 10) fail(409, 'حداکثر ده یادگاری برای هر خانواده.');
      await db.insert(tables.guestbook).values({
        id: id(),
        householdId: s.household_id!,
        message: r.message,
        approved: 0,
        createdAt: now(),
        updatedAt: now(),
      });
      return json({ ok: true });
    }
    fail(404, 'مسیر یافت نشد.');
  }
  if (path.startsWith('/api/admin/')) {
    const s = await session(req, env, true);
    const actor = s.admin_id!;
    if (path === '/api/admin/events' && req.method === 'GET')
      return json(await db.select().from(tables.events).all());
    if (path === '/api/admin/events' && req.method === 'POST') {
      const e = eventSchema.parse(await body(req));
      const eventId = id();
      await db
        .insert(tables.events)
        .values({ id: eventId, settings: JSON.stringify(e), createdAt: now(), updatedAt: now() });
      await audit(env.DB, actor, 'event.create', eventId).run();
      return json({ id: eventId }, 201);
    }
    const eventMatch = path.match(/^\/api\/admin\/events\/([^/]+)(?:\/(.*))?$/);
    if (eventMatch) {
      const eventId = uuid(eventMatch[1]);
      const suffix = eventMatch[2] || '';
      await eventFor(env, eventId);
      if (!suffix && req.method === 'PUT') {
        const e = eventSchema.parse(await body(req));
        await env.DB.batch([
          env.DB.prepare('UPDATE events SET settings=?,updated_at=? WHERE id=?').bind(
            JSON.stringify(e),
            now(),
            eventId,
          ),
          audit(env.DB, actor, 'event.update', eventId),
        ]);
        return json({ ok: true });
      }
      if (suffix === 'overview' && req.method === 'GET') {
        const [
          households,
          members,
          pledges,
          registry,
          campaigns,
          guestbook,
          responses,
          logs,
          commitments,
        ] = await Promise.all([
          db.select().from(tables.households).where(eq(tables.households.eventId, eventId)).all(),
          env.DB.prepare(
            'SELECT g.* FROM guests g JOIN households h ON h.id=g.household_id WHERE h.event_id=?',
          )
            .bind(eventId)
            .all(),
          env.DB.prepare(
            'SELECT p.*,h.name household_name,c.config campaign_config FROM gift_pledges p JOIN households h ON h.id=p.household_id JOIN gift_campaigns c ON c.id=p.campaign_id WHERE h.event_id=?',
          )
            .bind(eventId)
            .all(),
          env.DB.prepare(
            'SELECT i.*,COALESCE(SUM(c.quantity),0) committed FROM registry_items i LEFT JOIN registry_commitments c ON c.item_id=i.id WHERE i.event_id=? GROUP BY i.id',
          )
            .bind(eventId)
            .all(),
          db.select().from(tables.campaigns).where(eq(tables.campaigns.eventId, eventId)).all(),
          env.DB.prepare(
            'SELECT g.*,h.name household_name FROM guestbook_entries g JOIN households h ON h.id=g.household_id WHERE h.event_id=? ORDER BY g.created_at DESC',
          )
            .bind(eventId)
            .all(),
          env.DB.prepare(
            'SELECT r.* FROM rsvp_responses r JOIN households h ON h.id=r.household_id WHERE h.event_id=?',
          )
            .bind(eventId)
            .all(),
          env.DB.prepare(
            'SELECT action,resource_id,created_at FROM audit_logs ORDER BY created_at DESC LIMIT 50',
          ).all(),
          env.DB.prepare(
            'SELECT c.id,c.quantity,h.name household_name,i.name item_name,i.unit FROM registry_commitments c JOIN households h ON h.id=c.household_id JOIN registry_items i ON i.id=c.item_id WHERE h.event_id=? AND c.quantity>0 ORDER BY i.name,h.name',
          )
            .bind(eventId)
            .all(),
        ]);
        return json({
          households,
          members: members.results,
          pledges: pledges.results,
          registry: registry.results,
          campaigns,
          guestbook: guestbook.results,
          responses: responses.results,
          audit: logs.results,
          commitments: commitments.results,
        });
      }
      if (suffix === 'export' && req.method === 'GET') {
        const rows = await env.DB.prepare(
          'SELECT h.name household,g.name,g.kind,g.status,r.dietary,r.allergies,r.message,r.contact FROM households h JOIN guests g ON g.household_id=h.id LEFT JOIN rsvp_responses r ON r.household_id=h.id WHERE h.event_id=? ORDER BY h.name,g.name',
        )
          .bind(eventId)
          .all();
        const keys = [
          'household',
          'name',
          'kind',
          'status',
          'dietary',
          'allergies',
          'message',
          'contact',
        ];
        return new Response(
          '\uFEFF' +
            [
              keys.map(csvCell).join(','),
              ...rows.results.map((r) => keys.map((k) => csvCell(r[k])).join(',')),
            ].join('\r\n'),
          {
            headers: {
              'Content-Type': 'text/csv; charset=utf-8',
              'Content-Disposition': 'attachment; filename="yalda-guests.csv"',
            },
          },
        );
      }
      if (suffix === 'households' && req.method === 'POST') {
        const h = householdSchema.parse(await body(req));
        const hid = id();
        await env.DB.batch([
          env.DB.prepare('INSERT INTO households VALUES(?,?,?,?,?,0,0,?,?)').bind(
            hid,
            eventId,
            h.name,
            h.greeting,
            h.plusOnes,
            now(),
            now(),
          ),
          ...h.members.map((m) =>
            env.DB.prepare('INSERT INTO guests VALUES(?,?,?,?,?,0,?,?)').bind(
              id(),
              hid,
              m.name,
              m.kind,
              m.status,
              now(),
              now(),
            ),
          ),
          audit(env.DB, actor, 'household.create', hid),
        ]);
        return json({ id: hid }, 201);
      }
      if (suffix === 'import' && req.method === 'POST') {
        const rows = z
          .array(householdSchema)
          .min(1)
          .max(100)
          .parse(await body(req));
        const statements: D1PreparedStatement[] = [];
        for (const h of rows) {
          const hid = id();
          statements.push(
            env.DB.prepare('INSERT INTO households VALUES(?,?,?,?,?,0,0,?,?)').bind(
              hid,
              eventId,
              h.name,
              h.greeting,
              h.plusOnes,
              now(),
              now(),
            ),
            ...h.members.map((m) =>
              env.DB.prepare('INSERT INTO guests VALUES(?,?,?,?,?,0,?,?)').bind(
                id(),
                hid,
                m.name,
                m.kind,
                m.status,
                now(),
                now(),
              ),
            ),
          );
        }
        if (statements.length > 400) fail(400, 'حداکثر ۴۰۰ عضو در هر ورود.');
        await env.DB.batch([...statements, audit(env.DB, actor, 'households.import', eventId)]);
        return json({ ok: true, count: rows.length });
      }
      if (suffix === 'campaigns' && req.method === 'POST') {
        const c = z
          .object({ kind: z.enum(['console', 'mystery']), config: campaignSchema })
          .parse(await body(req));
        await db.insert(tables.campaigns).values({
          id: id(),
          eventId,
          kind: c.kind,
          config: JSON.stringify(c.config),
          createdAt: now(),
          updatedAt: now(),
        });
        await audit(env.DB, actor, 'campaign.create', eventId).run();
        return json({ ok: true });
      }
      if (suffix === 'registry' && req.method === 'POST') {
        const r = z
          .object({
            name: z.string().min(1).max(150),
            unit: z.string().min(1).max(50),
            quantity: z.number().int().min(0).max(500),
          })
          .parse(await body(req));
        await db
          .insert(tables.registryItems)
          .values({ ...r, id: id(), eventId, createdAt: now(), updatedAt: now() });
        await audit(env.DB, actor, 'registry.create', eventId).run();
        return json({ ok: true });
      }
    }
    const hm = path.match(/^\/api\/admin\/households\/([^/]+)(?:\/(token|revoke))?$/);
    if (hm) {
      const hid = uuid(hm[1]);
      const h = await db
        .select()
        .from(tables.households)
        .where(eq(tables.households.id, hid))
        .get();
      if (!h) fail(404, 'خانواده یافت نشد.');
      if (hm[2] === 'revoke' && req.method === 'POST') {
        await env.DB.batch([
          env.DB.prepare(
            'UPDATE invitation_tokens SET revoked_at=?,updated_at=? WHERE household_id=? AND revoked_at IS NULL',
          ).bind(now(), now(), hid),
          audit(env.DB, actor, 'invitation.revoke', hid),
        ]);
        return json({ ok: true });
      }
      if (hm[2] === 'token' && req.method === 'POST') {
        const token = randomToken();
        await env.DB.batch([
          env.DB.prepare(
            'UPDATE invitation_tokens SET revoked_at=?,updated_at=? WHERE household_id=? AND revoked_at IS NULL',
          ).bind(now(), now(), hid),
          env.DB.prepare('INSERT INTO invitation_tokens VALUES(?,?,?,NULL,?,?)').bind(
            id(),
            hid,
            await hash(token),
            now(),
            now(),
          ),
          audit(env.DB, actor, 'invitation.regenerate', hid),
        ]);
        return json({ token });
      }
      if (!hm[2] && req.method === 'DELETE') {
        await env.DB.batch([
          env.DB.prepare('DELETE FROM households WHERE id=?').bind(hid),
          audit(env.DB, actor, 'household.delete', hid),
        ]);
        return json({ ok: true });
      }
      if (!hm[2] && req.method === 'PUT') {
        const r = householdSchema.parse(await body(req));
        const members = await db
          .select()
          .from(tables.guests)
          .where(eq(tables.guests.householdId, hid))
          .all();
        if (
          r.members.some((m) => m.id && !members.some((g) => g.id === m.id)) ||
          new Set(r.members.filter((m) => m.id).map((m) => m.id)).size !==
            r.members.filter((m) => m.id).length
        )
          fail(403, 'عضو معتبر نیست.');
        const statements = [
          env.DB.prepare(
            'UPDATE households SET name=?,greeting=?,plus_ones=?,revision=revision+1,updated_at=? WHERE id=?',
          ).bind(r.name, r.greeting, r.plusOnes, now(), hid),
          ...r.members.map((m) =>
            env.DB.prepare(
              'INSERT INTO guests VALUES(?,?,?,?,?,0,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,kind=excluded.kind,status=excluded.status,updated_at=excluded.updated_at',
            ).bind(m.id || id(), hid, m.name, m.kind, m.status, now(), now()),
          ),
          ...members
            .filter((m) => !r.members.some((g) => g.id === m.id))
            .map((m) => env.DB.prepare('DELETE FROM guests WHERE id=?').bind(m.id)),
          audit(env.DB, actor, 'household.update', hid),
        ];
        await env.DB.batch(statements);
        return json({ ok: true });
      }
    }
    const pledgeMatch = path.match(/^\/api\/admin\/pledges\/([^/]+)$/);
    if (pledgeMatch && req.method === 'PUT') {
      const p = uuid(pledgeMatch[1]);
      const r = z
        .object({
          amountCents: z.number().int().min(0).max(1000000),
          receivedCents: z.number().int().min(0).max(1000000),
        })
        .refine((r) => r.receivedCents <= r.amountCents)
        .parse(await body(req));
      await env.DB.batch([
        env.DB.prepare(
          'UPDATE gift_pledges SET amount_cents=?,received_cents=?,updated_at=? WHERE id=?',
        ).bind(r.amountCents, r.receivedCents, now(), p),
        audit(env.DB, actor, 'pledge.receipt.update', p),
      ]);
      return json({ ok: true });
    }
    const cm = path.match(/^\/api\/admin\/campaigns\/([^/]+)$/);
    if (cm && req.method === 'PUT') {
      const r = campaignSchema.parse(await body(req));
      await env.DB.batch([
        env.DB.prepare('UPDATE gift_campaigns SET config=?,updated_at=? WHERE id=?').bind(
          JSON.stringify(r),
          now(),
          uuid(cm[1]),
        ),
        audit(env.DB, actor, 'campaign.update', cm[1]),
      ]);
      return json({ ok: true });
    }
    const im = path.match(/^\/api\/admin\/registry\/([^/]+)$/);
    if (im && req.method === 'PUT') {
      const r = z
        .object({
          name: z.string().min(1).max(150),
          unit: z.string().min(1).max(50),
          quantity: z.number().int().min(0).max(500),
        })
        .parse(await body(req));
      await env.DB.batch([
        env.DB.prepare(
          'UPDATE registry_items SET name=?,unit=?,quantity=?,updated_at=? WHERE id=?',
        ).bind(r.name, r.unit, r.quantity, now(), uuid(im[1])),
        audit(env.DB, actor, 'registry.update', im[1]),
      ]);
      return json({ ok: true });
    }
    const commitmentMatch = path.match(/^\/api\/admin\/commitments\/([^/]+)$/);
    if (commitmentMatch && req.method === 'PUT') {
      const r = z.object({ quantity: z.number().int().min(0).max(500) }).parse(await body(req));
      await env.DB.batch([
        env.DB.prepare('UPDATE registry_commitments SET quantity=?,updated_at=? WHERE id=?').bind(
          r.quantity,
          now(),
          uuid(commitmentMatch[1]),
        ),
        audit(env.DB, actor, 'commitment.update', commitmentMatch[1]),
      ]);
      return json({ ok: true });
    }
    const gm = path.match(/^\/api\/admin\/guestbook\/([^/]+)$/);
    if (gm && req.method === 'PUT') {
      const r = z.object({ approved: z.boolean() }).parse(await body(req));
      await env.DB.batch([
        env.DB.prepare('UPDATE guestbook_entries SET approved=?,updated_at=? WHERE id=?').bind(
          r.approved ? 1 : 0,
          now(),
          uuid(gm[1]),
        ),
        audit(env.DB, actor, 'guestbook.moderate', gm[1]),
      ]);
      return json({ ok: true });
    }
    fail(404, 'مسیر یافت نشد.');
  }
  fail(404, 'مسیر یافت نشد.');
}

const worker = {
  async fetch(req: Request, env: Env): Promise<Response> {
    const origin = req.headers.get('Origin');
    const headers = new Headers({
      'Cache-Control': 'no-store, private',
      'Referrer-Policy': 'no-referrer',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-Robots-Tag': 'noindex, nofollow',
      'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
      Vary: 'Origin',
    });
    if (origin === env.ALLOWED_ORIGIN) {
      headers.set('Access-Control-Allow-Origin', origin);
      headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    }
    try {
      if (origin && origin !== env.ALLOWED_ORIGIN) fail(403, 'مبدأ درخواست مجاز نیست.');
      if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers });
      if (
        ['POST', 'PUT', 'DELETE'].includes(req.method) &&
        (!origin ||
          origin !== env.ALLOWED_ORIGIN ||
          !req.headers.get('Content-Type')?.startsWith('application/json'))
      )
        fail(403, 'درخواست مجاز نیست.');
      const pathname = new URL(req.url).pathname;
      const isAdminLogin = pathname === '/api/auth/admin';
      const isInviteLogin = pathname === '/api/auth/invite';
      const windowMs = isAdminLogin || isInviteLogin ? 900000 : 60000;
      const limit = isAdminLogin ? 20 : isInviteLogin ? 120 : 240;
      const ip =
        req.headers.get('CF-Connecting-IP') ||
        (env.ENVIRONMENT === 'development' ? 'local' : 'unknown');
      const bucket = await hash(
        `${ip}|${isAdminLogin ? 'admin-login' : isInviteLogin ? 'invite-login' : 'api'}|${Math.floor(Date.now() / windowMs)}`,
      );
      const rate = await env.DB.prepare(
        'INSERT INTO rate_limits VALUES(?,1,?) ON CONFLICT(bucket) DO UPDATE SET count=count+1 RETURNING count',
      )
        .bind(bucket, Date.now() + windowMs)
        .first<{ count: number }>();
      if ((rate?.count || 0) > limit) {
        headers.set('Retry-After', String(Math.ceil(windowMs / 1000)));
        fail(429, 'تعداد درخواست‌ها زیاد است. کمی بعد تلاش کنید.');
      }
      const result = await routes(req, env);
      headers.forEach((v, k) => result.headers.set(k, v));
      return result;
    } catch (error) {
      let status = 500,
        message = 'خطایی رخ داد. دوباره تلاش کنید.';
      if (error instanceof HttpError) {
        status = error.status;
        message = error.message;
      } else if (error instanceof z.ZodError) {
        status = 400;
        message = 'اطلاعات واردشده معتبر نیست. فیلدها را بررسی کنید.';
      } else if (String(error).includes('registry_capacity')) {
        status = 409;
        message = 'ظرفیت این گزینه تغییر کرده؛ صفحه را تازه کنید.';
      }
      const response = json({ error: message }, status);
      headers.forEach((v, k) => response.headers.set(k, v));
      return response;
    }
  },
  async scheduled(_controller: ScheduledController, env: Env) {
    await env.DB.batch([
      env.DB.prepare('DELETE FROM sessions WHERE expires_at<?').bind(now()),
      env.DB.prepare('DELETE FROM rate_limits WHERE expires_at<?').bind(Date.now()),
      env.DB.prepare('DELETE FROM submissions WHERE created_at<?').bind(
        new Date(Date.now() - 30 * 86400000).toISOString(),
      ),
    ]);
  },
};

export default worker;
