'use client';
import { api } from '@/lib/api';
import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { z } from 'zod';
import { campaignSchema, money, number } from '../../../../../packages/shared/src';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../ui/dialog';

import type { CampaignRow, Overview, Pledge, Registry } from './types';
export function GiftAdmin({
  data,
  eventId,
  reload,
}: {
  data: Overview;
  eventId: string;
  reload: () => Promise<void>;
}) {
  const [campaign, setCampaign] = useState<CampaignRow | 'new' | null>(null);
  const [item, setItem] = useState<Registry | 'new' | null>(null);
  return (
    <>
      <div className="admin-actions">
        <Button size="sm" onClick={() => setCampaign('new')}>
          <Plus size={16} />
          پویش هدیه
        </Button>
        <Button size="sm" variant="outline" onClick={() => setItem('new')}>
          <Plus size={16} />
          گزینهٔ سفره
        </Button>
      </div>
      <section className="admin-panel">
        <h2>قول هدیه و تأیید دریافت</h2>
        <p className="muted">
          فقط مبالغ تأییدشده در انیمیشن مهمان‌ها محاسبه می‌شوند. کد کارت هدیه را اینجا وارد نکنید.
        </p>
        {data.pledges.map((p) => (
          <Receipt
            key={`${p.id}-${p.amount_cents}-${p.received_cents}`}
            pledge={p}
            reload={reload}
          />
        ))}
        {!data.pledges.length && <p className="empty-state">هنوز قول هدیه‌ای ثبت نشده است.</p>}
      </section>
      <section className="admin-panel">
        <h2>پویش‌های هدیه</h2>
        {data.campaigns.map((c) => {
          const config = campaignSchema.parse(JSON.parse(c.config));
          return (
            <div className="admin-receipt-row" key={c.id}>
              <div>
                <h3>{config.name}</h3>
                <small>
                  {config.enabled ? 'فعال' : 'غیرفعال'} · هدف {money(config.targetCents)} ·{' '}
                  {config.product}
                </small>
              </div>
              <Button size="sm" variant="outline" onClick={() => setCampaign(c)}>
                ویرایش پویش
              </Button>
            </div>
          );
        })}
      </section>
      <section className="admin-panel">
        <h2>سفرهٔ مشارکتی</h2>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>گزینه</th>
                <th>درخواست‌شده</th>
                <th>تعهد شده</th>
                <th>باقی‌مانده</th>
                <th>مدیریت</th>
              </tr>
            </thead>
            <tbody>
              {data.registry.map((r) => (
                <tr key={r.id}>
                  <td>{r.name}</td>
                  <td>
                    {number(r.quantity)} {r.unit}
                  </td>
                  <td>{number(r.committed)}</td>
                  <td>{number(r.quantity - r.committed)}</td>
                  <td>
                    <Button size="sm" variant="outline" onClick={() => setItem(r)}>
                      ویرایش
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="admin-panel">
        <h2>چه کسی، چه چیزی می‌آورد؟</h2>
        {data.commitments.map((c) => (
          <CommitmentEditor key={`${c.id}-${c.quantity}`} commitment={c} reload={reload} />
        ))}
        {!data.commitments.length && (
          <p className="empty-state">هنوز سهمی از سفره انتخاب نشده است.</p>
        )}
      </section>
      <Dialog open={!!campaign} onOpenChange={(o) => !o && setCampaign(null)}>
        <DialogContent className="admin-dialog-content">
          <DialogTitle>{campaign === 'new' ? 'پویش جدید' : 'ویرایش پویش'}</DialogTitle>
          <DialogDescription>
            هدف‌ها، تصویر و مراحل برای مهمان‌ها نمایش داده می‌شوند.
          </DialogDescription>
          {campaign && (
            <CampaignForm
              key={campaign === 'new' ? 'new' : campaign.id}
              row={campaign === 'new' ? undefined : campaign}
              onSave={async (kind, config) => {
                await api(
                  campaign === 'new'
                    ? `/admin/events/${eventId}/campaigns`
                    : `/admin/campaigns/${campaign.id}`,
                  'admin',
                  campaign === 'new' ? { kind, config } : config,
                  campaign === 'new' ? 'POST' : 'PUT',
                );
                setCampaign(null);
                await reload();
                toast.success('پویش ذخیره شد.');
              }}
            />
          )}
        </DialogContent>
      </Dialog>
      <Dialog open={!!item} onOpenChange={(o) => !o && setItem(null)}>
        <DialogContent className="admin-dialog-content">
          <DialogTitle>تنظیم گزینهٔ سفره</DialogTitle>
          <DialogDescription>ظرفیت نمی‌تواند از تعداد تعهدشده کمتر باشد.</DialogDescription>
          {item && (
            <RegistryForm
              row={item === 'new' ? undefined : item}
              onSave={async (r) => {
                await api(
                  item === 'new'
                    ? `/admin/events/${eventId}/registry`
                    : `/admin/registry/${item.id}`,
                  'admin',
                  r,
                  item === 'new' ? 'POST' : 'PUT',
                );
                setItem(null);
                await reload();
                toast.success('گزینه ذخیره شد.');
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
function CommitmentEditor({
  commitment: c,
  reload,
}: {
  commitment: Overview['commitments'][number];
  reload: () => Promise<void>;
}) {
  const [quantity, setQuantity] = useState(c.quantity);
  const [pending, setPending] = useState(false);
  return (
    <form
      className="admin-receipt-row"
      onSubmit={async (e) => {
        e.preventDefault();
        setPending(true);
        try {
          await api(`/admin/commitments/${c.id}`, 'admin', { quantity }, 'PUT');
          await reload();
          toast.success('سهم سفره اصلاح شد.');
        } catch (err) {
          toast.error((err as Error).message);
        } finally {
          setPending(false);
        }
      }}
    >
      <div>
        <h3>{c.household_name}</h3>
        <small>
          {c.item_name} · {c.unit}
        </small>
      </div>
      <label>
        تعداد (صفر برای لغو)
        <input
          type="number"
          min={0}
          max={500}
          value={quantity}
          onChange={(e) => setQuantity(Number(e.target.value))}
          required
        />
      </label>
      <Button size="sm" variant="outline" disabled={pending}>
        ثبت اصلاح
      </Button>
    </form>
  );
}
function Receipt({ pledge: p, reload }: { pledge: Pledge; reload: () => Promise<void> }) {
  const [amount, setAmount] = useState(p.amount_cents / 100);
  const [received, setReceived] = useState(p.received_cents / 100);
  const [pending, setPending] = useState(false);
  return (
    <form
      className="admin-receipt-row"
      onSubmit={async (e) => {
        e.preventDefault();
        setPending(true);
        try {
          await api(
            `/admin/pledges/${p.id}`,
            'admin',
            { amountCents: Math.round(amount * 100), receivedCents: Math.round(received * 100) },
            'PUT',
          );
          await reload();
          toast.success('هدیه اصلاح و دریافت به‌روز شد.');
        } catch (err) {
          toast.error((err as Error).message);
        } finally {
          setPending(false);
        }
      }}
    >
      <div>
        <h3>{p.household_name}</h3>
        <small>{JSON.parse(p.campaign_config).name}</small>
      </div>
      <label>
        قول (CAD)
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
          min={0}
          max={10000}
          step=".01"
          required
          dir="ltr"
        />
      </label>
      <label>
        دریافت (CAD)
        <input
          type="number"
          value={received}
          onChange={(e) => setReceived(Number(e.target.value))}
          min={0}
          max={amount}
          step=".01"
          required
          dir="ltr"
        />
      </label>
      <Button type="button" variant="ghost" size="sm" onClick={() => setReceived(amount)}>
        دریافت کامل
      </Button>
      <Button type="submit" variant="outline" size="sm" disabled={pending}>
        ثبت اصلاح
      </Button>
    </form>
  );
}
function CampaignForm({
  row,
  onSave,
}: {
  row?: CampaignRow;
  onSave: (kind: 'console' | 'mystery', c: z.infer<typeof campaignSchema>) => Promise<void>;
}) {
  const [value, setValue] = useState<z.infer<typeof campaignSchema>>(
    row
      ? JSON.parse(row.config)
      : {
          name: 'یک بازی، هزار خاطره',
          product: 'Xbox Series X + GTA VI',
          consoleType: 'Xbox Series X',
          imageUrl: '',
          targetCents: 120000,
          purchaseUrl: 'https://www.bestbuy.ca/en-ca/category/best-buy-gift-cards/20277',
          enabled: true,
          milestones: [
            { percent: 25, label: 'مرحلهٔ اول' },
            { percent: 50, label: 'نیمهٔ راه' },
            { percent: 75, label: 'نزدیک به بازی' },
            { percent: 100, label: 'بازی آغاز شد' },
          ],
        },
  );
  const [kind, setKind] = useState<'console' | 'mystery'>(row?.kind || 'console');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setPending(true);
        try {
          await onSave(kind, campaignSchema.parse(value));
        } catch (err) {
          setError(
            err instanceof z.ZodError
              ? 'اطلاعات پویش یا لینک HTTPS معتبر نیست.'
              : (err as Error).message,
          );
        } finally {
          setPending(false);
        }
      }}
    >
      <div className="field">
        <label htmlFor="campaign-kind">نوع پویش</label>
        <select
          id="campaign-kind"
          value={kind}
          onChange={(e) => setKind(e.target.value as typeof kind)}
          disabled={!!row}
        >
          <option value="console">هدیهٔ بازی</option>
          <option value="mystery">جعبهٔ راز</option>
        </select>
      </div>
      {(
        [
          { key: 'name', label: 'عنوان پویش' },
          { key: 'product', label: 'نام محصول / متن غافلگیری' },
          { key: 'consoleType', label: 'نوع کنسول' },
          { key: 'imageUrl', label: 'لینک HTTPS تصویر (اختیاری)' },
          { key: 'purchaseUrl', label: 'لینک HTTPS خرید کارت هدیه' },
        ] as const
      ).map(({ key, label }) => (
        <div className="field" key={key}>
          <label htmlFor={`campaign-${key}`}>{label}</label>
          <input
            id={`campaign-${key}`}
            value={value[key]}
            onChange={(e) => setValue({ ...value, [key]: e.target.value })}
            required={key === 'name'}
            dir={key.endsWith('Url') ? 'ltr' : undefined}
          />
        </div>
      ))}
      <div className="field">
        <label htmlFor="campaign-target">هدف (CAD)</label>
        <input
          id="campaign-target"
          type="number"
          min={1}
          max={100000}
          step=".01"
          value={value.targetCents / 100}
          onChange={(e) =>
            setValue({ ...value, targetCents: Math.round(Number(e.target.value) * 100) })
          }
          required
        />
      </div>
      <h3>مراحل روشن‌شدن</h3>
      {value.milestones.map((m, i) => (
        <div className="inline-form" key={i} style={{ marginBlock: '.5rem' }}>
          <input
            type="number"
            aria-label={`درصد مرحله ${i + 1}`}
            min={1}
            max={100}
            value={m.percent}
            onChange={(e) =>
              setValue({
                ...value,
                milestones: value.milestones.map((v, j) =>
                  j === i ? { ...v, percent: Number(e.target.value) } : v,
                ),
              })
            }
            style={{ maxWidth: 80 }}
          />
          <input
            aria-label={`عنوان مرحله ${i + 1}`}
            value={m.label}
            onChange={(e) =>
              setValue({
                ...value,
                milestones: value.milestones.map((v, j) =>
                  j === i ? { ...v, label: e.target.value } : v,
                ),
              })
            }
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={`حذف مرحله ${i + 1}`}
            onClick={() =>
              setValue({ ...value, milestones: value.milestones.filter((_, j) => j !== i) })
            }
          >
            <Trash2 size={16} />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={value.milestones.length >= 10}
        onClick={() =>
          setValue({
            ...value,
            milestones: [...value.milestones, { percent: 100, label: 'مرحلهٔ تازه' }],
          })
        }
      >
        افزودن مرحله
      </Button>
      <label className="toggle-row">
        <input
          type="checkbox"
          checked={value.enabled}
          onChange={(e) => setValue({ ...value, enabled: e.target.checked })}
        />
        پویش فعال باشد
      </label>
      {error && (
        <p role="alert" className="error-text">
          {error}
        </p>
      )}
      <Button type="submit" disabled={pending}>
        ذخیرهٔ پویش
      </Button>
    </form>
  );
}
function RegistryForm({
  row,
  onSave,
}: {
  row?: Registry;
  onSave: (r: { name: string; unit: string; quantity: number }) => Promise<void>;
}) {
  const [value, setValue] = useState({
    name: row?.name || '',
    unit: row?.unit || 'عدد',
    quantity: row?.quantity || 1,
  });
  const [pending, setPending] = useState(false);
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setPending(true);
        try {
          await onSave(value);
        } catch (err) {
          toast.error((err as Error).message);
        } finally {
          setPending(false);
        }
      }}
    >
      <div className="field">
        <label htmlFor="item-name">نام خوراکی</label>
        <input
          id="item-name"
          value={value.name}
          onChange={(e) => setValue({ ...value, name: e.target.value })}
          required
          maxLength={150}
        />
      </div>
      <div className="field">
        <label htmlFor="item-unit">واحد</label>
        <input
          id="item-unit"
          value={value.unit}
          onChange={(e) => setValue({ ...value, unit: e.target.value })}
          required
          maxLength={50}
        />
      </div>
      <div className="field">
        <label htmlFor="item-quantity">ظرفیت درخواست</label>
        <input
          id="item-quantity"
          type="number"
          min={row?.committed || 0}
          max={500}
          value={value.quantity}
          onChange={(e) => setValue({ ...value, quantity: Number(e.target.value) })}
          required
        />
      </div>
      <Button disabled={pending}>ذخیرهٔ گزینه</Button>
    </form>
  );
}
