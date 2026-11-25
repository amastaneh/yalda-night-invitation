'use client';
import { api, basePath, getSession, saveSession } from '@/lib/api';
import {
  BookOpen,
  CalendarDays,
  ExternalLink,
  Gift,
  LayoutDashboard,
  LogOut,
  Plus,
  RefreshCw,
  Settings,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { eventSchema } from '../../../../packages/shared/src';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from './ui/dialog';

import { Dashboard } from './admin/dashboard';
import { EventForm, defaultEvent } from './admin/event-form';
import { GiftAdmin } from './admin/gift-manager';
import { GuestbookAdmin } from './admin/guestbook';
import { Households } from './admin/household-manager';
import type { EventRow, Overview, Section } from './admin/types';
const sections: { id: Section; label: string; Icon: typeof Users }[] = [
  { id: 'overview', label: 'نمای کلی', Icon: LayoutDashboard },
  { id: 'households', label: 'خانواده‌ها و دعوت‌ها', Icon: Users },
  { id: 'gifts', label: 'هدیه‌ها و سفره', Icon: Gift },
  { id: 'guestbook', label: 'دفتر یادگاری', Icon: BookOpen },
  { id: 'settings', label: 'تنظیمات مهمانی', Icon: Settings },
];
export function Admin() {
  const [authenticated, setAuthenticated] = useState(false);
  const [checking, setChecking] = useState(true);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [eventId, setEventId] = useState('');
  const [overview, setOverview] = useState<Overview | null>(null);
  const [section, setSection] = useState<Section>('overview');
  const [error, setError] = useState('');
  const [newEvent, setNewEvent] = useState(false);
  const refreshEvents = useCallback(async () => {
    const rows = await api<EventRow[]>('/admin/events', 'admin');
    setEvents(rows);
    setEventId((previous) => (rows.some((e) => e.id === previous) ? previous : rows[0]?.id || ''));
    return rows;
  }, []);
  const reload = useCallback(async () => {
    if (!eventId) return;
    await Promise.resolve();
    try {
      const result = await api<Overview>(`/admin/events/${eventId}/overview`, 'admin');
      setOverview(result);
      setError('');
    } catch (e) {
      setError((e as Error).message);
    }
  }, [eventId]);
  useEffect(() => {
    void Promise.resolve().then(async () => {
      if (getSession('admin')) {
        try {
          await refreshEvents();
          setAuthenticated(true);
        } catch {
          sessionStorage.removeItem('yalda-admin');
        }
      }
      setChecking(false);
    });
  }, [refreshEvents]);
  useEffect(() => {
    if (authenticated && eventId) void Promise.resolve().then(reload);
  }, [authenticated, eventId, reload]);
  const selected = events.find((e) => e.id === eventId);
  const event = selected ? eventSchema.parse(JSON.parse(selected.settings)) : null;
  async function logout() {
    try {
      await api('/auth/logout', 'admin', {});
    } finally {
      sessionStorage.removeItem('yalda-admin');
      setAuthenticated(false);
      setOverview(null);
    }
  }
  if (checking)
    return (
      <div className="admin-app admin-login" role="status">
        در حال بررسی نشست…
      </div>
    );
  if (!authenticated)
    return (
      <Login
        onSuccess={async () => {
          await refreshEvents();
          setAuthenticated(true);
        }}
      />
    );
  return (
    <div className="admin-app">
      <div className="admin-shell">
        <aside className="admin-sidebar">
          <a href={`${basePath}/`} className="wordmark">
            یلدا <span className="brand-fruit">✦</span>
          </a>
          <p>یک شب، به بهترین شکل</p>
          <nav aria-label="مدیریت مهمانی">
            {sections.map(({ id, label, Icon }) => (
              <button
                key={id}
                className={section === id ? 'active' : ''}
                onClick={() => setSection(id)}
                aria-current={section === id ? 'page' : undefined}
              >
                <Icon size={18} />
                {label}
              </button>
            ))}
          </nav>
          <div className="sidebar-bottom">
            <Button variant="ghost" asChild size="sm">
              <a href={`${basePath}/`} target="_blank">
                <ExternalLink size={16} />
                پوستهٔ دعوت‌نامه
              </a>
            </Button>
            <Button variant="ghost" size="sm" onClick={logout}>
              <LogOut size={17} />
              خروج امن
            </Button>
          </div>
        </aside>
        <main className="admin-main">
          <header className="admin-topbar">
            <div>
              <h1>{sections.find((s) => s.id === section)?.label}</h1>
              <p>{event?.title || 'اولین مهمانی خود را بسازید.'}</p>
            </div>
            <div className="admin-actions">
              <select
                aria-label="انتخاب رویداد"
                value={eventId}
                onChange={(e) => {
                  setOverview(null);
                  setEventId(e.target.value);
                }}
              >
                {events.map((row) => (
                  <option key={row.id} value={row.id}>
                    {JSON.parse(row.settings).title}
                  </option>
                ))}
              </select>
              <Button
                size="icon"
                variant="outline"
                aria-label="ساخت رویداد"
                onClick={() => setNewEvent(true)}
              >
                <Plus size={18} />
              </Button>
              <Button size="icon" variant="outline" aria-label="تازه‌سازی آمار" onClick={reload}>
                <RefreshCw size={17} />
              </Button>
            </div>
          </header>
          {error && (
            <p className="error-text" role="alert">
              {error}
            </p>
          )}
          {!events.length && (
            <div className="admin-panel empty-state">
              <CalendarDays size={40} />
              <h2>یک دورهمی تازه</h2>
              <p>ابتدا اطلاعات مهمانی را وارد کنید و بعد خانواده‌ها را دعوت کنید.</p>
              <Button onClick={() => setNewEvent(true)}>ساخت مهمانی</Button>
            </div>
          )}
          {overview && event && (
            <>
              {section === 'overview' && <Dashboard data={overview} />}{' '}
              {section === 'households' && (
                <Households data={overview} eventId={eventId} reload={reload} />
              )}{' '}
              {section === 'gifts' && (
                <GiftAdmin data={overview} eventId={eventId} reload={reload} />
              )}{' '}
              {section === 'guestbook' && (
                <GuestbookAdmin entries={overview.guestbook} reload={reload} />
              )}{' '}
              {section === 'settings' && (
                <EventForm
                  key={selected!.settings}
                  initial={event}
                  onSave={async (values) => {
                    await api(`/admin/events/${eventId}`, 'admin', values, 'PUT');
                    await refreshEvents();
                    toast.success('تنظیمات مهمانی ذخیره شد.');
                  }}
                />
              )}
            </>
          )}
          {eventId && !overview && !error && (
            <div className="empty-state" role="status">
              در حال دریافت اطلاعات مهمانی…
            </div>
          )}
        </main>
      </div>
      <Dialog open={newEvent} onOpenChange={setNewEvent}>
        <DialogContent className="admin-dialog-content">
          <DialogTitle>ساخت مهمانی جدید</DialogTitle>
          <DialogDescription>
            اطلاعات فقط پس از ورود مهمان با لینک اختصاصی دیده می‌شود.
          </DialogDescription>
          <EventForm
            initial={defaultEvent()}
            onSave={async (values) => {
              const result = await api<{ id: string }>('/admin/events', 'admin', values);
              await refreshEvents();
              setEventId(result.id);
              setNewEvent(false);
              toast.success('مهمانی ساخته شد.');
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
function Login({ onSuccess }: { onSuccess: () => Promise<void> }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  return (
    <div className="admin-app admin-login">
      <main className="login-card">
        <a className="wordmark" href={`${basePath}/`}>
          یلدا ✦
        </a>
        <h1>خوش آمدید، میزبان.</h1>
        <p>برای مدیریت دعوت‌ها و ساختن یک شب به‌یادماندنی وارد شوید.</p>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setPending(true);
            setError('');
            try {
              const result = await api<{ session: string }>('/auth/admin', 'admin', {
                username,
                password,
              });
              saveSession('admin', result.session);
              setPassword('');
              await onSuccess();
            } catch (err) {
              setError((err as Error).message);
            } finally {
              setPending(false);
            }
          }}
        >
          <div className="field">
            <label htmlFor="username">نام کاربری</label>
            <input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              required
              dir="ltr"
              maxLength={100}
            />
          </div>
          <div className="field">
            <label htmlFor="password">رمز عبور</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              dir="ltr"
              maxLength={256}
            />
          </div>
          {error && (
            <p className="error-text" role="alert">
              {error}
            </p>
          )}
          <Button type="submit" disabled={pending}>
            {pending ? 'در حال ورود…' : 'ورود به مدیریت'}
            <ShieldCheck size={17} />
          </Button>
        </form>
      </main>
    </div>
  );
}
