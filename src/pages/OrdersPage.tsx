import { useEffect, useState } from 'react';
import { Package, ShoppingBag } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatTsh, orderStatusLabels, orderStatusStyles } from '@/utils';
import type { OrderWithItems } from '@/types';

export function OrdersPage() {
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      const { data, error: queryError } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .order('created_at', { ascending: false });

      if (queryError) {
        setError('We could not load your orders right now. Please try again.');
      } else {
        setOrders((data ?? []) as OrderWithItems[]);
      }
      setLoading(false);
    };
    void load();
  }, []);

  if (loading) {
    return (
      <div className="mt-10 space-y-4">
        <div className="h-40 animate-pulse rounded-2xl bg-orange-100" />
        <div className="h-40 animate-pulse rounded-2xl bg-orange-100" />
      </div>
    );
  }

  if (error) {
    return <div className="mt-10 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</div>;
  }

  if (orders.length === 0) {
    return (
      <div className="mt-10 flex flex-col items-center rounded-3xl border border-dashed border-orange-200 bg-white p-12 text-center">
        <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-orange-50">
          <Package size={36} className="text-orange-300" />
        </div>
        <p className="text-lg font-black">No orders yet</p>
        <p className="mt-1 text-sm text-slate-500">When you place your first order, it will appear here.</p>
      </div>
    );
  }

  return (
    <section className="mt-8">
      <div className="mb-6">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-500">Order history</p>
        <h1 className="mt-1 text-3xl font-black tracking-tight">My orders</h1>
        <p className="mt-2 text-sm text-slate-500">{orders.length} order{orders.length === 1 ? '' : 's'} placed.</p>
      </div>

      <div className="space-y-5">
        {orders.map((order) => (
          <div key={order.id} className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-orange-100 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-orange-100 pb-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Order {order.id.slice(0, 8).toUpperCase()}</p>
                <p className="mt-1 text-sm text-slate-500">
                  {new Date(order.created_at).toLocaleDateString('en-TZ', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${orderStatusStyles[order.status] ?? 'bg-slate-100 text-slate-600'}`}>
                {orderStatusLabels[order.status] ?? order.status}
              </span>
            </div>

            <ul className="mt-4 space-y-3">
              {order.order_items.map((item) => (
                <li key={item.id} className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-orange-50 to-[#FFF1E6] text-orange-400">
                    <ShoppingBag size={18} strokeWidth={1.2} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold">{item.product_name}</p>
                    <p className="text-xs text-slate-500">Qty {item.quantity} · {formatTsh(item.unit_price)}</p>
                  </div>
                  <span className="shrink-0 text-sm font-black">{formatTsh(item.line_total)}</span>
                </li>
              ))}
            </ul>

            <div className="mt-4 flex flex-wrap items-end justify-between gap-3 border-t border-orange-100 pt-4">
              <div className="text-sm text-slate-500">
                <p className="font-semibold text-slate-700">{order.customer_name}</p>
                <p>{order.delivery_address}</p>
                <p className="mt-1 text-xs">Cash on Delivery</p>
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between gap-4">
                  <span className="text-slate-500">Subtotal</span>
                  <span className="font-bold">{formatTsh(order.total_amount)}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-slate-500">Delivery</span>
                  <span className="font-bold">{order.delivery_fee === 0 ? <span className="text-emerald-600">Free</span> : formatTsh(order.delivery_fee)}</span>
                </div>
                <div className="flex justify-between gap-4 border-t border-orange-100 pt-1">
                  <span className="font-black">Total</span>
                  <span className="font-black text-orange-600">{formatTsh(order.grand_total)}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
