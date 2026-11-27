'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import {
  ArrowDown,
  BookOpen,
  CalendarDays,
  Clock,
  MapPin,
  Snowflake,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { LivingPhoto } from './living-photo';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from './ui/dialog';
import { api, basePath, getSession, saveSession, download } from '@/lib/api';
import {
  dateLabel,
  timeLabel,
  calendarICS,
  calendarLinks,
  number,
} from '../../../../packages/shared/src/format';
import {
  fortunes,
  torontoDay,
  householdTitle,
  partyHosts,
  type DailyFortune,
} from '../../../../packages/shared/src/party';
import type { InvitationData } from '../../../../packages/shared/src';
const Rsvp = dynamic(() => import('./rsvp').then((m) => m.Rsvp));
const Gifts = dynamic(() => import('./gifts').then((m) => m.Gifts));

export function Invitation({ invitationSlug }: { invitationSlug?: string }) {
  const [data, setData] = useState<InvitationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [photoReady, setPhotoReady] = useState(false);
  const [error, setError] = useState('');
  const [fortune, setFortune] = useState<DailyFortune | null>(null);
  const [fortuneOpen, setFortuneOpen] = useState(false);
  const [drawing, setDrawing] = useState(false);
  const bootstrap = useRef<Promise<InvitationData | null> | null>(null);
  const reload = useCallback(async () => {
    const next = await api<InvitationData>('/invitation');
    setData(next);
    return next;
  }, []);
  useEffect(() => {
    let active = true;
    if (!bootstrap.current)
      bootstrap.current = (async () => {
        const url = new URL(window.location.href);
        const token = url.searchParams.get('token');
        const family = invitationSlug || url.searchParams.get('family');
        if (token || family) {
          if (token) {
            url.searchParams.delete('token');
            window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
          }
          sessionStorage.removeItem('yalda-guest');
          const auth = await api<{ session: string; invitation?: InvitationData }>(
            '/auth/invite',
            'guest',
            family ? { family } : { token },
          );
          saveSession('guest', auth.session);
          if (auth.invitation) return auth.invitation;
        }
        return getSession('guest') ? api<InvitationData>('/invitation') : null;
      })();
    void bootstrap.current
      .then((result) => {
        if (active) {
          setData(result);
          setFortune(result?.dailyFortune || null);
        }
      })
      .catch((err) => {
        if (active) setError((err as Error).message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [invitationSlug]);
  async function drawFortune() {
    setDrawing(true);
    try {
      const result = await api<DailyFortune>('/guest/fortune', 'guest', {});
      setFortune(result);
      setFortuneOpen(true);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setDrawing(false);
    }
  }
  const event = data?.event;
  const poem = fortune ? fortunes[fortune.index] : null;
  return (
    <main className="invitation light winter-page">
      {(loading || !photoReady) && (
        <div className="invitation-loading" role="status" aria-live="polite">
          <span className="loading-seal" aria-hidden="true">
            ✺
          </span>
          <span className="loading-orbit" aria-hidden="true" />
          <strong>
            {loading ? 'در حال باز کردن دعوت‌نامهٔ شما…' : 'در حال نمایش تصویر مهمانی…'}
          </strong>
          <small>چند لحظه همراه ما باشید.</small>
        </div>
      )}
      <div className="winter-atmosphere" aria-hidden="true">
        {Array.from({ length: 22 }, (_, i) => (
          <i
            key={i}
            style={{
              left: `${(i * 37) % 100}%`,
              animationDelay: `-${i * 2.3}s`,
              animationDuration: `${15 + (i % 9)}s`,
            }}
          />
        ))}
      </div>
      {invitationSlug === 'test' && (
        <div className="test-invitation-note" role="note">
          دعوت‌نامهٔ آزمایشی · انتخاب‌ها فقط در همین مرورگر ذخیره می‌شوند.
        </div>
      )}
      <a href="#main-content" className="skip-link">
        رفتن به محتوای اصلی
      </a>
      <header className="winter-header winter-width">
        <a className="wordmark" href={`${basePath}/`}>
          <span className="winter-seal" aria-hidden="true">
            ✺
          </span>{' '}
          یلدا{' '}
          <span className="winter-latin" lang="en">
            A WINTER GATHERING
          </span>
        </a>
        <nav aria-label="فهرست اصلی">
          {data && (
            <>
              <a href="#gifts">سفرهٔ یلدا</a>
              <a href="#hafez">فال امروز</a>
              <Button asChild size="sm" variant="outline">
                <a href="#rsvp">
                  دعوت شما <ArrowDown size={14} />
                </a>
              </Button>
            </>
          )}
          {!data && <Snowflake size={22} aria-hidden="true" />}
        </nav>
      </header>
      <section className="winter-hero winter-width" id="main-content">
        <div className="winter-hero-copy" id="invitation-intro">
          <span className="winter-eyebrow">
            <span /> YALDA · TORONTO · {new Date().getFullYear()} <span />
          </span>
          {data && (
            <p className="winter-greeting">
              {householdTitle(data.household.name, data.members.length)}، شما دعوتید.
            </p>
          )}
          <h1>
            بیرون، برف.
            <br /> اینجا، <em>یلدا.</em>
          </h1>
          <p className="winter-subtitle">انار و شیرینی و شعر؛ دور یک میز.</p>
          {event ? (
            <>
              <p className="winter-date">
                <CalendarDays size={17} />
                {dateLabel(event.startsAt)}
                <span>·</span>
                {timeLabel(event.startsAt)} <small>تورنتو</small>
              </p>
              <Button asChild className="winter-main-cta">
                <a href="#gifts">
                  برای سفره چی بیاریم؟ <ArrowDown size={17} />
                </a>
              </Button>
              <a href="#details" className="winter-detail-link">
                زمان و نشانی مهمانی
              </a>
            </>
          ) : (
            <div className="winter-gate" role="status">
              {loading
                ? 'در حال باز کردن دعوت‌نامه…'
                : error || 'با لینک اختصاصی خانواده وارد شوید.'}
            </div>
          )}
          <div className="winter-signature">
            <span aria-hidden="true">✧</span> یک دورهمیِ ایرانی <span className="winter-line" />
          </div>
        </div>
        <LivingPhoto onReady={() => setPhotoReady(true)} />
      </section>
      {data && event && (
        <>
          <section id="details" className="winter-details winter-width" aria-label="جزئیات مهمانی">
            <div>
              <CalendarDays size={21} />
              <span>
                <small>قرار ما</small>
                <strong>{dateLabel(event.startsAt)}</strong>
                <span>
                  {timeLabel(event.startsAt)} تا {timeLabel(event.endsAt)} · تورنتو
                </span>
              </span>
            </div>
            <div>
              <MapPin size={21} />
              <span>
                <small>نشانی</small>
                <strong>{event.venue || 'خانهٔ میزبان'}</strong>
                <span dir={event.venue.includes('Sloane') ? 'ltr' : undefined}>
                  {event.address}
                </span>
                {event.venue.includes('Sloane') && <small>{event.entrance}</small>}
              </span>
              {event.venue.includes('Sloane') && (
                <Image
                  className="venue-thumbnail"
                  src={`${basePath}/images/sloane-east-tower.webp`}
                  alt="نمای ساختمان Sloane، برج شرقی"
                  width={96}
                  height={76}
                />
              )}
            </div>
            <CalendarOptions data={data} />
            <details className="winter-more-details">
              <summary>مسیریابی و هماهنگی</summary>
              <p>{event.parking}</p>
              <p>{event.entrance}</p>
              <p>{event.dressCode}</p>
              <p>برای هماهنگی با {partyHosts}:</p>
              <div className="venue-phones">
                {event.contact
                  .split(' · ')
                  .filter(Boolean)
                  .map((phone) => (
                    <a key={phone} dir="ltr" href={`tel:${phone.replace(/[^+0-9]/g, '')}`}>
                      {phone}
                    </a>
                  ))}
              </div>
              <a
                className="text-link"
                href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(event.address)}`}
                target="_blank"
                rel="noreferrer"
              >
                مسیریابی
              </a>
            </details>
          </section>
          {event.features.gifts && <Gifts data={data} reload={reload} />}
          <section className="winter-bottom winter-width">
            <div id="rsvp" className="winter-rsvp">
              <span className="winter-eyebrow">
                01 / {data.members.length > 1 ? 'دعوت خانوادگی' : 'دعوت شما'}
              </span>
              <h2>{data.members.length > 1 ? 'همه با هم می‌آیید؟' : 'شما هم می‌آیید؟'}</h2>
              <p className="muted">اگر فرصت کردید، خبر بدهید.</p>
              <Rsvp data={data} onSaved={reload} />
            </div>
            {event.features.hafez && (
              <div id="hafez" className="winter-hafez">
                <span className="winter-eyebrow">02 / یک نیت، یک غزل</span>
                <div className={`fortune-book ${drawing ? 'book-opening' : ''}`} aria-hidden="true">
                  <div className="fortune-book-cover">
                    <span>✺</span>
                    <strong>
                      دیوان
                      <br />
                      حافظ
                    </strong>
                    <span>✧</span>
                  </div>
                  <span className="book-spark spark-one">✦</span>
                  <span className="book-spark spark-two">✧</span>
                </div>
                <h2>حافظ، برای امروز.</h2>
                <p className="muted">هر خانواده، هر روز یک فال.</p>
                <Button
                  variant="outline"
                  disabled={drawing || event.status !== 'open'}
                  onClick={drawFortune}
                >
                  <BookOpen size={17} />
                  {drawing
                    ? 'در حال گشودن دیوان…'
                    : fortune?.day === torontoDay()
                      ? 'دیدن فال امروز'
                      : 'نیت کردم'}
                </Button>
                {fortune?.day === torontoDay() && (
                  <small className="fortune-tomorrow">
                    <Clock size={13} />
                    برای فال بعدی، فردا سر بزنید.
                  </small>
                )}
              </div>
            )}
          </section>
          <footer className="winter-footer winter-width">
            <span>به میزبانی {partyHosts}</span>
            <span lang="en">A LITTLE SNOW. A LITTLE POETRY.</span>
            <a href={`${basePath}/`} onClick={() => sessionStorage.removeItem('yalda-guest')}>
              خروج از دعوت‌نامه
            </a>
          </footer>
        </>
      )}
      <Dialog open={fortuneOpen} onOpenChange={setFortuneOpen}>
        <DialogContent className="winter-fortune-dialog">
          <Sparkles className="fortune-star" size={28} />
          <DialogTitle>این فال امروز شماست</DialogTitle>
          <DialogDescription>
            برای فال بعدی، فردا سر بزنید. روز تازه به وقت تورنتو شروع می‌شود.
          </DialogDescription>
          {poem && (
            <>
              <blockquote className="fortune-poem">
                {poem.poem.split('\n').map((line) => (
                  <span key={line}>
                    {line}
                    <br />
                  </span>
                ))}
              </blockquote>
              <a
                className="text-link"
                href={`https://ganjoor.net/hafez/ghazal/sh${poem.ghazal}`}
                target="_blank"
                rel="noreferrer"
              >
                غزل {number(poem.ghazal)} · خواندن در گنجور
              </a>
            </>
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}
function CalendarOptions({ data }: { data: InvitationData }) {
  const links = calendarLinks(data.event);
  return (
    <details className="calendar-options">
      <summary className="button button-outline">
        <CalendarDays size={16} />
        ثبت در تقویم
      </summary>
      <div className="calendar-menu">
        <a href={links.google} target="_blank" rel="noreferrer">
          Google Calendar
        </a>
        <a href={links.outlook} target="_blank" rel="noreferrer">
          Outlook
        </a>
        <button
          onClick={() =>
            download(
              calendarICS(data.event, data.eventId),
              'text/calendar;charset=utf-8',
              'yalda.ics',
            )
          }
        >
          Apple Calendar / دریافت ICS
        </button>
      </div>
    </details>
  );
}
