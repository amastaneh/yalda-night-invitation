'use client';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { Button } from '../ui/button';

import type { BookEntry } from './types';
export function GuestbookAdmin({
  entries,
  reload,
}: {
  entries: BookEntry[];
  reload: () => Promise<void>;
}) {
  return (
    <section className="admin-panel">
      <h2>یادگاری‌ها و آرزوها</h2>
      <p className="muted">
        فقط پیام‌های تأییدشده، بدون نام خانواده برای مهمان‌ها نمایش داده می‌شوند.
      </p>
      {entries.map((g) => (
        <article className="admin-receipt-row" key={g.id}>
          <div>
            <h3>{g.household_name}</h3>
            <p>{g.message}</p>
            <small>{g.approved ? 'منتشرشده بدون نام' : 'در انتظار بررسی'}</small>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              try {
                await api(`/admin/guestbook/${g.id}`, 'admin', { approved: !g.approved }, 'PUT');
                await reload();
              } catch (e) {
                toast.error((e as Error).message);
              }
            }}
          >
            {g.approved ? 'برداشتن تأیید' : 'تأیید انتشار'}
          </Button>
        </article>
      ))}
      {!entries.length && <p className="empty-state">هنوز یادگاری‌ای ثبت نشده است.</p>}
    </section>
  );
}
