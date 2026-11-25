'use client';
import { useState } from 'react';
import Image from 'next/image';
import * as motion from 'motion/react-m';
import {
  Gamepad2,
  Gift,
  Heart,
  Check,
  Plus,
  Minus,
  Leaf,
  LockKeyhole,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import {
  number,
  money,
  progress,
  type InvitationData,
  type Campaign,
  type RegistryItem,
} from '../../../../packages/shared/src';
import { Button } from './ui/button';
export function Gifts({
  data,
  reload,
}: {
  data: InvitationData;
  reload: () => Promise<InvitationData>;
}) {
  const closed = data.event.status !== 'open';
  return (
    <section id="gifts" className="gifts section-wrap">
      <div className="section-heading gifts-heading">
        <div>
          <span className="section-kicker">
            <Gift size={16} /> کاملاً اختیاری، از سر مهر
          </span>
          <h2>
            هر دونه انار،
            <br />
            یه تکه از شادی.
          </h2>
        </div>
        <p className="muted">
          اگر دوست داشتید سهمی در حال خوب این شب داشته باشید،
          <br />
          یکی از این بهانه‌های کوچک را انتخاب کنید.
          <br />
          <strong>حضور شما، خودش بهترین هدیه است.</strong>
        </p>
      </div>
      {data.campaigns
        .filter((c) => c.config.enabled && (c.kind === 'console' || data.event.features.mystery))
        .map((c) => (
          <CampaignPanel
            key={`${c.id}-${data.pledges.find((p) => p.campaignId === c.id)?.amountCents}`}
            campaign={c}
            mine={data.pledges.find((p) => p.campaignId === c.id)?.amountCents || 0}
            received={data.pledges.find((p) => p.campaignId === c.id)?.receivedCents || 0}
            closed={closed}
            reload={reload}
          />
        ))}
      <div className="participation-grid">
        {data.event.features.pomegranate && (
          <PomegranateChallenge
            key={`${data.household.pomegranates}-${data.members.filter((m) => m.status === 'attending').length}`}
            data={data}
            reload={reload}
          />
        )}{' '}
        {data.event.features.feast && (
          <article className="feast-panel">
            <span className="section-kicker">
              <Leaf size={18} /> سفره‌ای که با هم می‌چینیم
            </span>
            <h3>یک طعم از خانهٔ شما</h3>
            <p className="muted">
              هر کس، هر چقدر دوست داشت. ظرفیت‌ها با انتخاب شما به‌روز می‌شوند.
            </p>
            <div className="registry-list">
              {data.registry.map((item) => (
                <RegistryRow
                  key={`${item.id}-${item.mine}`}
                  item={item}
                  reload={reload}
                  closed={closed}
                />
              ))}
            </div>
          </article>
        )}
      </div>
      <div className="presence-note">
        <Heart size={20} />
        <span>هیچ انتخابی لازم نیست؛ همین که بیایید، خوشحالیم.</span>
      </div>
    </section>
  );
}
function CampaignPanel({
  campaign,
  mine,
  received,
  closed,
  reload,
}: {
  campaign: Campaign;
  mine: number;
  received: number;
  closed: boolean;
  reload: () => Promise<InvitationData>;
}) {
  const [amount, setAmount] = useState(mine ? mine / 100 : 30);
  const [pending, setPending] = useState(false);
  const percent = progress(campaign.receivedCents, campaign.config.targetCents);
  const mystery = campaign.kind === 'mystery';
  async function commit(cents: number) {
    setPending(true);
    try {
      await api('/guest/pledge', 'guest', { campaignId: campaign.id, amountCents: cents });
      await reload();
      toast.success(cents ? 'قول هدیه ثبت شد؛ بدون نیاز به پرداخت در سایت.' : 'قول هدیه لغو شد.');
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setPending(false);
    }
  }
  return (
    <article
      className={`campaign-panel ${mystery ? 'mystery-panel' : ''} ${percent === 100 ? 'unlocked' : ''}`}
    >
      <div className="campaign-visual">
        {campaign.config.imageUrl ? (
          <Image
            src={campaign.config.imageUrl}
            alt={campaign.config.product}
            fill
            sizes="(max-width: 768px) 90vw, 40vw"
            style={{ objectFit: 'contain' }}
            unoptimized
          />
        ) : mystery ? (
          <div className="mystery-box" style={{ filter: `brightness(${0.4 + percent / 150})` }}>
            <Gift size={100} />
            {percent === 100 ? <Sparkles /> : <LockKeyhole />}
          </div>
        ) : (
          <div
            className="console-scene"
            role="img"
            aria-label={`${campaign.config.consoleType}، ${number(percent)} درصد روشن شده`}
          >
            <div className="console-aura" style={{ opacity: percent / 100 }} />
            <div className="console-body">
              <div className="console-top" />
              <div className="console-light" style={{ height: `${percent}%` }} />
              <div className="console-power">✕</div>
              <span className="console-slot" />
              <span className="console-brand" lang="en">
                {campaign.config.consoleType}
              </span>
            </div>
            <Gamepad2 className="console-controller" size={100} strokeWidth={1} />
            <div className="console-pedestal" />
          </div>
        )}
        <span className="visual-caption" lang="en">
          {mystery ? 'A LITTLE MYSTERY. A LOT OF JOY.' : 'GOOD COMPANY. GREAT GAMES.'}
        </span>
        {percent === 100 && (
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="unlock-badge"
          >
            <Sparkles size={18} />
            قفل شادی باز شد!
          </motion.div>
        )}
      </div>
      <div className="campaign-copy">
        <span className="section-kicker">
          {mystery ? <Gift size={16} /> : <Gamepad2 size={16} />}{' '}
          {mystery ? 'راز کوچک یلدا' : 'هدیهٔ گروهی · یک انتخاب اختیاری'}
        </span>
        <h3>{campaign.config.name}</h3>
        <p className="product-label" lang="en" dir="ltr">
          {mystery && percent < 100 ? 'A SURPRISE WORTH WAITING FOR' : campaign.config.product}
        </p>
        <p className="muted">
          {mystery
            ? 'یک غافلگیری کوچک که با رسیدن به هدف، روشن می‌شود.'
            : 'اگر برای هدیهٔ تولد ایده‌ای می‌خواستید، می‌توانیم با هم یک هدیهٔ مشترک بسازیم.'}
        </p>
        <div className="progress-label">
          <strong>{number(percent)}٪ روشن شده</strong>
          <span>
            {money(campaign.receivedCents)} از {money(campaign.config.targetCents)}
          </span>
        </div>
        <div
          className="progress-track"
          role="progressbar"
          aria-label="پیشرفت هدیه‌های دریافت‌شده"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <motion.div initial={false} animate={{ width: `${percent}%` }} />
        </div>
        <div className="milestones">
          {campaign.config.milestones.map((m) => (
            <span key={m.percent} className={percent >= m.percent ? 'achieved' : ''}>
              <span>{percent >= m.percent ? <Check size={13} /> : number(m.percent) + '٪'}</span>
              {m.label}
            </span>
          ))}
        </div>
        <small className="muted">
          فقط هدیه‌هایی که میزبان دریافتشان را تأیید کرده، در پیشرفت محاسبه می‌شوند.
        </small>
        <form
          className="pledge-form"
          onSubmit={(e) => {
            e.preventDefault();
            void commit(Math.round(amount * 100));
          }}
        >
          <fieldset disabled={pending || closed}>
            <legend>اگر دوست داشتید، سهم دلخواهتان را انتخاب کنید</legend>
            <div className="amounts" dir="ltr">
              {[10, 20, 25, 30, 40, 50, 100].map((n) => (
                <Button
                  key={n}
                  type="button"
                  variant={amount === n ? 'secondary' : 'outline'}
                  size="sm"
                  aria-pressed={amount === n}
                  onClick={() => setAmount(n)}
                >
                  ${n}
                </Button>
              ))}
            </div>
            <div className="inline-form">
              <label className="amount-custom">
                <span>مبلغ دلخواه (CAD)</span>
                <input
                  type="number"
                  aria-label="مبلغ دلخواه به دلار کانادا"
                  min={received / 100}
                  max={10000}
                  step="1"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  required
                  dir="ltr"
                />
              </label>
              <Button type="submit" size="sm">
                {pending ? 'در حال ثبت…' : mine ? 'اصلاح قول هدیه' : 'ثبت قول هدیه'}
              </Button>
            </div>
            {mine > 0 && (
              <div className="my-pledge">
                <span>
                  قول شما: {money(mine)} · دریافت‌شده: {money(received)}
                </span>
                {!received && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => commit(0)}>
                    لغو قول
                  </Button>
                )}
              </div>
            )}
          </fieldset>
        </form>
        {campaign.config.purchaseUrl && (
          <a
            className="text-link purchase-link"
            href={campaign.config.purchaseUrl}
            target="_blank"
            rel="noreferrer"
          >
            خرید کارت هدیهٔ Best Buy Canada
          </a>
        )}
        <p className="gift-disclaimer">
          {!mystery && (
            <>
              فقط کارت هدیهٔ <bdi>Best Buy</bdi>؛ نه <bdi>Xbox Store</bdi> و نه <bdi>Game Pass</bdi>.
              <br />
            </>
          )}
          اینجا پرداختی انجام نمی‌شود. هیچ کد کارت هدیه‌ای وارد نکنید.
        </p>
      </div>
    </article>
  );
}
function PomegranateChallenge({
  data,
  reload,
}: {
  data: InvitationData;
  reload: () => Promise<InvitationData>;
}) {
  const attending = data.members.filter((m) => m.status === 'attending').length;
  const suggested = Math.min(
    data.event.pomegranateMax,
    attending * data.event.pomegranateMultiplier,
  );
  const [quantity, setQuantity] = useState(data.household.pomegranates || suggested);
  const [pending, setPending] = useState(false);
  return (
    <article className="challenge-panel">
      <span className="section-kicker">یک رسم خوشمزهٔ یلدایی</span>
      <div className="challenge-fruit" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <div className="tiny-fruit" key={i}>
            <span>✦</span>
          </div>
        ))}
      </div>
      <h3>انار دون کنیم؟</h3>
      <p className="muted">
        انار آماده با کمی گلپر؛
        <br />
        سهمی کوچک از سفرهٔ بزرگ باهم بودن.
      </p>
      <p>
        پیشنهاد برای خانوادهٔ شما: <strong>{number(suggested)} انار</strong>
      </p>
      <small className="muted">
        {number(data.event.pomegranateMultiplier)} انار برای هر مهمان تأییدشده، حداکثر{' '}
        {number(data.event.pomegranateMax)} عدد.
      </small>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setPending(true);
          try {
            await api('/guest/pomegranates', 'guest', { quantity });
            await reload();
            toast.success('سهم انار شما ثبت شد.');
          } catch (err) {
            toast.error((err as Error).message);
          } finally {
            setPending(false);
          }
        }}
      >
        <div className="quantity-selector">
          <Button
            aria-label="کاهش تعداد انار"
            type="button"
            variant="ghost"
            size="icon"
            disabled={quantity <= 0}
            onClick={() => setQuantity(quantity - 1)}
          >
            <Minus size={18} />
          </Button>
          <label>
            <input
              type="number"
              aria-label="تعداد انار"
              min={0}
              max={data.event.pomegranateMax}
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
            />
            <span>انار</span>
          </label>
          <Button
            aria-label="افزایش تعداد انار"
            type="button"
            variant="ghost"
            size="icon"
            disabled={quantity >= data.event.pomegranateMax}
            onClick={() => setQuantity(quantity + 1)}
          >
            <Plus size={18} />
          </Button>
        </div>
        <Button variant="outline" type="submit" disabled={pending || data.event.status !== 'open'}>
          {data.household.pomegranates ? 'اصلاح سهم انار' : 'من انار می‌آورم'}
        </Button>
        {data.household.pomegranates > 0 && (
          <p className="success-label">
            <Check size={15} />
            {number(data.household.pomegranates)} انار به نام شما ثبت شده
          </p>
        )}
      </form>
    </article>
  );
}
function RegistryRow({
  item,
  reload,
  closed,
}: {
  item: RegistryItem;
  reload: () => Promise<InvitationData>;
  closed: boolean;
}) {
  const [quantity, setQuantity] = useState(item.mine);
  const [pending, setPending] = useState(false);
  const max = item.quantity - item.committed + item.mine;
  return (
    <form
      className="registry-row"
      onSubmit={async (e) => {
        e.preventDefault();
        setPending(true);
        try {
          await api('/guest/commitment', 'guest', { itemId: item.id, quantity });
          await reload();
          toast.success(quantity ? 'انتخاب شما برای سفره ثبت شد.' : 'انتخاب لغو شد.');
        } catch (err) {
          toast.error((err as Error).message);
          await reload();
        } finally {
          setPending(false);
        }
      }}
    >
      <div>
        <label htmlFor={`registry-${item.id}`}>{item.name}</label>
        <small>
          {number(item.quantity - item.committed)} از {number(item.quantity)} {item.unit} باقی مانده
          {item.mine > 0 ? ` · سهم شما: ${number(item.mine)}` : ''}
        </small>
      </div>
      <input
        id={`registry-${item.id}`}
        type="number"
        value={quantity}
        onChange={(e) => setQuantity(Number(e.target.value))}
        min={0}
        max={max}
        aria-label={`تعداد ${item.name}`}
        disabled={pending || closed}
      />
      <Button type="submit" variant="outline" size="sm" disabled={pending || closed}>
        {item.mine ? 'اصلاح' : 'ثبت'}
      </Button>
    </form>
  );
}
