import { useState, type FormEvent } from 'react';
import { ArrowLeft, CheckCircle2, Loader2, MessageCircle, ShoppingBag } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { siteConfig } from '@/siteConfig';
import { formatTsh, isTanzanianPhone, normalizeTanzanianPhone } from '@/utils';
import type { CartItem, OrderRow, Profile } from '@/types';

type CheckoutProps = {
  items: CartItem[];
  subtotal: number;
  profile: Profile | null;
  deliveryFee: number;
  freeDeliveryThreshold: number;
  onBack: () => void;
  onPlaced: (order: OrderRow, whatsappUrl: string) => void;
};

export function Checkout({ items, subtotal, profile, deliveryFee, freeDeliveryThreshold, onBack, onPlaced }: CheckoutProps) {
  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [address, setAddress] = useState(profile?.address ?? '');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const effectiveDeliveryFee = subtotal >= freeDeliveryThreshold ? 0 : deliveryFee;
  const grandTotal = subtotal + effectiveDeliveryFee;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError('');

    const trimmedName = fullName.trim();
    const normalizedPhone = normalizeTanzanianPhone(phone.trim());
    const trimmedAddress = address.trim();

    if (!trimmedName) {
      setFormError('Please enter your full name.');
      return;
    }
    if (!isTanzanianPhone(normalizedPhone)) {
      setFormError('Enter a valid Tanzanian mobile number, such as 0712 345 678.');
      return;
    }
    if (!trimmedAddress) {
      setFormError('Please enter your delivery address.');
      return;
    }

    // Open the tab directly from the submit click so the browser does not block
    // WhatsApp after the asynchronous order request completes.
    const whatsappTab = window.open('', '_blank');
    setSubmitting(true);
    try {
      const payload = items.map((item) => ({
        product_id: item.product.id,
        variant_id: item.variant?.id ?? null,
        quantity: item.quantity,
      }));

      const { data, error } = await supabase.rpc('place_ica_order', {
        p_items: payload,
        p_customer_name: trimmedName,
        p_customer_phone: normalizedPhone,
        p_delivery_address: trimmedAddress,
        p_notes: notes.trim(),
      });

      if (error) throw new Error(error.message);

      // Read the order-line snapshots written by the checkout RPC so the
      // WhatsApp message uses the prices the server actually charged.
      const { data: orderItems } = await supabase
        .from('order_items')
        .select('product_name, variant_name, unit_price, quantity, line_total')
        .eq('order_id', data.order_id)
        .order('created_at');

      const orderLines = orderItems?.length
        ? orderItems.map((item) => `• ${item.product_name}${item.variant_name ? ` (${item.variant_name})` : ''} × ${item.quantity} — ${formatTsh(item.line_total)} (${formatTsh(item.unit_price)} each)`)
        : items.map((item) => `• ${item.product.name} × ${item.quantity}`).join('\n');
      const orderReference = String(data.order_id).slice(0, 8).toUpperCase();
      const message = [
        'Hello iCa, I have placed an order through the website.',
        '',
        `Order: #${orderReference}`,
        `Customer: ${trimmedName}`,
        `Phone: ${normalizedPhone}`,
        `Delivery address: ${trimmedAddress}`,
        '',
        'Items:',
        orderLines,
        '',
        `Subtotal: ${formatTsh(data.total_amount)}`,
        `Delivery fee: ${Number(data.delivery_fee) === 0 ? 'Free' : formatTsh(data.delivery_fee)}`,
        `Total: ${formatTsh(data.grand_total)}`,
        'Payment: Cash on Delivery',
        ...(notes.trim() ? [`Order notes: ${notes.trim()}`] : []),
        '',
        'Please confirm this order and delivery with me here on WhatsApp.',
      ].join('\n');
      const whatsappNumber = siteConfig.whatsapp.replace(/\D/g, '');
      const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;

      const order: OrderRow = {
        id: data.order_id,
        status: 'pending',
        total_amount: data.total_amount,
        delivery_fee: data.delivery_fee,
        grand_total: data.grand_total,
        customer_name: trimmedName,
        customer_phone: normalizedPhone,
        delivery_address: trimmedAddress,
        payment_method: 'cod',
        notes: notes.trim(),
        created_at: new Date().toISOString(),
      };
      onPlaced(order, whatsappUrl);
      if (whatsappTab) whatsappTab.location.href = whatsappUrl;
    } catch (cause) {
      whatsappTab?.close();
      setFormError(cause instanceof Error ? cause.message : 'We could not place your order. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="mt-8">
      <button onClick={onBack} className="mb-5 flex items-center gap-2 text-sm font-bold text-orange-600">
        <ArrowLeft size={16} /> Back to cart
      </button>

      <div className="mb-6">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-500">Checkout</p>
        <h1 className="mt-1 text-3xl font-black tracking-tight">Complete your order</h1>
        <p className="mt-2 text-sm text-slate-500">Pay with Cash on Delivery. Your items are reserved when you place the order.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <form onSubmit={handleSubmit} className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-orange-100 sm:p-8">
          <h2 className="text-lg font-black">Delivery details</h2>
          <div className="mt-5 space-y-5">
            <label className="block text-sm font-bold">
              Full name
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
              />
            </label>
            <label className="block text-sm font-bold">
              Phone number
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 0712 345 678"
                required
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
              />
            </label>
            <label className="block text-sm font-bold">
              Delivery address
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                rows={3}
                placeholder="Street, area, city, region"
                required
                className="mt-2 w-full resize-none rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
              />
            </label>
            <label className="block text-sm font-bold">
              Order notes <span className="font-normal text-slate-400">(optional)</span>
              <input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Landmark, delivery time preference, etc."
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
              />
            </label>
          </div>

          <div className="mt-6 rounded-2xl bg-[#FAF7F4] p-4">
            <div className="flex items-center gap-2 text-sm font-bold">
              <ShoppingBag size={16} className="text-orange-500" /> Cash on Delivery
            </div>
            <p className="mt-1 text-xs text-slate-500">Pay in cash when your order arrives at your door.</p>
          </div>

          {formError && <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">{formError}</p>}

          <button
            disabled={submitting}
            className="mt-6 w-full rounded-xl bg-orange-500 py-3.5 font-bold text-white transition hover:bg-orange-600 disabled:bg-slate-300"
          >
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 size={18} className="animate-spin" /> Placing your order…
              </span>
            ) : (
              `Place order · ${formatTsh(grandTotal)}`
            )}
          </button>
        </form>

        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-orange-100 sm:p-8">
          <h2 className="text-lg font-black">Order summary</h2>
          <ul className="mt-5 space-y-3">
            {items.map((item) => {
              const unitPrice = item.variant?.variant_price ?? item.product.sale_price ?? item.product.price;
              return (
                <li key={`${item.product.id}:${item.variant?.id ?? 'base'}`} className="flex items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-orange-50 to-[#FFF1E6] text-orange-400">
                    {item.variant?.image_url ? <img src={item.variant.image_url} alt={item.variant.alt_text} className="h-full w-full rounded-lg object-cover" /> : <ShoppingBag size={20} strokeWidth={1.2} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold">{item.product.name}</p>
                    {item.variant && <p className="text-[11px] text-orange-600">{item.variant.variant_name}</p>}
                    <p className="text-xs text-slate-500">Qty {item.quantity} · {formatTsh(unitPrice)}</p>
                  </div>
                  <span className="shrink-0 text-sm font-black">{formatTsh(unitPrice * item.quantity)}</span>
                </li>
              );
            })}
          </ul>

          <div className="mt-5 space-y-2 border-t border-orange-100 pt-4 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-600">Items subtotal</span>
              <span className="font-bold">{formatTsh(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Delivery fee</span>
              <span className="font-bold">
                {effectiveDeliveryFee === 0 ? <span className="text-emerald-600">Free</span> : formatTsh(effectiveDeliveryFee)}
              </span>
            </div>
            {subtotal < freeDeliveryThreshold && (
              <p className="text-xs text-slate-400">
                Add {formatTsh(freeDeliveryThreshold - subtotal)} more for free delivery.
              </p>
            )}
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-orange-100 pt-4">
            <span className="font-black">Total</span>
            <span className="text-xl font-black text-orange-600">{formatTsh(grandTotal)}</span>
          </div>
        </div>
      </div>
    </section>
  );
}

export function OrderConfirmation({ order, whatsappUrl, onContinue }: { order: OrderRow; whatsappUrl: string; onContinue: () => void }) {
  return (
    <section className="mt-8 flex flex-col items-center text-center">
      <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
        <CheckCircle2 size={44} className="text-emerald-600" />
      </div>
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-500">Order placed</p>
      <h1 className="mt-2 text-3xl font-black tracking-tight">Thank you for your order!</h1>
      <p className="mt-3 max-w-md text-sm text-slate-500">
        Thank you for shopping with iCa! Your order is pending while our team reviews it. We have also sent this update to your account notifications. WhatsApp opens with the full order details ready; tap Send to deliver them to our team.
      </p>

      <div className="mt-8 w-full max-w-md rounded-3xl bg-white p-6 text-left shadow-sm ring-1 ring-orange-100 sm:p-8">
        <div className="flex items-center justify-between border-b border-orange-100 pb-4">
          <span className="text-xs font-bold uppercase tracking-wide text-slate-400">Order number</span>
          <span className="text-sm font-black">{order.id.slice(0, 8).toUpperCase()}</span>
        </div>
        <div className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-600">Items subtotal</span>
            <span className="font-bold">{formatTsh(order.total_amount)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-600">Delivery fee</span>
            <span className="font-bold">{order.delivery_fee === 0 ? <span className="text-emerald-600">Free</span> : formatTsh(order.delivery_fee)}</span>
          </div>
          <div className="flex justify-between border-t border-orange-100 pt-2">
            <span className="font-black">Total</span>
            <span className="text-lg font-black text-orange-600">{formatTsh(order.grand_total)}</span>
          </div>
        </div>
        <div className="mt-4 rounded-xl bg-[#FAF7F4] p-3 text-sm">
          <p className="font-bold">Delivering to</p>
          <p className="mt-1 text-slate-600">{order.customer_name}</p>
          <p className="text-slate-600">{order.delivery_address}</p>
        </div>
      </div>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <a href={whatsappUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3.5 font-bold text-white transition hover:bg-emerald-700">
          <MessageCircle size={18} /> Send order on WhatsApp
        </a>
        <button onClick={onContinue} className="rounded-xl border border-orange-200 bg-white px-6 py-3.5 font-bold text-slate-700 transition hover:bg-orange-50">
        Continue shopping
        </button>
      </div>
    </section>
  );
}
