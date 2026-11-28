'use client';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Check, Heart, Plus, CarFront } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { rsvpSchema, type InvitationData, type Attendance } from '../../../../packages/shared/src';
import { Button } from './ui/button';
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
      vehicle: data.vehicle || null,
    },
  });
  const memberAnswers = useWatch({ control: form.control, name: 'members' });
  const hasAnswer = memberAnswers?.some((member) => member.status !== 'pending');
  const vehicle = useWatch({ control: form.control, name: 'vehicle' });
  const closed = data.event.status !== 'open' || Date.parse(data.event.deadline) < currentTime;
  async function submit(values: FormValues) {
    setServerError('');
    try {
      await api('/guest/rsvp', 'guest', { ...values, revision: data.household.revision });
      const next = await onSaved();
      form.reset({ ...values, requestId: crypto.randomUUID(), revision: next.household.revision });
      setSaved(true);
      toast.success('پاسخ شما ثبت شد.');
    } catch (error) {
      setServerError((error as Error).message);
    }
  }
  const coming = data.members
    .filter((member) => member.status === 'attending')
    .map((member) => member.name);
  const guestNames = new Intl.ListFormat('fa', { style: 'long', type: 'conjunction' }).format(
    coming,
  );
  if (saved)
    return (
      <div className="rsvp-card confirmation" role="status" tabIndex={-1}>
        <div className="confirmation-mark" aria-hidden="true">
          <Check size={29} strokeWidth={1.8} />
          <span>✦</span>
        </div>
        <span className="success-label">پاسخ شما ثبت شد</span>
        <h3>{coming.length ? 'قرارمان، شب یلدا.' : 'پاسختان ثبت شد.'}</h3>
        <p className="muted">
          {coming.length ? (
            <>
              منتظر دیدار <strong>{guestNames}</strong> هستیم.
              <br />
              <span className="confirmation-welcome">چه خوب که کنار همیم ❤️</span>
            </>
          ) : (
            'اگر برنامه‌تان تغییر کرد، می‌توانید پاسخ را ویرایش کنید.'
          )}
        </p>
        <div className="confirmation-actions">
          <Button asChild>
            <a href="#details">دیدن جزئیات مهمانی</a>
          </Button>
          <Button variant="outline" onClick={() => setSaved(false)}>
            ویرایش پاسخ
          </Button>
        </div>
      </div>
    );
  return (
    <div className="rsvp-card">
      {closed && (
        <div className="notice" role="status">
          مهلت پاسخ‌گویی به پایان رسیده یا رویداد بسته است. برای تغییر با میزبان تماس بگیرید.
        </div>
      )}
      <form onSubmit={form.handleSubmit(submit)} noValidate>
        <fieldset disabled={closed || form.formState.isSubmitting}>
          <legend className="sr-only">وضعیت حضور اعضای خانواده</legend>
          <div className="attendance-places">
            {data.members.map((member, index) => (
              <fieldset
                className={`attendance-place is-${memberAnswers?.[index]?.status || 'pending'}`}
                key={member.id}
              >
                <legend>
                  <span className="attendance-avatar" aria-hidden="true">
                    {member.name.slice(0, 1)}
                  </span>
                  {member.name}
                </legend>
                <div className="attendance-answers">
                  {(
                    [
                      { value: 'attending', label: 'می‌آیم', icon: '♡' },
                      { value: 'maybe', label: 'هنوز معلوم نیست', icon: '…' },
                      { value: 'declined', label: 'این بار نمی‌رسم', icon: '☾' },
                    ] as const
                  ).map((answer) => (
                    <label
                      key={answer.value}
                      className={
                        memberAnswers?.[index]?.status === answer.value ? 'answer-chosen' : ''
                      }
                    >
                      <input
                        type="radio"
                        value={answer.value}
                        {...form.register(`members.${index}.status`)}
                        aria-label={`${member.name}، ${answer.label}`}
                      />
                      <span className="answer-symbol" aria-hidden="true">
                        {answer.icon}
                      </span>
                      <span>{answer.label}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            ))}
          </div>
          <div className="vehicle-form">
            <label className="vehicle-toggle">
              <input
                type="checkbox"
                checked={vehicle != null}
                onChange={(e) =>
                  form.setValue(
                    'vehicle',
                    e.target.checked ? { brand: '', model: '', color: '', plate: '' } : null,
                    { shouldDirty: true },
                  )
                }
              />
              <CarFront size={21} aria-hidden="true" />
              با خودرو می‌آییم و پارکینگ نیاز داریم
            </label>
            <p>برای هماهنگی پارکینگ، مشخصات ماشین رو لازم داریم.</p>
            {vehicle != null && (
              <div className="vehicle-fields">
                {(
                  [
                    { key: 'brand', label: 'برند خودرو', placeholder: 'مثلاً Toyota', max: 60 },
                    { key: 'model', label: 'مدل خودرو', placeholder: 'مثلاً Corolla', max: 80 },
                    { key: 'color', label: 'رنگ خودرو', placeholder: 'مثلاً سفید', max: 40 },
                    { key: 'plate', label: 'شمارهٔ پلاک', placeholder: 'ABCD 123', max: 20 },
                  ] as const
                ).map((field) => (
                  <label key={field.key} htmlFor={`vehicle-${field.key}`}>
                    <span>{field.label}</span>
                    <input
                      id={`vehicle-${field.key}`}
                      aria-label={field.label}
                      aria-describedby={
                        form.formState.errors.vehicle?.[field.key]
                          ? `vehicle-${field.key}-error`
                          : undefined
                      }
                      {...form.register(`vehicle.${field.key}`)}
                      placeholder={field.placeholder}
                      maxLength={field.max}
                      autoComplete="off"
                      dir={field.key === 'plate' ? 'ltr' : undefined}
                      aria-invalid={Boolean(form.formState.errors.vehicle?.[field.key])}
                    />
                    <small className="error-text" id={`vehicle-${field.key}-error`}>
                      {form.formState.errors.vehicle?.[field.key]?.message}
                    </small>
                  </label>
                ))}
              </div>
            )}
          </div>
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
          <Button
            type="submit"
            className="submit-rsvp"
            disabled={form.formState.isSubmitting || !hasAnswer}
          >
            {form.formState.isSubmitting ? 'در حال ثبت…' : 'ثبت پاسخ دعوت'}
            <Heart size={18} />
          </Button>
          <p className="privacy-note">
            {hasAnswer
              ? 'بعداً هم می‌تونید پاسخ رو تغییر بدید.'
              : 'برای هر اسم، یکی از گزینه‌های بالا رو بزنید.'}
          </p>
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
