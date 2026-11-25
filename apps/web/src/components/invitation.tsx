'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import Image from 'next/image';
import * as motion from 'motion/react-m';
import dynamic from 'next/dynamic';
import {
  CalendarDays,
  MapPin,
  Clock,
  Car,
  DoorOpen,
  Shirt,
  Heart,
  Sun,
  Moon,
  BookOpen,
  Share2,
  Download,
  Flame,
  RefreshCw,
  Mail,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from './ui/dialog';
import { Pomegranate } from './pomegranate';
const Rsvp = dynamic(() => import('./rsvp').then((m) => m.Rsvp));
const Gifts = dynamic(() => import('./gifts').then((m) => m.Gifts));
import { api, basePath, saveSession, getSession, download } from '@/lib/api';
import {
  dateLabel,
  timeLabel,
  number,
  calendarICS,
  calendarLinks,
} from '../../../../packages/shared/src/format';
import type { InvitationData } from '../../../../packages/shared/src';

function Countdown({ date }: { date: string }) {
  const [remaining, setRemaining] = useState<number | null>(null);
  useEffect(() => {
    const update = () => setRemaining(Math.max(0, Date.parse(date) - Date.now()));
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [date]);
  if (remaining === null) return <div className="countdown-placeholder" />;
  const parts = [
    Math.floor(remaining / 86400000),
    Math.floor(remaining / 3600000) % 24,
    Math.floor(remaining / 60000) % 60,
    Math.floor(remaining / 1000) % 60,
  ];
  return (
    <div className="countdown" aria-label="شمارش معکوس تا شروع مهمانی">
      {parts.map((n, i) => (
        <div key={i}>
          <span>{number(n).padStart(2, '۰')}</span>
          <small>{['روز', 'ساعت', 'دقیقه', 'ثانیه'][i]}</small>
        </div>
      ))}
    </div>
  );
}
export function Invitation() {
  const [data, setData] = useState<InvitationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [light, setLight] = useState(false);
  const [fortune, setFortune] = useState(false);
  const [card, setCard] = useState(false);
  const [wish, setWish] = useState('');
  const [sendingWish, setSendingWish] = useState(false);
  const reload = useCallback(async () => {
    const result = await api<InvitationData>('/invitation');
    setData(result);
    return result;
  }, []);
  const bootstrap = useRef<Promise<InvitationData | null> | null>(null);
  useEffect(() => {
    let active = true;
    if (!bootstrap.current) {
      bootstrap.current = (async () => {
        const url = new URL(window.location.href);
        const token = url.searchParams.get('token');
        if (token) {
          window.history.replaceState({}, '', `${url.pathname}${url.hash}`);
          sessionStorage.removeItem('yalda-guest');
          const auth = await api<{ session: string }>('/auth/invite', 'guest', { token });
          saveSession('guest', auth.session);
        }
        return getSession('guest') ? api<InvitationData>('/invitation') : null;
      })();
    }
    void bootstrap.current
      .then((result) => {
        if (active) setData(result);
      })
      .catch((e) => {
        if (active) setError((e as Error).message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);
  async function share() {
    try {
      const shareData = {
        title: 'شب یلدا',
        text: `${data?.household.name || 'دوست'} عزیز، بلندترین شب، کنار هم. یلدایتان پر از مهر و روشنایی.`,
      };
      if (navigator.share) await navigator.share(shareData);
      else {
        await navigator.clipboard.writeText(shareData.text);
        toast.success('پیام یلدا کپی شد.');
      }
    } catch {
      /* cancelled share */
    }
  }
  const event = data?.event;
  return (
    <main className={`invitation ${light ? 'light' : ''}`}>
      <a href="#main-content" className="skip-link">
        رفتن به محتوای اصلی
      </a>
      <header className="site-header">
        <a className="wordmark" href={`${basePath}/`}>
          <span className="brand-fruit" aria-hidden="true">
            ✦
          </span>{' '}
          یلدا
          <span className="wordmark-latin" lang="en">
            YALDA TOGETHER
          </span>
        </a>
        <nav aria-label="فهرست اصلی">
          {data && (
            <>
              <a href="#details">قرار ما</a>
              <a href="#rsvp">پاسخ دعوت</a>
              {event?.features.gifts && <a href="#gifts">بهانه‌های شادی</a>}
            </>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLight(!light)}
            aria-label={light ? 'پوستهٔ تیره' : 'پوستهٔ روشن'}
          >
            {light ? <Moon size={19} /> : <Sun size={19} />}
          </Button>
          {data && (
            <Button asChild size="sm">
              <a href="#rsvp">
                منتظرتونیم <Heart size={15} />
              </a>
            </Button>
          )}
        </nav>
      </header>
      <section className="hero" id="main-content">
        <div className="hero-photo">
          <Image
            src={event?.heroUrl || `${basePath}/images/yalda-hero.webp`}
            alt="انارهای سرخ، شمع روشن و کتاب شعر بر سفرهٔ شب یلدا"
            fill
            priority
            sizes="100vw"
            style={{ objectFit: 'cover' }}
            unoptimized
          />
        </div>
        <div className="hero-shade" />
        <motion.div
          className="hero-content"
          initial={false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0 }}
        >
          <div className="eyebrow">
            <span /> THE LONGEST NIGHT, TOGETHER <span />
          </div>
          {data && <p className="personal-greeting">{data.household.name} عزیز، شما دعوتید</p>}
          <h1>
            بلندترین شب سال،
            <br />
            کنار <em>عزیزترین</em> آدم‌ها
          </h1>
          <p className="hero-description">
            {event?.description || 'بهانه‌ای برای کنار هم بودن، خندیدن و ساختن خاطره‌های تازه.'}
          </p>
          {event ? (
            <>
              <div className="hero-date">
                <CalendarDays size={17} />
                {dateLabel(event.startsAt)}
                <span className="dot-divider">·</span> تورنتو
              </div>
              <Button asChild className="hero-cta">
                <a href="#rsvp">
                  من هم کنار شمایم <Heart size={18} />
                </a>
              </Button>
              <Countdown date={event.startsAt} />
            </>
          ) : (
            <div className="invitation-gate" role="status">
              {loading ? (
                <>
                  <span className="spinner" /> در حال باز کردن دعوت‌نامه…
                </>
              ) : error ? (
                <>
                  <p>{error}</p>
                  <Button variant="outline" onClick={() => window.location.reload()}>
                    <RefreshCw size={16} />
                    تلاش دوباره
                  </Button>
                </>
              ) : (
                <>
                  <p>یک شب، هزار خاطره، جای شما خالی.</p>
                  <small>برای دیدن جزئیات و پاسخ به دعوت، لینک اختصاصی میزبان را باز کنید.</small>
                </>
              )}
            </div>
          )}
        </motion.div>
        <div className="hero-bottom">
          <span>یک شب به بلندای دوستی</span>
          <span lang="en">A LITTLE LONGER. A LITTLE CLOSER.</span>
        </div>
      </section>
      {data && event && (
        <>
          <section className="intro section-wrap">
            <div className="section-kicker">
              <Flame size={16} /> یک شب گرم در دل زمستان
            </div>
            <h2>
              بعضی شب‌ها،
              <br />
              <span className="muted">دلمان می‌خواهد تمام نشوند.</span>
            </h2>
            <p>
              {data.household.greeting ||
                'بیایید بلندترین شب سال را با قصه، خنده و طعم شیرین انار کوتاه کنیم. منتظر دیدارتان هستیم.'}
            </p>
          </section>
          <section id="details" className="details-section section-wrap">
            <div className="section-heading">
              <div>
                <span className="section-kicker">قرارِ باهم بودن</span>
                <h2>زمان و جای دیدار</h2>
              </div>
              <p className="muted">همه‌چیز برای یک شب خاطره‌انگیز</p>
            </div>
            <div className="details-grid">
              <article className="date-panel">
                <CalendarDays size={26} />
                <p className="overline">{event.title}</p>
                <h3>{dateLabel(event.startsAt)}</h3>
                <p className="muted gregorian" lang="en" dir="ltr">
                  {new Intl.DateTimeFormat('en-CA', {
                    dateStyle: 'full',
                    timeZone: 'America/Toronto',
                  }).format(new Date(event.startsAt))}
                </p>
                <p className="time-line">
                  <Clock size={18} /> از {timeLabel(event.startsAt)} تا {timeLabel(event.endsAt)}{' '}
                  <small>به وقت تورنتو</small>
                </p>
                <CalendarOptions data={data} />
              </article>
              <article className="venue-panel">
                <MapPin size={26} />
                <p className="overline">جایی که منتظرتانیم</p>
                <h3>{event.venue || 'جزئیات به‌زودی'}</h3>
                <p>{event.address}</p>
                <div className="map-links">
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(event.address)}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Google Maps
                  </a>
                  <a
                    href={`https://maps.apple.com/?daddr=${encodeURIComponent(event.address)}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Apple Maps
                  </a>
                </div>
              </article>
            </div>
            <div className="practical-details">
              {[
                { Icon: Car, title: 'پارکینگ', text: event.parking },
                { Icon: DoorOpen, title: 'راهنمای ورود', text: event.entrance },
                { Icon: Shirt, title: 'حال‌وهوای لباس', text: event.dressCode },
              ]
                .filter((i) => i.text)
                .map(({ Icon, title, text }) => (
                  <article key={title}>
                    <Icon size={22} />
                    <div>
                      <h4>{title}</h4>
                      <p>{text}</p>
                    </div>
                  </article>
                ))}
            </div>
            <p className="host-line">
              <Heart size={16} /> به میزبانی {event.host}
              <span>·</span>
              <bdi>{event.contact}</bdi>
            </p>
          </section>
          <section id="rsvp" className="rsvp-section">
            <div className="section-wrap rsvp-grid">
              <div className="rsvp-intro">
                <span className="section-kicker">جای شما را نگه داشته‌ایم</span>
                <h2>
                  شما هم
                  <br />
                  کنار مایید؟
                </h2>
                <p className="muted">
                  فقط چند لحظه تا یک قرار شیرین.
                  <br />
                  برای هر نفر جداگانه پاسخ بدهید، یا همه را با هم تأیید کنید.
                </p>
                <div className="deadline">
                  <Clock size={17} />
                  <span>مهلت پاسخ: {dateLabel(event.deadline)}</span>
                </div>
                <div className="collective">
                  <Pomegranate count={data.attending} />
                  <div>
                    <strong>
                      {number(data.attending)} دانه، {number(data.attending)} لبخند
                    </strong>
                    <p className="muted">هر مهمان، یک دانه از انار دورهمی ما.</p>
                  </div>
                </div>
              </div>
              <Rsvp data={data} onSaved={reload} />
            </div>
          </section>
          {event.features.gifts && <Gifts data={data} reload={reload} />}
          {(event.features.hafez || event.features.guestbook || event.features.card) && (
            <section className="culture section-wrap">
              <div className="section-heading">
                <div>
                  <span className="section-kicker">رسم‌های کوچک، خاطره‌های ماندگار</span>
                  <h2>کمی شعر، کمی آرزو</h2>
                </div>
                <BookOpen size={32} />
              </div>
              <div className="culture-grid">
                {event.features.hafez && (
                  <article className="hafez-panel">
                    <BookOpen size={26} />
                    <p className="overline">به نیت یک شب روشن</p>
                    <h3>فالی از حافظ</h3>
                    <p className="muted">
                      لحظه‌ای مکث کن، نیت کن و<br />
                      دلت را به یک بیت بسپار.
                    </p>
                    <Button variant="outline" onClick={() => setFortune(true)}>
                      نیت کردم
                    </Button>
                  </article>
                )}
                {event.features.guestbook && (
                  <article className="guestbook-panel">
                    <span className="section-kicker">
                      <Mail size={17} /> آرزویی برای بلندترین شب
                    </span>
                    <h3>یک یادگاری از شما</h3>
                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        setSendingWish(true);
                        try {
                          await api('/guest/guestbook', 'guest', { message: wish });
                          toast.success('یادگاری شما برای تأیید میزبان فرستاده شد.');
                          setWish('');
                        } catch (err) {
                          toast.error((err as Error).message);
                        } finally {
                          setSendingWish(false);
                        }
                      }}
                    >
                      <label htmlFor="wish" className="sr-only">
                        آرزوی شما
                      </label>
                      <textarea
                        id="wish"
                        placeholder="امیدوارم امشب…"
                        value={wish}
                        onChange={(e) => setWish(e.target.value)}
                        required
                        maxLength={500}
                        rows={3}
                      />
                      <div className="form-footer">
                        <small className="muted">
                          پس از تأیید میزبان، بدون نام نمایش داده می‌شود.
                        </small>
                        <Button type="submit" size="sm" disabled={sendingWish}>
                          ثبت یادگاری
                        </Button>
                      </div>
                    </form>
                    {data.guestbook.slice(0, 3).map((g) => (
                      <blockquote key={g.id}>{g.message}</blockquote>
                    ))}
                  </article>
                )}
              </div>
              {event.features.card && (
                <div className="share-strip">
                  <div>
                    <h3>حال خوب یلدا، برای عزیزانتان</h3>
                    <p className="muted">یک کارت کوچک، برای یک آرزوی بزرگ.</p>
                  </div>
                  <Button variant="outline" onClick={() => setCard(true)}>
                    <Share2 size={17} />
                    کارت تبریک یلدا
                  </Button>
                </div>
              )}
            </section>
          )}
          <section className="closing section-wrap">
            <Heart size={28} />
            <h2>بهترین هدیه، حضور شماست.</h2>
            <p>
              هر طور که بیایید، با دست خالی یا پر از انار،
              <br />
              همین که کنار هم باشیم، یلداست.
            </p>
            <Button asChild variant="outline">
              <a href="#rsvp">برگشت به پاسخ دعوت</a>
            </Button>
          </section>
          <footer className="site-footer">
            <span className="wordmark">یلدا</span>
            <p>با عشق، برای بلندترین شب سال</p>
            <span lang="en">TORONTO · TOGETHER</span>
            <Button
              size="sm"
              variant="ghost"
              onClick={async () => {
                await api('/auth/logout', 'guest', {});
                sessionStorage.removeItem('yalda-guest');
                setData(null);
              }}
            >
              خروج از دعوت‌نامه
            </Button>
          </footer>
        </>
      )}
      <Dialog open={fortune} onOpenChange={setFortune}>
        <DialogContent>
          <DialogTitle className="art-title">به نیت روشنایی</DialogTitle>
          <DialogDescription>حافظ، غزل ۲۳۲</DialogDescription>
          <blockquote className="fortune-poem">
            بر سر آنم که گر ز دست برآید
            <br />
            دست به کاری زنم که غصه سر آید
          </blockquote>
          <a
            className="text-link"
            href="https://ganjoor.net/hafez/ghazal/sh232"
            target="_blank"
            rel="noreferrer"
          >
            خواندن غزل در گنجور
          </a>
        </DialogContent>
      </Dialog>
      <Dialog open={card} onOpenChange={setCard}>
        <DialogContent>
          <DialogTitle className="art-title">یلدایتان پر از روشنایی</DialogTitle>
          <DialogDescription>یک آرزوی ساده برای عزیزان شما</DialogDescription>
          <div className="greeting-card">
            <p>{data?.household.name} عزیز</p>
            <Pomegranate count={45} />
            <h3>
              شب‌تان بلند،
              <br />
              دل‌تان روشن.
            </h3>
            <p>یلدا مبارک</p>
          </div>
          <Button onClick={share}>
            <Share2 size={17} /> اشتراک پیام تبریک
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              const recipient = (data?.household.name || 'دوست عزیز').replace(
                /[&<>"']/g,
                (c) =>
                  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c]!,
              );
              const text = 'یلدایتان پر از مهر و روشنایی';
              const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080"><rect width="1080" height="1080" fill="#561329"/><circle cx="540" cy="340" r="130" fill="#b91c3c"/><text x="540" y="650" text-anchor="middle" fill="#fff5e6" font-size="48" font-family="serif" direction="rtl">${text}</text><text x="540" y="760" text-anchor="middle" fill="#d4af70" font-size="30">YALDA TOGETHER</text></svg>`;
              download(
                svg.replace(
                  '</svg>',
                  `<text x="540" y="850" text-anchor="middle" fill="#d4af70" font-size="30" font-family="serif" direction="rtl">${recipient} عزیز</text></svg>`,
                ),
                'image/svg+xml',
                'yalda-card.svg',
              );
            }}
          >
            <Download size={16} />
            دریافت کارت
          </Button>
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
        به تقویمم اضافه کن
      </summary>
      <div className="calendar-menu">
        <a target="_blank" rel="noreferrer" href={links.google}>
          Google Calendar
        </a>
        <a target="_blank" rel="noreferrer" href={links.outlook}>
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
