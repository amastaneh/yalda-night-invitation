import event from '../../../../config/event.json';
import type { Attendance, EventSettings, InvitationData } from '../../../../packages/shared/src';
import { giftOptions, torontoDay } from '../../../../packages/shared/src/party';

const key = 'yalda-test-invitation-v2';
function initial(): InvitationData {
  return {
    eventId: 'test',
    event: structuredClone(event) as EventSettings,
    household: {
      id: 'test',
      name: 'امیر و Faye',
      greeting: '',
      plusOnes: 0,
      revision: 0,
      pomegranates: 0,
    },
    members: ['امیر', 'Faye'].map((name, i) => ({
      id: String(i + 1),
      name,
      kind: 'adult',
      isPlusOne: 0,
      status: 'pending',
    })),
    response: { message: '', allergies: '', dietary: '', contact: '' },
    vehicle: null,
    attending: 0,
    campaigns: [],
    pledges: [],
    registry: [],
    guestbook: [],
    dailyFortune: null,
    giftChoices: giftOptions.map((o) => ({ kind: o.id, reserved: 0, mine: false })),
  };
}
export function demoRequest(path: string, input?: unknown): unknown {
  // A test-only reset link starts the local preview like a first visit.
  const url = new URL(window.location.href);
  if (url.searchParams.get('reset') === '1') {
    localStorage.removeItem(key);
    sessionStorage.removeItem('yalda-guest');
    url.searchParams.delete('reset');
    window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
  }
  let state = initial();
  try {
    const saved = localStorage.getItem(key);
    if (saved) state = JSON.parse(saved);
  } catch {
    /* Start a fresh preview if storage is unavailable. */
  }
  if (state.dailyFortune?.day !== torontoDay()) state.dailyFortune = null;
  state.event = structuredClone(event) as EventSettings;
  const body = input as {
    kind: string;
    selected: boolean;
    detail?: string;
    members: { id: string; status: Attendance }[];
    revision: number;
    vehicle?: InvitationData['vehicle'];
  };
  if (path === '/auth/invite') return { session: 'test', invitation: state };
  if (path === '/invitation') return state;
  if (path === '/guest/gift-choice') {
    const choice = state.giftChoices.find((o) => o.kind === body.kind);
    if (!choice) throw new Error('انتخاب معتبر نیست.');
    if (body.selected && !choice.mine && state.giftChoices.filter((o) => o.mine).length >= 2)
      throw new Error('یکی عالیه، دوتا کافیه.');
    choice.mine = body.selected;
    choice.reserved = body.selected ? 1 : 0;
    choice.detail = body.selected ? body.detail : undefined;
  } else if (path === '/guest/rsvp') {
    if (body.revision !== state.household.revision) throw new Error('صفحه را تازه کنید.');
    state.members.forEach((m) => {
      m.status = body.members.find((p) => p.id === m.id)?.status || m.status;
    });
    state.attending = state.members.filter((m) => m.status === 'attending').length;
    state.vehicle = state.members.every((m) => m.status === 'declined')
      ? null
      : body.vehicle || null;
    state.household.revision++;
  } else if (path === '/guest/fortune') {
    state.dailyFortune ||= {
      day: torontoDay(),
      index: Math.floor(Date.parse(torontoDay()) / 86400000) % 5,
    };
  } else throw new Error('این بخش در نسخهٔ آزمایشی فعال نیست.');
  localStorage.setItem(key, JSON.stringify(state));
  return path === '/guest/fortune' ? state.dailyFortune : { ok: true };
}
