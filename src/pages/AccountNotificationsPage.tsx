import { useCallback, useEffect, useState } from 'react';
import { Bell, Check, CheckCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type CustomerNotification = {
  id: string;
  order_id: string;
  status: 'pending' | 'cancelled' | 'delivered';
  message: string;
  is_read: boolean;
  created_at: string;
};

const statusStyles: Record<CustomerNotification['status'], string> = {
  pending: 'bg-amber-100 text-amber-700',
  cancelled: 'bg-red-100 text-red-700',
  delivered: 'bg-emerald-100 text-emerald-700',
};

export function AccountNotificationsPage() {
  const [notifications, setNotifications] = useState<CustomerNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const loadNotifications = useCallback(async () => {
    setError('');
    const { data, error: queryError } = await supabase
      .from('customer_notifications')
      .select('id, order_id, status, message, is_read, created_at')
      .order('created_at', { ascending: false });

    if (queryError) {
      setError(`We could not load your notifications: ${queryError.message}`);
    } else {
      setNotifications((data ?? []) as CustomerNotification[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  const markRead = async (ids: string[]) => {
    if (!ids.length) return;
    setSaving(true);
    setError('');
    const { error: updateError } = await supabase
      .from('customer_notifications')
      .update({ is_read: true })
      .in('id', ids);
    if (updateError) {
      setError(`We could not update your notifications: ${updateError.message}`);
    } else {
      setNotifications((current) => current.map((notification) =>
        ids.includes(notification.id) ? { ...notification, is_read: true } : notification,
      ));
      window.dispatchEvent(new Event('ica:notifications-changed'));
    }
    setSaving(false);
  };

  const unreadIds = notifications.filter((notification) => !notification.is_read).map((notification) => notification.id);

  return (
    <section className="mt-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-500">Updates</p>
          <h1 className="mt-1 text-3xl font-black tracking-tight">Notifications</h1>
          <p className="mt-2 text-sm text-slate-500">Order confirmations and status updates from iCa.</p>
        </div>
        {unreadIds.length > 0 && (
          <button
            type="button"
            disabled={saving}
            onClick={() => void markRead(unreadIds)}
            className="inline-flex items-center gap-2 rounded-xl border border-orange-200 px-4 py-2.5 text-sm font-bold text-orange-600 hover:bg-orange-50 disabled:opacity-50"
          >
            <CheckCheck size={17} /> Mark all as read
          </button>
        )}
      </div>

      {error && <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</p>}

      {loading ? (
        <div className="h-36 animate-pulse rounded-2xl bg-orange-100" />
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center rounded-3xl border border-dashed border-orange-200 bg-white p-12 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-orange-50">
            <Bell size={30} className="text-orange-400" />
          </div>
          <p className="font-black">No notifications yet</p>
          <p className="mt-1 text-sm text-slate-500">We will let you know when you place an order or its status changes.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {notifications.map((notification) => (
            <li
              key={notification.id}
              className={`flex items-start gap-4 rounded-2xl p-5 shadow-sm ring-1 ring-orange-100 ${notification.is_read ? 'bg-white' : 'bg-orange-50/70'}`}
            >
              <div className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${statusStyles[notification.status]}`}>
                <Bell size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-black">Order #{notification.order_id.slice(0, 8).toUpperCase()}</p>
                  <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold capitalize ${statusStyles[notification.status]}`}>
                    {notification.status}
                  </span>
                  {!notification.is_read && <span className="h-2 w-2 rounded-full bg-orange-500" aria-label="Unread" />}
                </div>
                <p className="mt-1 text-sm leading-6 text-slate-600">{notification.message}</p>
                <p className="mt-2 text-xs text-slate-400">
                  {new Date(notification.created_at).toLocaleString('en-TZ', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                </p>
              </div>
              {!notification.is_read && (
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void markRead([notification.id])}
                  aria-label="Mark notification as read"
                  className="rounded-lg p-2 text-slate-400 hover:bg-white hover:text-orange-600 disabled:opacity-50"
                >
                  <Check size={18} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
