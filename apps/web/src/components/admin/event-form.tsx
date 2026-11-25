'use client';
import { Check } from 'lucide-react';
import { useState } from 'react';
import { z } from 'zod';
import { eventSchema, type EventSettings } from '../../../../../packages/shared/src';
import { Button } from '../ui/button';

const featureLabels: Record<keyof EventSettings['features'], string> = {
  gifts: 'بخش هدیه‌های اختیاری',
  pomegranate: 'چالش انار و گلپر',
  feast: 'سفرهٔ مشارکتی',
  mystery: 'جعبهٔ راز یلدا',
  hafez: 'فال حافظ',
  guestbook: 'دفتر یادگاری و آرزوها',
  card: 'کارت تبریک',
};
export function defaultEvent(): EventSettings {
  const date = new Date(Date.now() + 30 * 86400000);
  date.setUTCHours(23, 0, 0, 0);
  return {
    title: 'شب یلدا، شبی برای باهم بودن',
    description: 'بهانه‌ای برای کنار هم بودن، خندیدن و ساختن خاطره‌های تازه.',
    startsAt: date.toISOString(),
    endsAt: new Date(date.getTime() + 5 * 3600000).toISOString(),
    deadline: new Date(date.getTime() - 3 * 86400000).toISOString(),
    venue: '',
    address: '',
    parking: '',
    entrance: '',
    dressCode: '',
    host: '',
    contact: '',
    heroUrl: '',
    status: 'closed',
    features: {
      gifts: true,
      pomegranate: true,
      feast: true,
      mystery: false,
      hafez: true,
      guestbook: true,
      card: true,
    },
    pomegranateMultiplier: 3,
    pomegranateMax: 30,
  };
}
function localTime(utc: string) {
  const p = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Toronto',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(utc));
  const get = (k: string) => p.find((v) => v.type === k)?.value;
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`;
}
function toUTC(local: string) {
  if (!local) throw new Error('زمان را کامل کنید.');
  const target = Date.parse(local + 'Z');
  let candidate = target;
  for (let i = 0; i < 3; i++) {
    const shown = localTime(new Date(candidate).toISOString());
    candidate += target - Date.parse(shown + 'Z');
  }
  const iso = new Date(candidate).toISOString();
  if (localTime(iso) !== local)
    throw new Error('این ساعت در تغییر ساعت تابستانی وجود ندارد. ساعت دیگری انتخاب کنید.');
  return iso;
}
export function EventForm({
  initial,
  onSave,
}: {
  initial: EventSettings;
  onSave: (e: EventSettings) => Promise<void>;
}) {
  const [value, setValue] = useState(initial);
  const [times, setTimes] = useState({
    startsAt: localTime(initial.startsAt),
    endsAt: localTime(initial.endsAt),
    deadline: localTime(initial.deadline),
  });
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const textFields: {
    key: keyof Pick<
      EventSettings,
      | 'title'
      | 'description'
      | 'venue'
      | 'address'
      | 'parking'
      | 'entrance'
      | 'dressCode'
      | 'host'
      | 'contact'
      | 'heroUrl'
    >;
    label: string;
    area?: boolean;
    full?: boolean;
  }[] = [
    { key: 'title', label: 'عنوان مهمانی', full: true },
    { key: 'description', label: 'متن دعوت', area: true, full: true },
    { key: 'venue', label: 'نام محل' },
    { key: 'address', label: 'نشانی کامل', full: true },
    { key: 'parking', label: 'راهنمای پارکینگ', area: true },
    { key: 'entrance', label: 'راهنمای ورود', area: true },
    { key: 'dressCode', label: 'پوشش پیشنهادی' },
    { key: 'host', label: 'نام میزبان' },
    { key: 'contact', label: 'راه تماس میزبان' },
    { key: 'heroUrl', label: 'آدرس HTTPS تصویر اصلی (خالی = تصویر پیش‌فرض)', full: true },
  ];
  return (
    <form
      className="admin-settings"
      onSubmit={async (e) => {
        e.preventDefault();
        setPending(true);
        setError('');
        try {
          const settings = eventSchema.parse({
            ...value,
            startsAt: toUTC(times.startsAt),
            endsAt: toUTC(times.endsAt),
            deadline: toUTC(times.deadline),
          });
          await onSave(settings);
        } catch (err) {
          setError(
            err instanceof z.ZodError
              ? 'فیلدها را بررسی کنید؛ پایان باید پس از شروع و مهلت پاسخ پیش از شروع باشد.'
              : (err as Error).message,
          );
        } finally {
          setPending(false);
        }
      }}
    >
      <section className="admin-panel">
        <h2>اطلاعات مهمانی</h2>
        <div className="admin-form-grid">
          {textFields.map(({ key, label, area, full }) => (
            <div className={`field ${full ? 'full' : ''}`} key={key}>
              <label htmlFor={`event-${key}`}>{label}</label>
              {area ? (
                <textarea
                  id={`event-${key}`}
                  value={value[key]}
                  onChange={(e) => setValue({ ...value, [key]: e.target.value })}
                  rows={3}
                  maxLength={1000}
                />
              ) : (
                <input
                  id={`event-${key}`}
                  value={value[key]}
                  onChange={(e) => setValue({ ...value, [key]: e.target.value })}
                  required={key === 'title'}
                  dir={key === 'heroUrl' ? 'ltr' : undefined}
                />
              )}
            </div>
          ))}
        </div>
      </section>
      <section className="admin-panel">
        <h2>زمان‌بندی · America/Toronto</h2>
        <p className="muted">ساعت‌ها به وقت تورنتو وارد و به UTC ذخیره می‌شوند.</p>
        <div className="admin-form-grid">
          {(
            [
              { key: 'startsAt', label: 'شروع مهمانی' },
              { key: 'endsAt', label: 'پایان مهمانی' },
              { key: 'deadline', label: 'مهلت پاسخ دعوت' },
            ] as const
          ).map(({ key, label }) => (
            <div className="field" key={key}>
              <label htmlFor={`time-${key}`}>{label}</label>
              <input
                id={`time-${key}`}
                type="datetime-local"
                required
                value={times[key]}
                onChange={(e) => setTimes({ ...times, [key]: e.target.value })}
                dir="ltr"
              />
            </div>
          ))}
          <div className="field">
            <label htmlFor="event-status">وضعیت رویداد</label>
            <select
              id="event-status"
              value={value.status}
              onChange={(e) =>
                setValue({ ...value, status: e.target.value as EventSettings['status'] })
              }
            >
              <option value="open">باز برای پاسخ و مشارکت</option>
              <option value="closed">بسته؛ فقط مشاهده</option>
              <option value="archived">بایگانی؛ دسترسی مهمان غیرفعال</option>
            </select>
          </div>
        </div>
      </section>
      <section className="admin-panel">
        <h2>تجربه‌های اختیاری</h2>
        <div className="feature-toggles">
          {Object.entries(featureLabels).map(([key, label]) => (
            <label className="toggle-row" key={key}>
              <input
                type="checkbox"
                checked={value.features[key as keyof typeof value.features]}
                onChange={(e) =>
                  setValue({ ...value, features: { ...value.features, [key]: e.target.checked } })
                }
              />
              {label}
            </label>
          ))}
        </div>
        <div className="admin-form-grid">
          <div className="field">
            <label htmlFor="multiplier">انار پیشنهادی برای هر مهمان</label>
            <input
              id="multiplier"
              type="number"
              min={0}
              max={20}
              value={value.pomegranateMultiplier}
              onChange={(e) =>
                setValue({ ...value, pomegranateMultiplier: Number(e.target.value) })
              }
            />
          </div>
          <div className="field">
            <label htmlFor="pomegranate-max">حداکثر انار هر خانواده</label>
            <input
              id="pomegranate-max"
              type="number"
              min={0}
              max={500}
              value={value.pomegranateMax}
              onChange={(e) => setValue({ ...value, pomegranateMax: Number(e.target.value) })}
            />
          </div>
        </div>
      </section>
      {error && (
        <p className="error-text" role="alert">
          {error}
        </p>
      )}
      <div className="settings-save" style={{ marginTop: '1rem' }}>
        <Button type="submit" disabled={pending}>
          <Check size={17} />
          {pending ? 'در حال ذخیره…' : 'ذخیرهٔ تنظیمات'}
        </Button>
        <small className="muted">اطلاعات خصوصی فقط از API دریافت می‌شوند.</small>
      </div>
    </form>
  );
}
