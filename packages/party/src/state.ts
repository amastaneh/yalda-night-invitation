import guests from '../../../config/guests.json';
import event from '../../../config/event.json';
import type { Attendance, EventSettings, InvitationData } from '../../shared/src';
import { giftOptions, torontoDay, type DailyFortune, type GiftKind } from '../../shared/src/party';

export interface FamilyResponse {
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
    if (body.selected === mine) return { data: { ok: true }, changed: false };
    if (body.selected) {
      if (response.gifts.length >= 2) throw new PartyError(409, 'یکی عالیه، دوتا کافیه.');
      if (overview(state).filter((f) => f.gifts.includes(option.id)).length >= option.capacity)
        throw new PartyError(409, 'ظرفیت این گزینه تکمیل است.');
      response.gifts.push(option.id);
    } else response.gifts = response.gifts.filter((id) => id !== option.id);
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
