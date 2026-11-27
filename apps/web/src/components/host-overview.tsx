'use client';
import { useCallback, useEffect, useState } from 'react';
import { Check, Copy, ExternalLink, RefreshCw, Search } from 'lucide-react';
import { requestApi } from '@/lib/transport';
import { giftOptions } from '../../../../packages/shared/src/party';
import type { Attendance, Vehicle } from '../../../../packages/shared/src';

type Family = {
  slug: string;
  name: string;
  members: { name: string; status: Attendance }[];
  gifts: string[];
  vehicle?: Vehicle | null;
};
type Guest = { slug: string; name: string; members: string[] };
const labels: Record<Attendance, string> = {
  pending: 'بی‌پاسخ',
  attending: 'می‌آید',
  declined: 'نمی‌آید',
  maybe: 'شاید',
};
export function HostOverview({
  accessKey,
  guests,
  siteUrl,
}: {
  accessKey: string;
  guests: Guest[];
  siteUrl: string;
}) {
  const [families, setFamilies] = useState<Family[]>(
    guests.map((f) => ({
      ...f,
      gifts: [],
      members: f.members.map((name) => ({ name, status: 'pending' })),
    })),
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);
  const [query, setQuery] = useState('');
  const [onlyVehicles, setOnlyVehicles] = useState(false);
  const [copied, setCopied] = useState('');
  const reload = useCallback(() => {
    return requestApi<{ families: Family[]; writable: boolean }>(
      '/api/party',
      '/host/overview',
      null,
      { key: accessKey },
    )
      .then((result) => {
        setFamilies(result.families);
        setReady(result.writable);
      })
      .catch((e) => {
        setError((e as Error).message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [accessKey]);
  useEffect(() => {
    void reload();
  }, [reload]);
  async function copy(value: string, id: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(id);
      setTimeout(() => setCopied(''), 1800);
    } catch {
      setError('کپی خودکار ممکن نشد؛ لینک را انتخاب و کپی کنید.');
    }
  }
  const url = (slug: string) => `${siteUrl}/invite/${slug}`;
  const total = families.flatMap((f) => f.members);
  return (
    <main className="host-page">
      <header className="host-heading">
        <div>
          <span className="winter-eyebrow">YALDA · HOST</span>
          <h1>مهمان‌های شب یلدا</h1>
          <p>حضور، انتخاب‌ها و لینک دعوت؛ همه در یک نگاه.</p>
        </div>
        <button
          className="host-button"
          onClick={() => {
            setLoading(true);
            setError('');
            void reload();
          }}
          disabled={loading}
        >
          <RefreshCw size={17} className={loading ? 'host-spinning' : ''} />
          {loading ? 'در حال دریافت…' : 'تازه‌سازی'}
        </button>
      </header>
      {error && (
        <p className="host-notice" role="alert">
          {error}
        </p>
      )}
      {!loading && !error && !ready && (
        <p className="host-notice" role="status">
          فهرست آماده است. ثبت پاسخ‌ها پس از تنظیم GITHUB_TOKEN در Vercel فعال می‌شود.
        </p>
      )}
      <section className="host-stats" aria-label="خلاصهٔ حضور">
        <div>
          <strong>{families.length.toLocaleString('fa')}</strong>
          <span>دعوت خانوادگی</span>
        </div>
        <div>
          <strong>{total.length.toLocaleString('fa')}</strong>
          <span>مهمان</span>
        </div>
        <div>
          <strong>
            {total.filter((m) => m.status === 'attending').length.toLocaleString('fa')}
          </strong>
          <span>می‌آیند</span>
        </div>
        <div>
          <strong>{total.filter((m) => m.status === 'pending').length.toLocaleString('fa')}</strong>
          <span>هنوز پاسخ نداده‌اند</span>
        </div>
      </section>
      <section className="host-gifts" aria-label="خلاصهٔ هدیه‌ها">
        {giftOptions.map((o) => (
          <div key={o.id}>
            <span>{o.title}</span>
            <strong>
              {families.filter((f) => f.gifts.includes(o.id)).length.toLocaleString('fa')} /{' '}
              {o.capacity.toLocaleString('fa')}
            </strong>
          </div>
        ))}
      </section>
      <div className="host-tools">
        <label className="host-search">
          <Search size={18} />
          <input
            aria-label="جست‌وجوی مهمان"
            placeholder="نام، شمارهٔ دعوت یا پلاک…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <button
          className="host-button"
          aria-pressed={onlyVehicles}
          onClick={() => setOnlyVehicles((value) => !value)}
        >
          خودروها ({families.filter((f) => f.vehicle).length.toLocaleString('fa')})
        </button>
        <button
          className="host-button"
          onClick={() =>
            void copy(families.map((f) => `${f.name}\n${url(f.slug)}`).join('\n\n'), 'all')
          }
        >
          {copied === 'all' ? <Check size={16} /> : <Copy size={16} />}کپی همهٔ لینک‌ها
        </button>
        <a className="host-button" href="/invite/test" target="_blank" rel="noreferrer">
          دعوت تست امیر و Faye <ExternalLink size={15} />
        </a>
      </div>
      <div className="host-families">
        {families
          .filter(
            (f) =>
              (!onlyVehicles || f.vehicle) &&
              `${f.name} ${f.slug} ${f.members.map((m) => m.name).join(' ')} ${f.vehicle?.plate || ''} ${f.vehicle?.brand || ''} ${f.vehicle?.model || ''}`.includes(
                query.trim(),
              ),
          )
          .map((f) => (
            <article className="host-family" key={f.slug}>
              <div className="host-family-title">
                <h2>{f.name}</h2>
                <span dir="ltr">{f.slug}</span>
              </div>
              <div className="host-members">
                {f.members.map((m, i) => (
                  <span key={i} data-status={m.status}>
                    {m.name}
                    <small>{labels[m.status]}</small>
                  </span>
                ))}
              </div>
              <p className="host-family-gifts">
                {f.gifts.length
                  ? f.gifts.map((id) => giftOptions.find((o) => o.id === id)?.title).join(' · ')
                  : 'هنوز چیزی انتخاب نکرده‌اند'}
              </p>
              {f.vehicle && (
                <div className="host-vehicle">
                  <strong>خودرو برای پارکینگ</strong>
                  <span>
                    {f.vehicle.brand} · {f.vehicle.model} · {f.vehicle.color}
                  </span>
                  <b dir="ltr">{f.vehicle.plate}</b>
                </div>
              )}
              <div className="host-family-link">
                <a dir="ltr" href={url(f.slug)} target="_blank" rel="noreferrer">
                  /invite/{f.slug}
                </a>
                <button
                  aria-label={`کپی لینک ${f.name}`}
                  onClick={() => void copy(url(f.slug), f.slug)}
                >
                  {copied === f.slug ? <Check size={17} /> : <Copy size={17} />}
                  {copied === f.slug ? 'کپی شد' : 'کپی لینک'}
                </button>
              </div>
            </article>
          ))}
      </div>
      <footer>به میزبانی امیر و فی · این صفحه فقط برای مشاهده است.</footer>
    </main>
  );
}
