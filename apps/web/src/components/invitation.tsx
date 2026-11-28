'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import venueLinks from '../../../../config/venue-links.json';
import {
  ArrowDown,
  ArrowUpLeft,
  Building2,
  BookOpen,
  CalendarDays,
  Clock,
  MapPin,
  Phone,
  Snowflake,
  Sparkles,
  SquareParking,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { LivingPhoto } from './living-photo';
import { PartyMusic } from './party-music';
import { FortuneBook } from './fortune-book';
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
    setFortuneOpen(true);
    try {
      const revealDuration = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 150
        : 1700;
      const [result] = await Promise.all([
        fortune?.day === torontoDay()
          ? Promise.resolve(fortune)
          : api<DailyFortune>('/guest/fortune', 'guest', {}),
        new Promise<void>((resolve) => window.setTimeout(resolve, revealDuration)),
      ]);
      setFortune(result);
    } catch (err) {
      setFortuneOpen(false);
      toast.error((err as Error).message);
    } finally {
      setDrawing(false);
    }
  }
  const event = data?.event;
  const contacts = (event?.contact || '')
    .split('·')
    .map((phone) => phone.trim())
    .filter(Boolean)
    .map((phone, i) => ({
      phone: phone.replace(/[^+0-9]/g, ''),
      name: event?.host.split(' و ')[i] || 'میزبان',
    }));
  const poem = fortune ? fortunes[fortune.index] : null;
  return (
    <main className="invitation light winter-page">
      {!loading && photoReady && <PartyMusic />}
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
      <a href="#main-content" className="skip-link">
        رفتن به محتوای اصلی
      </a>
      <header className="winter-header winter-width">
        <a className="wordmark" href={`${basePath}/`}>
          <span className="winter-seal" aria-hidden="true">
            ✺
          </span>{' '}
          دورهمی یلدا{' '}
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
            <Button asChild className="winter-main-cta">
              <a href="#gifts">
                برای سفره چی بیاریم؟ <ArrowDown size={17} />
              </a>
            </Button>
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
            <div className="venue-time-card">
              <CalendarDays size={21} />
              <span className="venue-time-copy">
                <small>قرار ما</small>
                <strong>{dateLabel(event.startsAt)}</strong>
                <span>
                  {timeLabel(event.startsAt)} تا {timeLabel(event.endsAt)} · تورنتو
                </span>
              </span>
              <CalendarOptions data={data} />
            </div>
            <div className="venue-location-card">
              <div className="venue-location-copy">
                <span className="venue-address">
                  <small>
                    <MapPin size={16} /> محل دورهمی
                  </small>
                  <strong dir={event.venue.includes('Sloane') ? 'ltr' : undefined}>
                    {event.venue || 'خانهٔ میزبان'}
                  </strong>
                  <span dir={event.venue.includes('Sloane') ? 'ltr' : undefined}>
                    {event.address}
                  </span>
                  {event.venue.includes('Sloane') && <small>{event.entrance}</small>}
                </span>
                <nav className="venue-route-links" aria-label="مسیریابی مهمانی">
                  <a
                    className="venue-map-button venue-action"
                    aria-label="موقعیت ساختمان"
                    href={
                      event.venue.includes('Sloane')
                        ? venueLinks.building
                        : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(event.address)}`
                    }
                    target="_blank"
                    rel="noreferrer"
                  >
                    <span className="venue-route-icon" aria-hidden="true">
                      <Building2 size={22} strokeWidth={1.6} />
                    </span>
                    <span className="venue-route-label">
                      <strong>ساختمان</strong>
                      <small>برج شرقی</small>
                    </span>
                    <ArrowUpLeft className="venue-route-arrow" size={17} aria-hidden="true" />
                  </a>
                  {event.venue.includes('Sloane') && (
                    <a
                      className="venue-parking-button venue-action"
                      aria-label="مسیریابی پارکینگ برج شرقی و غربی"
                      href={venueLinks.parking}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <span className="venue-route-icon" aria-hidden="true">
                        <SquareParking size={22} strokeWidth={1.6} />
                      </span>
                      <span className="venue-route-label">
                        <strong>پارکینگ</strong>
                        <small>برج شرقی و غربی</small>
                      </span>
                      <ArrowUpLeft className="venue-route-arrow" size={17} aria-hidden="true" />
                    </a>
                  )}
                </nav>
              </div>
              {event.venue.includes('Sloane') && (
                <div className="venue-photo">
                  <Image
                    src={`${basePath}/images/sloane-east-tower.webp`}
                    alt="ورودی و نمای ساختمان اسلون، برج شرقی"
                    width={480}
                    height={360}
                    sizes="(max-width: 640px) 100vw, 240px"
                  />
                  <span>اینجا منتظرتونیم</span>
                </div>
              )}
              {contacts.length > 0 && (
                <section className="venue-contact-block" aria-label="هماهنگی ورود و پارکینگ">
                  <div className="venue-contact-intro">
                    <h3>هماهنگی ورود و پارکینگ</h3>
                    <p>
                      برای ورود یا پارکینگ، با یکی از ما هماهنگ کنید؛ مشخصات خودرو را هم در پاسخ
                      دعوت بنویسید.
                    </p>
                  </div>
                  <div className="venue-contact-links">
                    {contacts.map(({ name, phone }) => (
                      <a
                        key={phone}
                        className="venue-action"
                        href={`tel:${phone.length === 10 ? '+1' : ''}${phone}`}
                        aria-label={`تماس با ${name}`}
                      >
                        <span className="venue-contact-name">
                          <small>تماس با</small>
                          <strong>{name}</strong>
                        </span>
                        <span className="venue-contact-phone-icon" aria-hidden="true">
                          <Phone size={17} strokeWidth={1.7} />
                        </span>
                        <span className="venue-contact-number" dir="ltr">
                          {phone.replace(/^(\d{3})(\d{3})(\d{4})$/, '$1 $2 $3')}
                        </span>
                      </a>
                    ))}
                  </div>
                </section>
              )}
            </div>
          </section>
          {event.features.gifts && <Gifts data={data} reload={reload} />}
          <section className="winter-bottom winter-width">
            <div id="rsvp" className="winter-rsvp">
              <span className="winter-eyebrow">
                01 / {data.members.length > 1 ? 'دعوت خانوادگی' : 'دعوت شما'}
              </span>
              <h2>{data.members.length > 1 ? 'لطفاً همه با هم بیایید' : 'لطفاً شما هم بیایید'}</h2>
              <p className="muted">لطفاً دکمهٔ ثبت را بزنید.</p>
              <Rsvp data={data} onSaved={reload} />
            </div>
            {event.features.hafez && (
              <div id="hafez" className="winter-hafez">
                <span className="winter-eyebrow">02 / یک نیت، یک غزل</span>
                <FortuneBook opening={drawing} />
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
        <DialogContent
          className={`winter-fortune-dialog fortune-ceremony ${drawing ? 'is-unveiling' : 'is-revealed'}`}
        >
          <div className="fortune-reveal-stage" aria-hidden="true">
            <div className="fortune-golden-halo" />
            <div className="fortune-orbit-dust">
              {Array.from({ length: 12 }, (_, i) => (
                <i
                  key={i}
                  style={{
                    left: `${12 + ((i * 23) % 77)}%`,
                    top: `${12 + ((i * 31) % 76)}%`,
                    animationDelay: `${i * -0.17}s`,
                  }}
                />
              ))}
            </div>
            <FortuneBook opening={drawing} />
            <Sparkles className="fortune-star" size={24} />
          </div>
          <DialogTitle>{drawing ? 'یک نیت، یک غزل…' : 'این فال امروز شماست'}</DialogTitle>
          <DialogDescription>
            {drawing
              ? 'چند لحظه، فقط به نیتتان فکر کنید.'
              : 'برای فال بعدی، فردا سر بزنید. روز تازه به وقت تورنتو شروع می‌شود.'}
          </DialogDescription>
          {drawing && (
            <p className="fortune-reveal-status" role="status">
              در حال گشودن دیوان<span aria-hidden="true"> ✦</span>
            </p>
          )}
          {!drawing && poem && (
            <div className="fortune-revealed-poem">
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
            </div>
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
      <summary className="button button-outline venue-action">
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
