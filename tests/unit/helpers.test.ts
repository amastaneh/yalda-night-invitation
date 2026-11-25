import { describe, it, expect } from 'vitest';
import {
  calendarICS,
  calendarLinks,
  csvCell,
  progress,
  eventSchema,
  foldICS,
} from '../../packages/shared/src';
import { hash, randomToken, passwordHash, equal } from '../../apps/api/src/security';
import { event } from './fixture';

describe('calendar and localization contracts', () => {
  it('creates timezone-independent UTC calendar events with escaped fields', () => {
    const ics = calendarICS(event, 'fixture');
    expect(ics).toContain('DTSTART:20991221T230000Z');
    expect(ics).toContain('DTEND:20991222T040000Z');
    expect(ics).toContain('SUMMARY:شب یلدا');
    expect(ics).toContain('\\,');
    expect(ics).toContain('\\;');
    expect(ics).toContain('\\n');
    expect(ics.endsWith('\r\n')).toBe(true);
  });
  it('folds Persian lines by UTF-8 bytes without corrupting characters', () => {
    const original = 'DESCRIPTION:' + 'بلندترین شب سال '.repeat(20);
    const folded = foldICS(original);
    expect(folded.replace(/\r\n /g, '')).toBe(original);
    for (const line of folded.split('\r\n'))
      expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(73);
  });
  it('encodes URLs and explicitly uses Toronto for Google', () => {
    const links = calendarLinks(event);
    expect(new URL(links.google).searchParams.get('text')).toBe(event.title);
    expect(new URL(links.google).searchParams.get('ctz')).toBe('America/Toronto');
    expect(new URL(links.outlook).searchParams.get('startdt')).toBe(event.startsAt);
  });
  it('validates HTTPS imagery and valid event time ranges', () => {
    expect(eventSchema.safeParse({ ...event, endsAt: event.startsAt }).success).toBe(false);
    expect(eventSchema.safeParse({ ...event, heroUrl: 'javascript:alert(1)' }).success).toBe(false);
  });
  it('bounds progress and protects spreadsheet exports', () => {
    expect(progress(30000, 120000)).toBe(25);
    expect(progress(150000, 120000)).toBe(100);
    expect(progress(-1, 120000)).toBe(0);
    expect(csvCell('=HYPERLINK("x")')).toBe('"\'=HYPERLINK(""x"")"');
    expect(csvCell('  +SUM(A1)')).toContain("'");
  });
});
describe('cryptographic primitives', () => {
  it('uses 256-bit random tokens and hash-only values', async () => {
    const a = randomToken(),
      b = randomToken();
    expect(a).toMatch(/^[a-f0-9]{64}$/);
    expect(a).not.toBe(b);
    expect(await hash(a)).not.toBe(a);
  });
  it('uses salted password hashing and constant-work comparisons', async () => {
    const a = await passwordHash('a long fictional password', 'salt-one');
    const b = await passwordHash('a long fictional password', 'salt-two');
    expect(a).not.toBe(b);
    expect(equal(a, a)).toBe(true);
    expect(equal(a, b)).toBe(false);
    expect(equal('abc', 'ab')).toBe(false);
  });
});
