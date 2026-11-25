'use client';
import { api, basePath, download } from '@/lib/api';
import { Copy, Download, Plus, RefreshCw, Share2, Trash2 } from 'lucide-react';
import Papa from 'papaparse';
import { useState } from 'react';
import { toast } from 'sonner';
import { z } from 'zod';
import { householdSchema, number, type Attendance } from '../../../../../packages/shared/src';
import { attendanceLabels } from '../rsvp';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../ui/dialog';

import type { Guest, Household, Overview } from './types';
export function Households({
  data,
  eventId,
  reload,
}: {
  data: Overview;
  eventId: string;
  reload: () => Promise<void>;
}) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('name');
  const [editing, setEditing] = useState<Household | 'new' | null>(null);
  const [sharing, setSharing] = useState<Household | null>(null);
  const [link, setLink] = useState('');
  const [pending, setPending] = useState(false);
  const [importing, setImporting] = useState(false);
  const filtered = data.households
    .filter((h) => {
      const members = data.members.filter((m) => m.household_id === h.id);
      return (
        (h.name.includes(query) || members.some((m) => m.name.includes(query))) &&
        (filter === 'all' || members.some((m) => m.status === filter))
      );
    })
    .sort((a, b) =>
      sort === 'name'
        ? a.name.localeCompare(b.name, 'fa')
        : data.members.filter((g) => g.household_id === b.id).length -
          data.members.filter((g) => g.household_id === a.id).length,
    );
  return (
    <>
      <div className="admin-toolbar">
        <input
          aria-label="جست‌وجوی مهمان"
          placeholder="جست‌وجوی خانواده یا مهمان…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select aria-label="فیلتر وضعیت" value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="all">همهٔ پاسخ‌ها</option>
          {Object.entries(attendanceLabels).map(([v, l]) => (
            <option value={v} key={v}>
              {l}
            </option>
          ))}
        </select>
        <select aria-label="مرتب‌سازی" value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="name">نام خانواده</option>
          <option value="size">تعداد مهمان</option>
        </select>
        <Button size="sm" onClick={() => setEditing('new')}>
          <Plus size={16} />
          خانوادهٔ جدید
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={async () => {
            try {
              const csv = await api<string>(`/admin/events/${eventId}/export`, 'admin');
              download(csv, 'text/csv;charset=utf-8', 'yalda-guests.csv');
            } catch (e) {
              toast.error((e as Error).message);
            }
          }}
        >
          <Download size={16} />
          خروجی اکسل / CSV
        </Button>
        <Button size="sm" variant="outline" onClick={() => setImporting(true)}>
          ورود CSV
        </Button>
      </div>
      <div className="admin-panel">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>خانواده</th>
                <th>اعضا و پاسخ‌ها</th>
                <th>همراه مجاز</th>
                <th>انار</th>
                <th>مدیریت</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((h) => (
                <tr key={h.id}>
                  <td>
                    <strong>{h.name}</strong>
                    <small className="muted" style={{ display: 'block' }}>
                      {number(data.members.filter((m) => m.household_id === h.id).length)} نفر
                    </small>
                  </td>
                  <td>
                    {data.members
                      .filter((g) => g.household_id === h.id)
                      .map((g) => (
                        <div key={g.id} style={{ marginBottom: '.4rem' }}>
                          {g.name}{' '}
                          <span className={`status-pill status-${g.status}`}>
                            {attendanceLabels[g.status]}
                          </span>
                        </div>
                      ))}
                  </td>
                  <td>{number(h.plusOnes)}</td>
                  <td>{number(h.pomegranates)}</td>
                  <td>
                    <div className="admin-actions">
                      <Button variant="outline" size="sm" onClick={() => setEditing(h)}>
                        ویرایش
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSharing(h);
                          setLink('');
                        }}
                      >
                        لینک دعوت
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`حذف ${h.name}`}
                        onClick={async () => {
                          if (!window.confirm(`خانوادهٔ ${h.name} و تمام اطلاعات مرتبط حذف شود؟`))
                            return;
                          try {
                            await api(`/admin/households/${h.id}`, 'admin', {}, 'DELETE');
                            await reload();
                            toast.success('خانواده حذف شد.');
                          } catch (e) {
                            toast.error((e as Error).message);
                          }
                        }}
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!filtered.length && <div className="empty-state">خانواده‌ای با این مشخصات پیدا نشد.</div>}
      </div>
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="admin-dialog-content">
          <DialogTitle>
            {editing === 'new' ? 'یک خانوادهٔ تازه' : 'ویرایش خانواده و پاسخ‌ها'}
          </DialogTitle>
          <DialogDescription>
            فقط اعضای همین خانواده در لینک اختصاصی نمایش داده می‌شوند.
          </DialogDescription>
          {editing && (
            <HouseholdForm
              key={editing === 'new' ? 'new' : editing.id}
              household={editing === 'new' ? undefined : editing}
              members={
                editing === 'new' ? [] : data.members.filter((g) => g.household_id === editing.id)
              }
              onSave={async (values) => {
                await api(
                  editing === 'new'
                    ? `/admin/events/${eventId}/households`
                    : `/admin/households/${editing.id}`,
                  'admin',
                  values,
                  editing === 'new' ? 'POST' : 'PUT',
                );
                setEditing(null);
                await reload();
                toast.success('خانواده ذخیره شد.');
              }}
            />
          )}
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!sharing}
        onOpenChange={(o) => {
          if (!o) {
            setSharing(null);
            setLink('');
          }
        }}
      >
        <DialogContent className="admin-dialog-content">
          <DialogTitle>دعوتِ {sharing?.name}</DialogTitle>
          <DialogDescription>
            لینک خصوصی را فقط با همین خانواده به اشتراک بگذارید. هر لینک جدید، لینک قبلی و نشست‌های
            آن را لغو می‌کند.
          </DialogDescription>
          <Button
            style={{ marginTop: '1.5rem' }}
            disabled={pending}
            onClick={async () => {
              if (!sharing) return;
              setPending(true);
              try {
                const r = await api<{ token: string }>(
                  `/admin/households/${sharing.id}/token`,
                  'admin',
                  {},
                );
                setLink(`${location.origin}${basePath}/invite/?token=${r.token}`);
                toast.success('لینک جدید ساخته شد.');
              } catch (e) {
                toast.error((e as Error).message);
              } finally {
                setPending(false);
              }
            }}
          >
            <RefreshCw size={16} />
            ساخت / بازسازی لینک خصوصی
          </Button>
          {link && (
            <div className="link-output">
              <input
                aria-label="لینک خصوصی دعوت"
                value={link}
                readOnly
                dir="ltr"
                onFocus={(e) => e.target.select()}
              />
              <p>این لینک فقط اکنون نمایش داده می‌شود؛ پیش از بستن، کپی کنید.</p>
              <div className="admin-actions">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    await navigator.clipboard.writeText(link);
                    toast.success('لینک کپی شد.');
                  }}
                >
                  <Copy size={15} />
                  کپی
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <a
                    target="_blank"
                    rel="noreferrer"
                    href={`https://wa.me/?text=${encodeURIComponent('دعوت شب یلدا\n' + link)}`}
                  >
                    WhatsApp
                  </a>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <a
                    target="_blank"
                    rel="noreferrer"
                    href={`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent('دعوت شب یلدا')}`}
                  >
                    Telegram
                  </a>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={async () => {
                    if (navigator.share) {
                      try {
                        await navigator.share({ title: 'دعوت شب یلدا', url: link });
                      } catch {}
                    } else toast.message('از کپی لینک استفاده کنید.');
                  }}
                >
                  <Share2 size={16} />
                  اشتراک
                </Button>
              </div>
            </div>
          )}
          <div className="danger-zone">
            <h3>لغو دسترسی</h3>
            <p className="muted">برای از اعتبار انداختن لینک فعلی و نشست‌های آن:</p>
            <Button
              variant="destructive"
              size="sm"
              onClick={async () => {
                if (!sharing) return;
                try {
                  await api(`/admin/households/${sharing.id}/revoke`, 'admin', {});
                  setLink('');
                  toast.success('دعوت‌نامه لغو شد.');
                } catch (e) {
                  toast.error((e as Error).message);
                }
              }}
            >
              لغو لینک فعلی
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={importing} onOpenChange={setImporting}>
        <DialogContent className="admin-dialog-content">
          <DialogTitle>ورود خانواده‌ها از CSV</DialogTitle>
          <DialogDescription>
            ابتدا قالب را دریافت کنید. هر سطر یک مهمان است؛ نام یکسان خانواده در یک دعوت گروه‌بندی
            می‌شود.
          </DialogDescription>
          <ImportGuests
            eventId={eventId}
            onDone={async () => {
              await reload();
              setImporting(false);
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
type HouseholdInput = z.infer<typeof householdSchema>;
function HouseholdForm({
  household,
  members,
  onSave,
}: {
  household?: Household;
  members: Guest[];
  onSave: (h: HouseholdInput) => Promise<void>;
}) {
  const [value, setValue] = useState<HouseholdInput>({
    name: household?.name || '',
    greeting: household?.greeting || '',
    plusOnes: household?.plusOnes || 0,
    members: members.length
      ? members.map((m) => ({ id: m.id, name: m.name, kind: m.kind, status: m.status }))
      : [{ name: '', kind: 'adult', status: 'pending' }],
  });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setPending(true);
        setError('');
        try {
          await onSave(householdSchema.parse(value));
        } catch (err) {
          setError(
            err instanceof z.ZodError
              ? 'نام خانواده و تمام اعضا را کامل کنید.'
              : (err as Error).message,
          );
        } finally {
          setPending(false);
        }
      }}
    >
      <div className="field">
        <label htmlFor="household-name">نام خانواده</label>
        <input
          id="household-name"
          value={value.name}
          onChange={(e) => setValue({ ...value, name: e.target.value })}
          required
          maxLength={120}
        />
      </div>
      <div className="field">
        <label htmlFor="household-greeting">پیام اختصاصی</label>
        <textarea
          id="household-greeting"
          value={value.greeting}
          onChange={(e) => setValue({ ...value, greeting: e.target.value })}
          maxLength={300}
          rows={2}
        />
      </div>
      <div className="field">
        <label htmlFor="plus-allowance">تعداد همراه مجاز</label>
        <input
          id="plus-allowance"
          type="number"
          min={0}
          max={5}
          value={value.plusOnes}
          onChange={(e) => setValue({ ...value, plusOnes: Number(e.target.value) })}
        />
      </div>
      <h3>اعضای خانواده</h3>
      {value.members.map((m, i) => (
        <div className="member-editor" key={i}>
          <input
            aria-label={`نام مهمان ${i + 1}`}
            value={m.name}
            onChange={(e) =>
              setValue({
                ...value,
                members: value.members.map((g, j) =>
                  j === i ? { ...g, name: e.target.value } : g,
                ),
              })
            }
            required
            maxLength={100}
          />
          <select
            aria-label={`نوع مهمان ${i + 1}`}
            value={m.kind}
            onChange={(e) =>
              setValue({
                ...value,
                members: value.members.map((g, j) =>
                  j === i ? { ...g, kind: e.target.value as 'adult' | 'child' } : g,
                ),
              })
            }
          >
            <option value="adult">بزرگسال</option>
            <option value="child">کودک</option>
          </select>
          <select
            aria-label={`وضعیت مهمان ${i + 1}`}
            value={m.status}
            onChange={(e) =>
              setValue({
                ...value,
                members: value.members.map((g, j) =>
                  j === i ? { ...g, status: e.target.value as Attendance } : g,
                ),
              })
            }
          >
            {Object.entries(attendanceLabels).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
          <Button
            type="button"
            variant="ghost"
            aria-label={`حذف مهمان ${i + 1}`}
            disabled={value.members.length === 1}
            onClick={() => setValue({ ...value, members: value.members.filter((_, j) => j !== i) })}
          >
            <Trash2 size={16} />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={value.members.length >= 20}
        onClick={() =>
          setValue({
            ...value,
            members: [...value.members, { name: '', kind: 'adult', status: 'pending' }],
          })
        }
      >
        <Plus size={16} />
        افزودن عضو
      </Button>
      {error && (
        <p className="error-text" role="alert">
          {error}
        </p>
      )}
      <div className="settings-save" style={{ marginTop: '1.5rem' }}>
        <Button type="submit" disabled={pending}>
          ذخیرهٔ خانواده
        </Button>
      </div>
    </form>
  );
}
function ImportGuests({ eventId, onDone }: { eventId: string; onDone: () => Promise<void> }) {
  const [rows, setRows] = useState<HouseholdInput[]>([]);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  return (
    <>
      <Button
        style={{ marginTop: '1rem' }}
        variant="outline"
        size="sm"
        onClick={() =>
          download(
            '\uFEFFhousehold,guest,kind,plusOnes\r\nخانواده نمونه,مهمان نمونه,adult,0\r\nخانواده نمونه,کودک نمونه,child,0\r\n',
            'text/csv;charset=utf-8',
            'guest-import-template.csv',
          )
        }
      >
        دریافت قالب CSV
      </Button>
      <div className="import-file">
        <label htmlFor="import-file">انتخاب فایل</label>
        <input
          id="import-file"
          type="file"
          accept=".csv,text/csv"
          onChange={async (e) => {
            setRows([]);
            setError('');
            const file = e.target.files?.[0];
            if (!file) return;
            if (file.size > 64000) {
              setError('فایل باید کمتر از ۶۴ کیلوبایت باشد.');
              return;
            }
            try {
              const parsed = Papa.parse<Record<string, string>>(await file.text(), {
                header: true,
                skipEmptyLines: true,
                transformHeader: (h) => h.replace(/^\uFEFF/, '').trim(),
              });
              if (parsed.errors.length) throw new Error('ساختار CSV معتبر نیست.');
              const grouped = new Map<string, HouseholdInput>();
              for (const row of parsed.data) {
                if (!row.household || !row.guest)
                  throw new Error('ستون‌های household و guest الزامی‌اند.');
                const h = grouped.get(row.household) || {
                  name: row.household,
                  greeting: '',
                  plusOnes: Number(row.plusOnes || 0),
                  members: [],
                };
                h.members.push({
                  name: row.guest,
                  kind: row.kind === 'child' ? 'child' : 'adult',
                  status: 'pending',
                });
                grouped.set(row.household, h);
              }
              setRows(
                z
                  .array(householdSchema)
                  .min(1)
                  .max(100)
                  .parse([...grouped.values()]),
              );
            } catch (err) {
              setError(
                err instanceof z.ZodError
                  ? 'تعداد یا اطلاعات اعضا معتبر نیست.'
                  : (err as Error).message,
              );
            }
          }}
        />
      </div>
      {error && (
        <p className="error-text" role="alert">
          {error}
        </p>
      )}
      {rows.length > 0 && (
        <>
          <p>
            {number(rows.length)} خانواده، {number(rows.reduce((n, h) => n + h.members.length, 0))}{' '}
            مهمان آمادهٔ ورود.
          </p>
          <p className="muted">
            هر بار ثبت، خانواده‌های جدید ایجاد می‌کند. نام‌های موجود ادغام نمی‌شوند.
          </p>
          <ul>
            {rows.slice(0, 6).map((h) => (
              <li key={h.name}>
                {h.name} · {number(h.members.length)} نفر
              </li>
            ))}
          </ul>
          <Button
            disabled={pending}
            onClick={async () => {
              setPending(true);
              try {
                await api(`/admin/events/${eventId}/import`, 'admin', rows);
                await onDone();
                toast.success('خانواده‌ها وارد شدند.');
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setPending(false);
              }
            }}
          >
            ثبت خانواده‌های پیش‌نمایش
          </Button>
        </>
      )}
    </>
  );
}
