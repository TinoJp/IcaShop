import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, MessageCircle, Phone, Search, ShoppingBag, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatTsh, orderStatusLabels, orderStatusStyles } from '@/utils';
import type { OrderStatus, OrderWithItems } from '@/types';
import { ConfirmDialog } from '@/components/ConfirmDialog';

const transitions: Partial<Record<OrderStatus, OrderStatus[]>> = { pending: ['delivered', 'cancelled'] };
const nextLabel: Partial<Record<OrderStatus, string>> = { delivered: 'Mark delivered', cancelled: 'Cancel order' };
const phoneLink = (phone: string) => phone.replace(/[^0-9+]/g, '');

export function AdminOrders() {
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<'selected' | 'all' | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error: loadError } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .order('created_at', { ascending: false });
    if (loadError) setError('Could not load orders. Please check admin access and try again.');
    else {
      setError('');
      setOrders((data ?? []) as OrderWithItems[]);
      setSelectedIds((current) => current.filter((id) => (data ?? []).some((order) => order.id === id)));
    }
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const updateStatus = async (id: string, status: OrderStatus) => {
    setUpdating(id);
    setError('');
    const { error: updateError } = await supabase.from('orders').update({ status }).eq('id', id);
    if (updateError) setError(`Could not update order: ${updateError.message}`);
    else setOrders((items) => items.map((order) => order.id === id ? { ...order, status } : order));
    setUpdating(null);
  };

  const filtered = useMemo(
    () => orders.filter((order) =>
      (filter === 'all' || (filter === 'paid' ? order.payment_status === 'paid' : order.status === filter))
      && `${order.id} ${order.customer_name} ${order.customer_phone}`.toLowerCase().includes(query.trim().toLowerCase()),
    ),
    [orders, filter, query],
  );

  const toggleSelected = (id: string) => {
    setSelectedIds((current) => current.includes(id)
      ? current.filter((selectedId) => selectedId !== id)
      : [...current, id]);
  };

  const toggleVisible = () => {
    const visibleIds = filtered.map((order) => order.id);
    const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));
    setSelectedIds((current) => allVisibleSelected
      ? current.filter((id) => !visibleIds.includes(id))
      : [...new Set([...current, ...visibleIds])]);
  };

  const deleteOrders = async () => {
    if (!deleteConfirm) return;
    setDeleting(true);
    setError('');
    const orderIds = deleteConfirm === 'all' ? null : selectedIds;
    const { error: deleteError } = await supabase.rpc('admin_delete_ica_orders', { p_order_ids: orderIds });
    if (deleteError) {
      setError(`Could not delete orders: ${deleteError.message}`);
    } else {
      setDeleteConfirm(null);
      setSelectedIds([]);
      setExpanded(null);
      await load();
    }
    setDeleting(false);
  };

  if (loading) return <div className="mt-8 space-y-3">{[1, 2, 3].map((item) => <div key={item} className="h-24 animate-pulse rounded-2xl bg-orange-100" />)}</div>;

  return (
    <div className="mt-2">
      <div className="mb-6">
        <p className="text-xs font-bold uppercase tracking-[.18em] text-orange-500">Admin</p>
        <h1 className="mt-1 text-3xl font-black tracking-tight">Orders</h1>
        <p className="mt-2 text-sm text-slate-500">Review orders, contact customers, mark delivery and record payment.</p>
      </div>
      {error && <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}
      <div className="mb-3 flex flex-wrap gap-3 rounded-2xl border border-orange-100 bg-white p-3">
        <label className="flex min-w-56 flex-1 items-center gap-2 rounded-xl border px-3">
          <Search size={17} className="text-orange-600" />
          <input aria-label="Search orders" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Order, customer or phone" className="w-full py-2 text-sm outline-none" />
        </label>
        <select aria-label="Filter order status" value={filter} onChange={(event) => setFilter(event.target.value)} className="rounded-xl border bg-white px-3 py-2 text-sm font-semibold">
          <option value="all">All statuses</option>
          {(['pending', 'delivered', 'cancelled'] as OrderStatus[]).map((status) => <option key={status} value={status}>{orderStatusLabels[status]}</option>)}
          <option value="paid">Paid</option>
        </select>
        <button onClick={() => void load()} className="rounded-xl bg-orange-50 px-4 py-2 text-sm font-bold text-orange-700">Refresh</button>
      </div>
      {orders.length > 0 && (
        <div className="mb-5 flex flex-wrap items-center gap-2 rounded-2xl border border-orange-100 bg-white p-3">
          <button onClick={toggleVisible} className="rounded-xl border px-3 py-2 text-sm font-bold">
            {filtered.length > 0 && filtered.every((order) => selectedIds.includes(order.id)) ? 'Deselect visible' : 'Select visible'}
          </button>
          <span className="mr-auto text-sm text-slate-500">{selectedIds.length} selected</span>
          <button disabled={!selectedIds.length || deleting} onClick={() => setDeleteConfirm('selected')} className="inline-flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-sm font-bold text-red-700 disabled:opacity-50">
            <Trash2 size={16} /> Delete selected
          </button>
          <button disabled={deleting} onClick={() => setDeleteConfirm('all')} className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-3 py-2 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50">
            <Trash2 size={16} /> Clear all orders
          </button>
        </div>
      )}
      {!filtered.length
        ? <div className="flex flex-col items-center rounded-3xl border border-dashed border-orange-200 bg-white p-12 text-center"><ShoppingBag size={36} className="mb-3 text-orange-300" /><p className="text-lg font-black">{orders.length ? 'No matching orders' : 'No orders yet'}</p><p className="mt-1 text-sm text-slate-500">Customer orders will appear here.</p></div>
        : <div className="space-y-3">
          {filtered.map((order) => {
            const isOpen = expanded === order.id;
            const available = transitions[order.status] ?? [];
            return (
              <article key={order.id} className="rounded-2xl bg-white shadow-sm ring-1 ring-orange-100">
                <div className="flex items-center gap-3 px-4">
                  <input
                    type="checkbox"
                    aria-label={`Select order ${order.id.slice(0, 8)}`}
                    checked={selectedIds.includes(order.id)}
                    onChange={() => toggleSelected(order.id)}
                    className="h-4 w-4 accent-orange-600"
                  />
                  <button onClick={() => setExpanded(isOpen ? null : order.id)} className="flex min-w-0 flex-1 items-center justify-between gap-3 py-4 text-left">
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-3">
                        <b className="text-sm">#{order.id.slice(0, 8).toUpperCase()}</b>
                        <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${orderStatusStyles[order.status]}`}>{orderStatusLabels[order.status]}</span>
                        <span className="text-xs text-slate-500">{order.payment_status === 'paid' ? 'Paid' : 'Unpaid'}</span>
                      </span>
                      <span className="mt-1 block truncate text-sm text-slate-500">{order.customer_name} · {order.customer_phone} · {new Date(order.created_at).toLocaleDateString('en-TZ')} · <b className="text-slate-800">{formatTsh(order.grand_total)}</b></span>
                    </span>
                    {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </button>
                </div>
                {isOpen && (
                  <div className="border-t border-orange-100 px-5 py-4">
                    <div className="grid gap-5 sm:grid-cols-2">
                      <section className="text-sm">
                        <p className="font-bold">Customer and delivery</p>
                        <p className="mt-2 text-slate-700">{order.customer_name}</p>
                        <p className="text-slate-600">{order.customer_phone || 'No phone provided'}</p>
                        <p className="mt-1 text-slate-600">{order.delivery_address}</p>
                        {order.customer_phone && <div className="mt-3 flex gap-2">
                          <a href={`tel:${phoneLink(order.customer_phone)}`} className="inline-flex items-center gap-2 rounded-lg bg-orange-50 px-3 py-2 text-xs font-bold text-orange-700"><Phone size={14} />Call</a>
                          <a target="_blank" rel="noreferrer" href={`https://wa.me/${phoneLink(order.customer_phone).replace(/^\+/, '')}?text=${encodeURIComponent(`Hello ${order.customer_name}, regarding order ${order.id.slice(0, 8).toUpperCase()}.`)}`} className="inline-flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700"><MessageCircle size={14} />WhatsApp</a>
                        </div>}
                        {order.notes && <p className="mt-3 text-xs text-slate-500">Note: {order.notes}</p>}
                      </section>
                      <section className="text-sm">
                        <p className="font-bold">Items</p>
                        <ul className="mt-2 space-y-1">{order.order_items.map((item) => <li key={item.id} className="flex justify-between gap-3"><span className="text-slate-600">{item.product_name} × {item.quantity}</span><b>{formatTsh(item.line_total)}</b></li>)}</ul>
                        <div className="mt-3 space-y-1 border-t pt-2 text-xs">
                          <p className="flex justify-between text-slate-500"><span>Subtotal</span><span>{formatTsh(order.total_amount)}</span></p>
                          <p className="flex justify-between text-slate-500"><span>Delivery</span><span>{order.delivery_fee ? formatTsh(order.delivery_fee) : 'Free'}</span></p>
                          <p className="flex justify-between text-sm font-black"><span>Total</span><span className="text-orange-600">{formatTsh(order.grand_total)}</span></p>
                        </div>
                      </section>
                    </div>
                    <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-orange-100 pt-4">
                      <span className="mr-2 text-xs font-bold uppercase tracking-wide text-slate-400">Order actions</span>
                      {available.map((status) => <button key={status} disabled={updating === order.id} onClick={() => void updateStatus(order.id, status)} className={`rounded-full px-3 py-2 text-xs font-bold disabled:opacity-50 ${status === 'cancelled' ? 'bg-red-50 text-red-700 hover:bg-red-100' : 'bg-orange-500 text-white hover:bg-orange-600'}`}>{nextLabel[status]}</button>)}
                      {order.status !== 'cancelled' && order.payment_status !== 'paid' && <button disabled={updating === order.id} onClick={async () => {
                        setUpdating(order.id);
                        const { error: paymentError } = await supabase.from('orders').update({ payment_status: 'paid' }).eq('id', order.id);
                        if (paymentError) {
                          const missingPaymentColumn = paymentError.code === 'PGRST204' || paymentError.message.includes('payment_status');
                          setError(missingPaymentColumn ? 'Payment tracking is not enabled yet. Apply the latest Supabase migration, then refresh.' : `Could not mark payment paid: ${paymentError.message}`);
                        } else setOrders((items) => items.map((item) => item.id === order.id ? { ...item, payment_status: 'paid' } : item));
                        setUpdating(null);
                      }} className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 disabled:opacity-50">Mark paid</button>}
                      {!available.length && order.payment_status === 'paid' && <span className="text-xs text-slate-500">No further status actions.</span>}
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>}
      {deleteConfirm && <ConfirmDialog
        title={deleteConfirm === 'all' ? 'Delete every order?' : 'Delete selected orders?'}
        message={deleteConfirm === 'all'
          ? 'This permanently deletes every order and its items. This cannot be undone.'
          : `This permanently deletes ${selectedIds.length} selected order${selectedIds.length === 1 ? '' : 's'} and their items. This cannot be undone.`}
        confirmLabel={deleteConfirm === 'all' ? 'Delete all orders' : 'Delete selected'}
        busyLabel="Deleting…"
        busy={deleting}
        onCancel={() => setDeleteConfirm(null)}
        onConfirm={() => void deleteOrders()}
      />}
    </div>
  );
}
