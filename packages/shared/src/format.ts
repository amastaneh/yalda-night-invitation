import type { EventSettings } from './index';
export const money = (cents: number) =>
  new Intl.NumberFormat('fa-CA', {
    style: 'currency',
    currency: 'CAD',
    maximumFractionDigits: 0,
  }).format(cents / 100);
export const number = (n: number) => new Intl.NumberFormat('fa-IR').format(n);
export function dateLabel(date: string, calendar = 'persian') {
  return new Intl.DateTimeFormat(`fa-IR-u-ca-${calendar}`, {
    dateStyle: 'full',
    timeZone: 'America/Toronto',
  }).format(new Date(date));
}
export function timeLabel(date: string) {
  return new Intl.DateTimeFormat('fa-IR', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'America/Toronto',
  }).format(new Date(date));
}
const stamp = (d: string) =>
  new Date(d)
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '');
const escapeICS = (s: string) =>
  s.replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
// RFC 5545 folding counts UTF-8 octets, not JavaScript code units.
export function foldICS(line: string) {
  let out = '',
    bytes = 0;
  for (const c of line) {
    const n = new TextEncoder().encode(c).length;
    if (bytes + n > 73) {
      out += '\r\n ';
      bytes = 1;
    }
    out += c;
    bytes += n;
  }
  return out;
}
export function calendarICS(e: EventSettings, id: string, now = new Date()) {
  return (
    [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Yalda Together//Invitation//FA',
      'CALSCALE:GREGORIAN',
      'BEGIN:VEVENT',
      `UID:${id}@yalda.invalid`,
      `DTSTAMP:${stamp(now.toISOString())}`,
      `DTSTART:${stamp(e.startsAt)}`,
      `DTEND:${stamp(e.endsAt)}`,
      `SUMMARY:${escapeICS(e.title)}`,
      `DESCRIPTION:${escapeICS(e.description)}`,
      `LOCATION:${escapeICS([e.venue, e.address].filter(Boolean).join(', '))}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ]
      .map(foldICS)
      .join('\r\n') + '\r\n'
  );
}
export function calendarLinks(e: EventSettings) {
  const google = new URL('https://calendar.google.com/calendar/render');
  Object.entries({
    action: 'TEMPLATE',
    text: e.title,
    dates: `${stamp(e.startsAt)}/${stamp(e.endsAt)}`,
    details: e.description,
    location: e.address,
    ctz: 'America/Toronto',
  }).forEach(([k, v]) => google.searchParams.set(k, v));
  const outlook = new URL('https://outlook.live.com/calendar/0/deeplink/compose');
  Object.entries({
    path: '/calendar/action/compose',
    rru: 'addevent',
    subject: e.title,
    startdt: e.startsAt,
    enddt: e.endsAt,
    body: e.description,
    location: e.address,
  }).forEach(([k, v]) => outlook.searchParams.set(k, v));
  return { google: google.href, outlook: outlook.href };
}
export function progress(received: number, target: number) {
  return Math.min(100, Math.max(0, Math.floor((received / target) * 100)));
}
export function csvCell(value: unknown) {
  const s = String(value ?? '');
  return `"${(/^[\s]*[=+@\-\t\r]/.test(s) ? "'" : '') + s.replace(/"/g, '""')}"`;
}
