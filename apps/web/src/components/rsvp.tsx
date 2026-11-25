'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Check, Heart, Plus, Users, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import {
  rsvpSchema,
  number,
  type InvitationData,
  type Attendance,
} from '../../../../packages/shared/src';
import { Button } from './ui/button';
import { Pomegranate } from './pomegranate';
type FormValues = z.infer<typeof rsvpSchema>;
export const attendanceLabels: Record<Attendance, string> = {
  pending: 'هنوز مشخص نیست',
  attending: 'می‌آیم',
  declined: 'نمی‌توانم بیایم',
  maybe: 'شاید',
};
export function Rsvp({
  data,
  onSaved,
}: {
  data: InvitationData;
  onSaved: () => Promise<InvitationData>;
}) {
  const [saved, setSaved] = useState(false);
  const [serverError, setServerError] = useState('');
  const [plusName, setPlusName] = useState('');
  const [adding, setAdding] = useState(false);
  const [currentTime] = useState(() => Date.now());
  const form = useForm<FormValues>({
    resolver: zodResolver(rsvpSchema),
    defaultValues: {
      requestId: crypto.randomUUID(),
      revision: data.household.revision,
      members: data.members.map((m) => ({ id: m.id, status: m.status })),
      ...data.response,
    },
  });
  const closed = data.event.status !== 'open' || Date.parse(data.event.deadline) < currentTime;
  async function submit(values: FormValues) {
    setServerError('');
    try {
      await api('/guest/rsvp', 'guest', values);
      const next = await onSaved();
      form.reset({ ...values, requestId: crypto.randomUUID(), revision: next.household.revision });
      setSaved(true);
      toast.success('پاسخ شما با مهر ثبت شد.');
    } catch (error) {
      setServerError((error as Error).message);
    }
  }
  if (saved)
    return (
      <div className="rsvp-card confirmation" role="status" tabIndex={-1}>
        <Pomegranate count={data.attending} celebrate />
        <span className="success-label">
          <Check size={18} />
          پاسخ شما ثبت شد
        </span>
        <h3>چه خوب که خبر دادید!</h3>
        <p className="muted">
          پاسخ {data.household.name} با مهر به دست میزبان رسید. تا پایان مهلت، می‌توانید آن را تغییر
          دهید.
        </p>
        <Button variant="outline" onClick={() => setSaved(false)}>
          ویرایش پاسخ
        </Button>
        <Button asChild variant="ghost">
          <a href="#details">دیدن جزئیات مهمانی</a>
        </Button>
      </div>
    );
  return (
    <div className="rsvp-card">
      <div className="rsvp-card-heading">
        <div>
          <span className="overline">دعوت‌نامهٔ اختصاصی شما</span>
          <h3>{data.household.name}</h3>
        </div>
        <span className="pill">
          <Users size={14} />
          {number(data.members.length)} نفر
        </span>
      </div>
      {closed && (
        <div className="notice" role="status">
          مهلت پاسخ‌گویی به پایان رسیده یا رویداد بسته است. برای تغییر با میزبان تماس بگیرید.
        </div>
      )}
      <form onSubmit={form.handleSubmit(submit)} noValidate>
        <fieldset disabled={closed || form.formState.isSubmitting}>
          <legend className="sr-only">وضعیت حضور اعضای خانواده</legend>
          <Button
            type="button"
            variant="secondary"
            className="confirm-all"
            onClick={() =>
              data.members.forEach((_, i) =>
                form.setValue(`members.${i}.status`, 'attending', { shouldDirty: true }),
              )
            }
          >
            <Check size={17} />
            همه با هم می‌آییم
          </Button>
          <div className="member-list">
            {data.members.map((member, index) => (
              <div className="member-row" key={member.id}>
                <label htmlFor={`attendance-${member.id}`}>
                  <span className="member-avatar">{member.name.slice(0, 1)}</span>
                  <span>
                    {member.name}
                    <small>
                      {member.kind === 'child' ? 'کودک' : 'بزرگسال'}
                      {member.isPlusOne ? ' · همراه' : ''}
                    </small>
                  </span>
                </label>
                <div className="select-wrap">
                  <select
                    id={`attendance-${member.id}`}
                    {...form.register(`members.${index}.status`)}
                  >
                    {Object.entries(attendanceLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={14} />
                </div>
              </div>
            ))}
          </div>
          <details className="optional-fields">
            <summary>
              ترجیح غذایی یا پیامی برای میزبان دارید؟ <ChevronDown size={17} />
            </summary>
            <div className="field">
              <label htmlFor="dietary">
                ترجیح غذایی <span>اختیاری</span>
              </label>
              <input
                id="dietary"
                maxLength={1000}
                placeholder="مثلاً گیاه‌خواری"
                {...form.register('dietary')}
              />
            </div>
            <div className="field">
              <label htmlFor="allergies">
                حساسیت غذایی <span>اختیاری</span>
              </label>
              <input
                id="allergies"
                maxLength={1000}
                placeholder="مثلاً حساسیت به مغزها"
                {...form.register('allergies')}
              />
            </div>
            <div className="field">
              <label htmlFor="message">
                پیام شما <span>اختیاری</span>
              </label>
              <textarea id="message" rows={2} maxLength={2000} {...form.register('message')} />
            </div>
            <div className="field">
              <label htmlFor="contact">
                راه تماس <span>اختیاری</span>
              </label>
              <input
                id="contact"
                maxLength={200}
                autoComplete="email"
                {...form.register('contact')}
              />
            </div>
          </details>
          {Object.keys(form.formState.errors).length > 0 && (
            <p className="error-text" role="alert">
              اطلاعات واردشده را بررسی کنید.
            </p>
          )}
          {serverError && (
            <div className="error-text" role="alert">
              {serverError}
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={async () => {
                  try {
                    const next = await onSaved();
                    form.reset({
                      ...form.getValues(),
                      revision: next.household.revision,
                      requestId: crypto.randomUUID(),
                      members: next.members.map((m) => ({ id: m.id, status: m.status })),
                    });
                    setServerError('');
                  } catch (e) {
                    toast.error((e as Error).message);
                  }
                }}
              >
                تازه‌سازی پاسخ
              </Button>
            </div>
          )}
          <Button type="submit" className="submit-rsvp" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? 'در حال ثبت…' : 'ثبت پاسخ دعوت'}
            <Heart size={18} />
          </Button>
          <p className="privacy-note">فقط میزبان پاسخ شما را می‌بیند. انتخاب هدیه لازم نیست.</p>
        </fieldset>
      </form>
      {data.members.filter((m) => m.isPlusOne).length < data.household.plusOnes && !closed && (
        <form
          className="plus-one"
          onSubmit={async (e) => {
            e.preventDefault();
            setAdding(true);
            try {
              await api('/guest/plus-one', 'guest', { name: plusName, kind: 'adult' });
              const next = await onSaved();
              form.reset({
                ...form.getValues(),
                revision: next.household.revision,
                requestId: crypto.randomUUID(),
                members: next.members.map((m) => ({ id: m.id, status: m.status })),
              });
              setPlusName('');
              toast.success('همراه اضافه شد. وضعیت حضورش را انتخاب کنید.');
            } catch (err) {
              toast.error((err as Error).message);
            } finally {
              setAdding(false);
            }
          }}
        >
          <label htmlFor="plus-name">دوست دارید یک همراه بیاورید؟</label>
          <div className="inline-form">
            <input
              id="plus-name"
              value={plusName}
              onChange={(e) => setPlusName(e.target.value)}
              placeholder="نام همراه"
              required
              maxLength={100}
            />
            <Button
              size="icon"
              variant="outline"
              type="submit"
              aria-label="افزودن همراه"
              disabled={adding}
            >
              <Plus size={18} />
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
