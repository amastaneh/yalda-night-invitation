'use client';
import { useState } from 'react';
import Image from 'next/image';
import * as motion from 'motion/react-m';
import { Check, Plus, ArrowUpLeft, Gift, X } from 'lucide-react';
import { toast } from 'sonner';
import { api, basePath } from '@/lib/api';
import { number, type InvitationData } from '../../../../packages/shared/src';
import { giftOptions, type GiftKind } from '../../../../packages/shared/src/party';
import { Button } from './ui/button';

export function Gifts({
  data,
  reload,
}: {
  data: InvitationData;
  reload: () => Promise<InvitationData>;
}) {
  const [pending, setPending] = useState<GiftKind | null>(null);
  const choices = data.giftChoices;
  const selected = choices.filter((choice) => choice.mine).length;
  async function choose(kind: GiftKind, mine: boolean) {
    setPending(kind);
    try {
      await api('/guest/gift-choice', 'guest', { kind, selected: !mine });
      await reload();
      toast.success(mine ? 'انتخاب آزاد شد.' : 'به نام خانوادهٔ شما رزرو شد.');
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
          <h2>شما کدوم رو میارید؟</h2>
          <p className="muted">یکی عالیه، دوتا کافیه. بگذاریم به همه برسه.</p>
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
          const remaining = Math.max(0, option.capacity - (state?.reserved || 0));
          const full = !mine && remaining === 0;
          const disabled =
            pending !== null || data.event.status !== 'open' || full || (!mine && selected >= 2);
          return (
            <motion.article
              key={option.id}
              className={`winter-gift-card gift-${option.id} ${mine ? 'gift-chosen' : ''} ${full ? 'gift-full' : ''}`}
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
                  <div className="fruit-object">
                    <span className="fruit-crown">♛</span>
                    <span className="fruit-seeds">✦</span>
                  </div>
                ) : option.id === 'gift-card' ? (
                  <div className="little-gift-card">
                    <span>
                      BEST
                      <br />
                      BUY
                    </span>
                    <Gift size={26} />
                    <b className="gift-card-value">$25</b>
                    <small>GIFT CARD</small>
                  </div>
                ) : (
                  <div className="pastry-object">
                    <span>✧</span>
                    <i />
                    <i />
                    <i />
                    <i />
                  </div>
                )}
              </div>
              <h3>{option.title}</h3>
              <p>{option.note}</p>
              <Button
                variant={mine ? 'secondary' : 'outline'}
                disabled={disabled}
                onClick={() => choose(option.id, mine)}
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
                  onClick={() => choose(option.id, true)}
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
                  دیدن پین <ArrowUpLeft size={12} />
                </a>
              )}
              {option.id === 'gift-card' && (
                <a
                  className="gift-source"
                  href="https://www.bestbuy.ca/en-ca/category/best-buy-gift-cards/20277"
                  target="_blank"
                  rel="noreferrer"
                >
                  دیدن کارت هدیه <ArrowUpLeft size={12} />
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
