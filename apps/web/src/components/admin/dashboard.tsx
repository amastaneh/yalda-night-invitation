'use client';
import { Check, Gift, Mail, RefreshCw, Users } from 'lucide-react';
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import {
  campaignSchema,
  money,
  number,
  progress,
  type Attendance,
} from '../../../../../packages/shared/src';
import { attendanceLabels } from '../rsvp';

import type { Overview } from './types';
export function Dashboard({ data }: { data: Overview }) {
  const count = (s: Attendance) => data.members.filter((g) => g.status === s).length;
  const responded = data.members.length - count('pending');
  const received = data.pledges.reduce((n, p) => n + p.received_cents, 0),
    promised = data.pledges.reduce((n, p) => n + p.amount_cents, 0);
  const stats = [
    ['خانواده‌های دعوت‌شده', number(data.households.length), Users],
    ['مهمان‌های دعوت‌شده', number(data.members.length), Mail],
    ['حضور تأییدشده', number(count('attending')), Check],
    ['منتظر پاسخ', number(count('pending')), RefreshCw],
    ['نمی‌توانند بیایند', number(count('declined')), Users],
    ['شاید می‌آیند', number(count('maybe')), Users],
    [
      'بزرگسال / کودک',
      `${number(data.members.filter((g) => g.kind === 'adult').length)} / ${number(data.members.filter((g) => g.kind === 'child').length)}`,
      Users,
    ],
    [
      'تکمیل پاسخ‌ها',
      `${number(data.members.length ? Math.round((responded / data.members.length) * 100) : 0)}٪`,
      Check,
    ],
    ['قول هدیه‌ها', money(promised), Gift],
    ['هدیه‌های دریافت‌شده', money(received), Gift],
    [
      'انارهای وعده‌داده‌شده',
      number(data.households.reduce((n, h) => n + h.pomegranates, 0)),
      HeartIcon,
    ],
    ['سهم‌های سفره', number(data.registry.reduce((n, i) => n + i.committed, 0)), Gift],
  ] as const;
  const chart = Object.entries(attendanceLabels).map(([key, label], i) => ({
    name: label,
    count: count(key as Attendance),
    color: ['#b8a5b1', '#28644b', '#b91c3c', '#bc8d37'][i],
  }));
  return (
    <>
      <div className="stats-grid">
        {stats.map(([label, value, Icon]) => (
          <article className="stat" key={label}>
            <span>
              {label}
              <Icon size={17} />
            </span>
            <strong>{value}</strong>
          </article>
        ))}
      </div>
      <div className="admin-grid">
        <section className="admin-panel">
          <h2>پاسخ‌ها، در یک نگاه</h2>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chart} margin={{ top: 20, right: 10, left: -25, bottom: 10 }}>
                <XAxis dataKey="name" tick={{ fontFamily: 'var(--font-vazir)', fontSize: 11 }} />
                <YAxis allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    fontFamily: 'var(--font-vazir)',
                    direction: 'rtl',
                    borderRadius: 8,
                  }}
                  formatter={(v) => [number(Number(v)), 'نفر']}
                />
                <Bar dataKey="count" radius={[5, 5, 0, 0]}>
                  {chart.map((v, i) => (
                    <Cell key={i} fill={v.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
        <section className="admin-panel">
          <h2>پیشرفت پویش‌ها</h2>
          {data.campaigns.map((c) => {
            const config = campaignSchema.parse(JSON.parse(c.config));
            const got = data.pledges
              .filter((p) => p.campaign_id === c.id)
              .reduce((n, p) => n + p.received_cents, 0);
            const pct = progress(got, config.targetCents);
            return (
              <div key={c.id} style={{ marginTop: '1.5rem' }}>
                <div className="progress-label">
                  <strong>{config.name}</strong>
                  <span>{number(pct)}٪</span>
                </div>
                <div className="progress-track">
                  <div style={{ width: `${pct}%`, background: '#28644b' }} />
                </div>
                <small className="muted">
                  {money(got)} از {money(config.targetCents)}
                </small>
              </div>
            );
          })}
        </section>
      </div>
      <section className="admin-panel">
        <h2>یادداشت‌های خصوصی مهمان‌ها</h2>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>خانواده</th>
                <th>ترجیح غذایی</th>
                <th>حساسیت</th>
                <th>پیام</th>
                <th>راه تماس</th>
              </tr>
            </thead>
            <tbody>
              {data.responses.map((r) => (
                <tr key={r.household_id}>
                  <td>{data.households.find((h) => h.id === r.household_id)?.name}</td>
                  <td>{r.dietary || '—'}</td>
                  <td>{r.allergies || '—'}</td>
                  <td style={{ whiteSpace: 'normal', minWidth: 160 }}>{r.message || '—'}</td>
                  <td>
                    <bdi>{r.contact || '—'}</bdi>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!data.responses.length && <p className="empty-state">هنوز پاسخی ثبت نشده است.</p>}
      </section>
      <section className="admin-panel">
        <h2>فعالیت‌های اخیر</h2>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>عملیات</th>
                <th>شناسهٔ منبع</th>
                <th>زمان تورنتو</th>
              </tr>
            </thead>
            <tbody>
              {data.audit.slice(0, 12).map((l, i) => (
                <tr key={i}>
                  <td lang="en" dir="ltr">
                    {l.action}
                  </td>
                  <td dir="ltr">{l.resource_id.slice(0, 8)}…</td>
                  <td>
                    {new Intl.DateTimeFormat('fa-IR', {
                      dateStyle: 'short',
                      timeStyle: 'short',
                      timeZone: 'America/Toronto',
                    }).format(new Date(l.created_at))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
const HeartIcon = Gift;
