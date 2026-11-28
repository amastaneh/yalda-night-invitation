import guests from '../../../config/guests.json' with { type: 'json' };
import event from '../../../config/event.json' with { type: 'json' };
import {
  vehicleSchema,
  type Attendance,
  type EventSettings,
  type InvitationData,
  type Vehicle,
} from '../../shared/src';
import {
  giftOptions,
  giftDetailOptions,
  torontoDay,
  type DailyFortune,
  type GiftKind,
  type GiftDetails,
} from '../../shared/src/party';

export interface FamilyResponse {
  giftDetails?: GiftDetails;
  vehicle?: Vehicle | null;
  statuses: Record<string, Attendance>;
  gifts: GiftKind[];
  revision: number;
  fortune: DailyFortune | null;
  updatedAt: string;
}
export interface PartyState {
  version: 1;
  responses: Record<string, FamilyResponse>;
}
export interface PartyInput {
  path: string;
  method: string;
  session?: string;
  body?: unknown;
}
export class PartyError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export const emptyState = (): PartyState => ({ version: 1, responses: {} });
const responseFor = (state: PartyState, slug: string): FamilyResponse =>
  state.responses[slug] || {
    statuses: {},
    gifts: [],
    revision: 0,
    fortune: null,
    updatedAt: '',
  };
function findFamily(value: unknown) {
  const slug = String(value || '');
  const family = guests.find((g) => g.slug === slug || String(g.legacyId || '') === slug);
  if (!family) throw new PartyError(401, 'این دعوت‌نامه معتبر نیست.');
  return family;
}
export function overview(state: PartyState) {
  return guests.map((family) => {
    const response = responseFor(state, family.slug);
    return {
      slug: family.slug,
      name: family.name,
      members: family.members.map((name, i) => ({
        id: String(i + 1),
        name,
        status: response.statuses[name] || 'pending',
      })),
      gifts: response.gifts,
      giftDetails: response.giftDetails || {},
      vehicle: response.vehicle || null,
      updatedAt: response.updatedAt,
    };
  });
}
export function invitationFor(state: PartyState, slug: string): InvitationData {
  const family = findFamily(slug),
    response = responseFor(state, family.slug);
  const all = overview(state);
  return {
    eventId: 'yalda-2026',
    vehicle: response.vehicle || null,
    event: event as EventSettings,
    household: {
      id: family.slug,
      name: family.name,
      greeting: '',
      plusOnes: 0,
      revision: response.revision,
      pomegranates: 0,
    },
    members: family.members.map((name, i) => ({
      id: String(i + 1),
      name,
      kind: 'adult',
      isPlusOne: 0,
      status: response.statuses[name] || 'pending',
    })),
    response: { dietary: '', allergies: '', message: '', contact: '' },
    attending: all.reduce(
      (n, f) => n + f.members.filter((m) => m.status === 'attending').length,
      0,
    ),
    campaigns: [],
    pledges: [],
    registry: [],
    guestbook: [],
    giftChoices: giftOptions.map((o) => ({
      kind: o.id,
      mine: response.gifts.includes(o.id),
      detail: response.giftDetails?.[o.id as keyof GiftDetails],
      reserved: all.filter((f) => f.gifts.includes(o.id)).length,
    })),
    dailyFortune: response.fortune?.day === torontoDay() ? response.fortune : null,
  };
}
export function applyGuestRequest(
  state: PartyState,
  input: PartyInput,
): { data: unknown; changed: boolean } {
  const body = (input.body || {}) as Record<string, unknown>;
  const login = input.path === '/api/auth/invite' && input.method === 'POST';
  const family = findFamily(login ? body.family : input.session);
  if (login)
    return {
      data: { session: family.slug, invitation: invitationFor(state, family.slug) },
      changed: false,
    };
  if (input.path === '/api/invitation' && input.method === 'GET')
    return { data: invitationFor(state, family.slug), changed: false };
  if (input.method !== 'POST') throw new PartyError(405, 'روش مجاز نیست.');
  const response = structuredClone(responseFor(state, family.slug));
  if (input.path === '/api/guest/gift-choice') {
    const option = giftOptions.find((o) => o.id === body.kind);
    if (!option || typeof body.selected !== 'boolean')
      throw new PartyError(400, 'انتخاب معتبر نیست.');
    const mine = response.gifts.includes(option.id);
    const detailKind = option.id as keyof GiftDetails;
    const detailOptions: readonly string[] | undefined = giftDetailOptions[detailKind];
    const detail =
      body.detail === undefined
        ? response.giftDetails?.[detailKind] || detailOptions?.[0]
        : body.detail;
    if (
      body.selected &&
      detailOptions &&
      (typeof detail !== 'string' || !detailOptions.includes(detail))
    )
      throw new PartyError(400, 'نوع پذیرایی معتبر نیست.');
    const detailChanged =
      body.selected && detailOptions && response.giftDetails?.[detailKind] !== detail;
    if (body.selected === mine && !detailChanged) return { data: { ok: true }, changed: false };
    if (body.selected) {
      if (!mine && response.gifts.length >= 2) throw new PartyError(409, 'یکی عالیه، دوتا کافیه.');
      if (
        !mine &&
        overview(state).filter((f) => f.gifts.includes(option.id)).length >= option.capacity
      )
        throw new PartyError(409, 'ظرفیت این گزینه تکمیل است.');
      if (!mine) response.gifts.push(option.id);
      if (detailOptions)
        response.giftDetails = { ...response.giftDetails, [detailKind]: detail as string };
    } else {
      response.gifts = response.gifts.filter((id) => id !== option.id);
      if (response.giftDetails) delete response.giftDetails[detailKind];
    }
  } else if (input.path === '/api/guest/rsvp') {
    if (Date.now() > Date.parse(event.deadline))
      throw new PartyError(409, 'مهلت پاسخ پایان یافته است.');
    if (body.revision !== response.revision)
      throw new PartyError(409, 'پاسخ تغییر کرده؛ صفحه را تازه کنید.');
    const people = body.members as { id: string; status: Attendance }[];
    if (
      !Array.isArray(people) ||
      people.length !== family.members.length ||
      new Set(people.map((m) => m.id)).size !== people.length ||
      people.some(
        (m) =>
          !/^[0-9]+$/.test(m.id) ||
          !family.members[Number(m.id) - 1] ||
          !['pending', 'attending', 'declined', 'maybe'].includes(m.status),
      )
    )
      throw new PartyError(400, 'اعضا معتبر نیستند.');
    response.statuses = Object.fromEntries(
      people.map((m) => [family.members[Number(m.id) - 1], m.status]),
    );
    if (Object.hasOwn(body, 'vehicle')) {
      const parsed = vehicleSchema.nullable().safeParse(body.vehicle);
      if (!parsed.success)
        throw new PartyError(400, 'رنگ، برند، مدل و پلاک خودرو را کامل وارد کنید.');
      response.vehicle = people.every((m) => m.status === 'declined') ? null : parsed.data;
    }
  } else if (input.path === '/api/guest/fortune') {
    if (response.fortune?.day === torontoDay()) return { data: response.fortune, changed: false };
    response.fortune = {
      day: torontoDay(),
      index: (Math.floor(Date.parse(torontoDay()) / 86400000) + Number(family.slug)) % 5,
    };
  } else throw new PartyError(404, 'این بخش فعال نیست.');
  response.revision++;
  response.updatedAt = new Date().toISOString();
  state.responses[family.slug] = response;
  return {
    data: input.path === '/api/guest/fortune' ? response.fortune : { ok: true },
    changed: true,
  };
}
