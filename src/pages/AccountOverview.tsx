import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Clock, Heart, Package } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatTsh, orderStatusLabels, orderStatusStyles } from '@/utils';
import type { OrderRow, Profile } from '@/types';

type OrderSummary = Pick<OrderRow, 'id' | 'status' | 'grand_total' | 'created_at'>;

type AccountOverviewProps = {
  profile: Profile | null;
  savedCount: number;
};

function StatCard({ to, icon, label, value }: { to: string; icon: ReactNode; label: string; value: string }) {
  return (
    <Link
      to={to}
      className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-orange-100 transition hover:-translate-y-0.5 hover:ring-orange-300"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-500">{icon}</div>
      <p className="mt-4 text-3xl font-black tracking-tight">{value}</p>
      <p className="mt-1 text-sm font-semibold text-slate-500">{label}</p>
    </Link>
  );
}

export function AccountOverview({ profile, savedCount }: AccountOverviewProps) {
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const userId = profile?.id;

  useEffect(() => {
    // No profile yet: nothing to load.
    if (!userId) {
      setOrders([]);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError('');

      // Only this customer's orders. RLS should enforce the same rule on the database side.
      // If your orders column is not called user_id, change it here.
      const { data, error: queryError } = await supabase
        .from('orders')
        .select('id, status, grand_total, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (cancelled) return;

      if (queryError) {
        setError('We could not load your orders right now.');
      } else {
        setOrders((data ?? []) as OrderSummary[]);
      }
      setLoading(false);
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const pendingCount = orders.filter((order) => order.status === 'pending').length;
  const recentOrders = orders.slice(0, 3);
  const firstName = profile?.full_name?.split(' ')[0];
  const detailsMissing = !profile?.phone || !profile?.address;

  return (
    <section>
      <div className="mb-6">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-500">My account</p>
        <h1 className="mt-1 text-3xl font-black tracking-tight">
          Welcome back{firstName ? `, ${firstName}` : ''}.
        </h1>
        <p className="mt-2 text-sm text-slate-500">Here is a quick look at your orders and saved items.</p>
      </div>

      {detailsMissing && (
        <Link
          to="/account/profile"
          className="mb-6 flex items-center justify-between gap-3 rounded-2xl border border-orange-200 bg-orange-50 p-4 text-sm font-semibold text-orange-700 transition hover:bg-orange-100"
        >
          <span>Add your phone number and delivery address so checkout is faster.</span>
          <ArrowRight size={16} className="shrink-0" />
        </Link>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard to="/account/orders" icon={<Package size={20} />} label="Total orders" value={loading ? '–' : String(orders.length)} />
        <StatCard to="/account/orders" icon={<Clock size={20} />} label="Pending orders" value={loading ? '–' : String(pendingCount)} />
        <StatCard to="/account/saved" icon={<Heart size={20} />} label="Saved items" value={String(savedCount)} />
      </div>

      <div className="mt-8 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-orange-100 sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-black">Recent orders</h2>
          {orders.length > 0 && (
            <Link to="/account/orders" className="flex items-center gap-1 text-sm font-bold text-orange-600">
              View all <ArrowRight size={15} />
            </Link>
          )}
        </div>

        {loading ? (
          <div className="space-y-3">
            <div className="h-14 animate-pulse rounded-xl bg-orange-100" />
            <div className="h-14 animate-pulse rounded-xl bg-orange-100" />
          </div>
        ) : error ? (
          <p className="rounded-xl bg-red-50 p-4 text-sm text-red-600">{error}</p>
        ) : recentOrders.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-orange-200 p-8 text-center">
            <p className="font-black">No orders yet</p>
            <p className="mt-1 text-sm text-slate-500">When you place your first order, it will appear here.</p>
            <Link
              to="/products"
              className="mt-4 inline-flex rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-orange-600"
            >
              Start shopping
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-orange-100">
            {recentOrders.map((order) => (
              <li key={order.id}>
                <Link to="/account/orders" className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div>
                    <p className="text-sm font-black">Order {order.id.slice(0, 8).toUpperCase()}</p>
                    <p className="text-xs text-slate-500">
                      {new Date(order.created_at).toLocaleDateString('en-TZ', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${orderStatusStyles[order.status] ?? 'bg-slate-100 text-slate-600'}`}>
                      {orderStatusLabels[order.status] ?? order.status}
                    </span>
                    <span className="text-sm font-black text-orange-600">{formatTsh(order.grand_total)}</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}