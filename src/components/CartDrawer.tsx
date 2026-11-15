import { Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react';
import type { CartItem, ProductVariant } from '@/types';
import { formatTsh } from '@/utils';

type CartDrawerProps = {
  open: boolean;
  items: CartItem[];
  subtotal: number;
  onClose: () => void;
  onQuantity: (productId: string, quantity: number, variant?: ProductVariant | null) => void;
  onRemove: (productId: string, variant?: ProductVariant | null) => void;
  onCheckout: () => void;
};

export function CartDrawer({ open, items, subtotal, onClose, onQuantity, onRemove, onCheckout }: CartDrawerProps) {
  return (
    <>
      {open && <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={onClose} />}
      <aside
        className={`fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col bg-white shadow-2xl transition-transform duration-300 ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
        aria-label="Shopping cart"
      >
        <div className="flex items-center justify-between border-b border-orange-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <ShoppingBag size={20} className="text-orange-500" />
            <h2 className="text-lg font-black">Your cart</h2>
            <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-bold text-orange-600">
              {items.length}
            </span>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 hover:bg-orange-50" aria-label="Close cart">
            <X size={20} />
          </button>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
            <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-orange-50">
              <ShoppingBag size={36} className="text-orange-300" />
            </div>
            <p className="text-lg font-bold">Your cart is empty</p>
            <p className="mt-1 text-sm text-slate-500">Browse the catalogue and add a few finds.</p>
            <button onClick={onClose} className="mt-6 rounded-xl bg-orange-500 px-5 py-3 text-sm font-bold text-white transition hover:bg-orange-600">
              Continue shopping
            </button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-5 py-4">
              <ul className="space-y-4">
                {items.map((item) => {
                  const variantPrice = item.variant?.variant_price ?? item.product.sale_price ?? item.product.price;
                  const stockLimit = item.variant?.variant_stock ?? item.product.stock;
                  return (
                    <li key={`${item.product.id}:${item.variant?.id ?? 'base'}`} className="flex gap-3 rounded-2xl bg-[#FAF7F4] p-3">
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-orange-100 to-[#FFF1E6] text-orange-400">
                        {item.variant?.image_url ? <img src={item.variant.image_url} alt={item.variant.alt_text} className="h-full w-full rounded-xl object-cover" /> : <ShoppingBag size={28} strokeWidth={1.2} />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold">{item.product.name}</p>
                        {item.variant && <p className="text-[11px] font-semibold text-orange-600">{item.variant.variant_name}</p>}
                        <p className="mt-0.5 text-sm font-black text-orange-600">{formatTsh(variantPrice)}</p>
                        <div className="mt-2 flex items-center gap-2">
                          <div className="flex items-center rounded-lg border border-orange-100 bg-white">
                            <button
                              onClick={() => onQuantity(item.product.id, item.quantity - 1, item.variant ?? null)}
                              className="p-1.5 text-slate-500 hover:text-orange-600"
                              aria-label="Decrease quantity"
                            >
                              <Minus size={14} />
                            </button>
                            <span className="w-7 text-center text-sm font-bold">{item.quantity}</span>
                            <button
                              onClick={() => onQuantity(item.product.id, item.quantity + 1, item.variant ?? null)}
                              disabled={item.quantity >= stockLimit}
                              className="p-1.5 text-slate-500 hover:text-orange-600 disabled:opacity-30"
                              aria-label="Increase quantity"
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                          <button
                            onClick={() => onRemove(item.product.id, item.variant ?? null)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500"
                            aria-label="Remove from cart"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-black">{formatTsh(variantPrice * item.quantity)}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="border-t border-orange-100 px-5 py-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-600">Subtotal</span>
                <span className="text-lg font-black">{formatTsh(subtotal)}</span>
              </div>
              <p className="mb-4 text-xs text-slate-400">Delivery fee calculated at checkout. Cash on Delivery available.</p>
              <button
                onClick={onCheckout}
                className="w-full rounded-xl bg-orange-500 py-3.5 font-bold text-white transition hover:bg-orange-600"
              >
                Proceed to checkout
              </button>
            </div>
          </>
        )}
      </aside>
    </>
  );
}
