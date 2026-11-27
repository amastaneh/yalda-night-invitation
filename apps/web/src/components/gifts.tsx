'use client';
import { Fragment, useEffect, useRef, useState, type CSSProperties } from 'react';
import Image from 'next/image';
import * as motion from 'motion/react-m';
import { Check, Plus, ArrowUpLeft, Gift, X, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { api, basePath } from '@/lib/api';
import { number, type InvitationData } from '../../../../packages/shared/src';
import {
  birthdayGift,
  giftOptions,
  giftDetailOptions,
  giftDetailLabel,
  type GiftDetails,
  type GiftKind,
} from '../../../../packages/shared/src/party';
import { Button } from './ui/button';
import { PomegranateBowl } from './pomegranate-bowl';

export function Gifts({
  data,
  reload,
}: {
  data: InvitationData;
  reload: () => Promise<InvitationData>;
}) {
  const [pending, setPending] = useState<GiftKind | null>(null);
  const [emailCopied, setEmailCopied] = useState(false);
  const [draftDetails, setDraftDetails] = useState<GiftDetails>({});
  const [animated, setAnimated] = useState<GiftKind | null>(null);
  const animationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (animationTimer.current) clearTimeout(animationTimer.current);
    },
    [],
  );
  function animate(kind: GiftKind) {
    if (animationTimer.current) clearTimeout(animationTimer.current);
    setAnimated(kind);
    animationTimer.current = setTimeout(() => setAnimated(null), 2200);
  }
  const choices = data.giftChoices;
  const selected = choices.filter((choice) => choice.mine).length;
  async function choose(kind: GiftKind, selected: boolean, detail?: string) {
    setPending(kind);
    try {
      const wasMine = choices.find((choice) => choice.kind === kind)?.mine;
      await api('/guest/gift-choice', 'guest', { kind, selected, detail });
      await reload();
      toast.success(
        !selected
          ? 'انتخاب آزاد شد.'
          : wasMine
            ? 'نوع پذیرایی ثبت شد.'
            : 'به نام خانوادهٔ شما رزرو شد.',
      );
    } catch (err) {
      toast.error((err as Error).message);
      await reload().catch(() => undefined);
    } finally {
      setPending(null);
    }
  }
  return (
    <section id="gifts" className="winter-gifts winter-width">
      <div className="winter-section-heading">
        <div>
          <span className="winter-eyebrow">
            <Gift size={15} /> برای سفرهٔ یلدا
          </span>
          <h2>لطفاً کادو نیارید</h2>
          <p className="muted gift-intro-note">
            حضورتون از هزار هدیه بهتره، با خودتون کلی لبخند و شادی بیارید که لازم داریم.
            <br />
            اگه اصرار دارید، یکی از این‌ها عالیه و دوتا واقعاً کافیه 😄 دوستتون داریم ❤️
          </p>
        </div>
        <div className="gift-selection-count" role="status">
          <span>{number(selected)}</span> از ۲ انتخاب{' '}
          <div className="selection-dots" aria-hidden="true">
            <i className={selected > 0 ? 'filled' : ''} />
            <i className={selected > 1 ? 'filled' : ''} />
          </div>
        </div>
      </div>
      <div className="winter-gift-grid">
        {giftOptions.map((option, index) => {
          const state = choices.find((choice) => choice.kind === option.id);
          const mine = !!state?.mine;
          const detailKind = option.id as keyof GiftDetails;
          const detailOptions = giftDetailOptions[detailKind];
          const currentDetail =
            (mine ? state?.detail : draftDetails[detailKind] || state?.detail) ||
            detailOptions?.[0];
          const remaining = Math.max(0, option.capacity - (state?.reserved || 0));
          const full = !mine && remaining === 0;
          const disabled =
            pending !== null || data.event.status !== 'open' || full || (!mine && selected >= 2);
          return (
            <motion.article
              key={option.id}
              className={`winter-gift-card gift-${option.id} ${mine ? 'gift-chosen' : ''} ${full ? 'gift-full' : ''} ${animated === option.id ? 'gift-animating' : ''}`}
              onPointerEnter={(event) => {
                if (event.pointerType === 'mouse') animate(option.id);
              }}
              onPointerDown={() => animate(option.id)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') animate(option.id);
              }}
              initial={false}
              whileHover={{ y: -6 }}
              transition={{ type: 'spring', stiffness: 260, damping: 22 }}
            >
              <div className="gift-card-top">
                <span className="gift-index">0{index + 1}</span>
                <span className={`gift-availability ${mine ? 'is-mine' : ''}`}>
                  {mine
                    ? 'به نام شما'
                    : full
                      ? 'تکمیل شده'
                      : `${number(remaining)} از ${number(option.capacity)} باقی مانده`}
                </span>
              </div>
              <div className="gift-object" aria-hidden="true">
                {option.id === 'pin' ? (
                  <Image
                    src={`${basePath}/images/lion-sun-pin.webp`}
                    alt=""
                    width={150}
                    height={150}
                    style={{ objectFit: 'contain', width: 'auto', height: '125px' }}
                    unoptimized
                  />
                ) : option.id === 'pomegranate' ? (
                  <PomegranateBowl />
                ) : option.id === 'gift-card' ? (
                  <div className="amazon-gift-scene">
                    <div className="little-gift-card amazon-gift-card" lang="en" dir="ltr">
                      <span className="amazon-wordmark">
                        amazon<span>.ca</span>
                      </span>
                      <svg className="amazon-smile" viewBox="0 0 100 24" fill="none">
                        <path
                          d="M6 4C30 22 64 24 90 7M78 5L94 3L91 17"
                          stroke="currentColor"
                          strokeWidth="4"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      <b className="gift-card-value">$25</b>
                      <small>eGift Card · CAD</small>
                    </div>
                    <span className="amazon-sparks">
                      {Array.from({ length: 8 }, (_, i) => (
                        <i
                          key={i}
                          style={
                            {
                              '--spark-angle': `${i * 45 + 20}deg`,
                              animationDelay: `${(i % 3) * 0.09}s`,
                            } as CSSProperties
                          }
                        />
                      ))}
                    </span>
                  </div>
                ) : (
                  <div className="pastry-object">
                    <span>✧</span>
                    <i />
                    <i />
                    <i />
                    <i />
                    <span className="pastry-crumbs">
                      {Array.from({ length: 7 }, (_, i) => (
                        <b
                          key={i}
                          style={
                            {
                              '--crumb-x': `${-38 + i * 13}px`,
                              '--crumb-y': `${30 + (i % 3) * 10}px`,
                              animationDelay: `${i * 0.06}s`,
                            } as CSSProperties
                          }
                        />
                      ))}
                    </span>
                  </div>
                )}
              </div>
              <h3>{option.title}</h3>
              <p>{option.note}</p>
              {detailOptions && (
                <fieldset className="gift-detail-picker" disabled={disabled}>
                  <legend>
                    {option.id === 'pomegranate' ? 'نوع دسر انار' : 'پیشنهادهای شیرینی'}
                  </legend>
                  <div>
                    {detailOptions.map((detail, detailIndex) => (
                      <Fragment key={detail}>
                        <label
                          className={`${currentDetail === detail ? 'detail-selected' : ''} ${option.id === 'pomegranate' && detailIndex === 0 ? 'detail-primary' : ''} ${option.id === 'pastry' && detailIndex < 4 ? 'detail-preferred' : ''}`}
                        >
                          <input
                            type="radio"
                            name={`gift-detail-${option.id}`}
                            value={detail}
                            checked={currentDetail === detail}
                            onChange={() => {
                              if (mine) void choose(option.id, true, detail);
                              else
                                setDraftDetails((previous) => ({
                                  ...previous,
                                  [detailKind]: detail,
                                }));
                            }}
                          />
                          <span>{giftDetailLabel(detail)}</span>
                          {option.id === 'pomegranate' && detailIndex === 0 && (
                            <small>پیشنهاد اصلی</small>
                          )}
                        </label>
                        {((option.id === 'pomegranate' && detailIndex === 0) ||
                          (option.id === 'pastry' && detailIndex === 3)) && (
                          <hr className="gift-detail-divider" aria-hidden="true" />
                        )}
                      </Fragment>
                    ))}
                  </div>
                </fieldset>
              )}
              {option.id === 'gift-card' && (
                <div className="birthday-gift-details">
                  <span className="birthday-gift-label">هدیهٔ گروهی تولد</span>
                  <p>برای پلی‌استیشن ۵ اسلیم دیسک‌خور و بازی جی‌تی‌ای ۶.</p>
                  <details>
                    <summary>چطور هدیه بدهیم؟</summary>
                    <p>
                      در آمازون کانادا، کارت هدیهٔ دیجیتال با مبلغ ۲۵ دلار کانادا و ارسال ایمیلی را
                      انتخاب کنید. اعتبار کارت‌ها در این حساب آمازون جمع می‌شود تا هدیه را براش بخرم
                      😄
                    </p>
                    <p>ایمیل دریافت هدیه:</p>
                    <button
                      className="gift-email-copy"
                      aria-label="کپی ایمیل دریافت هدیه"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(birthdayGift.email);
                          setEmailCopied(true);
                          setTimeout(() => setEmailCopied(false), 1800);
                        } catch {
                          toast.error('ایمیل را انتخاب و کپی کنید.');
                        }
                      }}
                    >
                      <span dir="ltr">{birthdayGift.email}</span>
                      {emailCopied ? <Check size={14} /> : <Copy size={14} />}
                    </button>
                    <a
                      className="gift-digital-link"
                      href={birthdayGift.digitalUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      باز کردن کارت هدیهٔ دیجیتال
                    </a>
                  </details>
                </div>
              )}
              <Button
                variant={mine ? 'secondary' : 'outline'}
                disabled={disabled}
                onClick={() => choose(option.id, !mine, !mine ? currentDetail : undefined)}
                aria-label={mine ? `لغو انتخاب ${option.title}` : `انتخاب ${option.title}`}
              >
                <span>
                  {pending === option.id
                    ? 'در حال ثبت…'
                    : mine
                      ? 'انتخاب شد'
                      : full
                        ? 'تکمیل شده'
                        : 'من میارم'}
                </span>
                {mine ? <Check size={17} /> : <Plus size={17} />}
              </Button>
              {mine && (
                <button
                  className="gift-release"
                  onClick={() => choose(option.id, false)}
                  disabled={pending !== null || data.event.status !== 'open'}
                >
                  <X size={12} />
                  آزاد کردن انتخاب
                </button>
              )}
              {option.id === 'pin' && (
                <a
                  className="gift-source"
                  href="https://iranopasmigirim.com/fa/ribbon"
                  target="_blank"
                  rel="noreferrer"
                >
                  خرید پین شیر و خورشید <ArrowUpLeft size={12} />
                </a>
              )}
              {option.id === 'gift-card' && (
                <a
                  className="gift-source"
                  href={birthdayGift.shopUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  خرید از آمازون کانادا <ArrowUpLeft size={12} />
                </a>
              )}
            </motion.article>
          );
        })}
      </div>
      <p className="winter-gift-note">
        انتخاب‌ها اختیاری‌اند؛ هر انتخاب یک ظرف، بسته یا کارت ۲۵ دلاری. اینجا پرداخت یا کدی وارد
        نمی‌کنید.
      </p>
    </section>
  );
}
