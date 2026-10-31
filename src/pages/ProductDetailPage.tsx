import { useState } from 'react';
import { ArrowLeft, Heart, Minus, Plus, Shirt, ShoppingBag, Watch } from 'lucide-react';
import { formatTsh } from '@/utils';
import type { Product } from '@/types';

type ProductDetailPageProps = {
  product: Product;
  saved: boolean;
  onBack: () => void;
  onAdd: (quantity?: number) => void;
  onSave: () => void;
};

export function ProductDetailPage({ product, onBack, onAdd, saved, onSave }: ProductDetailPageProps) {
  const [quantity, setQuantity] = useState(1);
  const currentPrice = product.sale_price ?? product.price;
  const visual = product.name.toLowerCase().includes('watch') ? (
    <Watch size={150} strokeWidth={1} />
  ) : product.name.toLowerCase().includes('sneaker') ? (
    <Shirt size={150} strokeWidth={1} />
  ) : (
    <ShoppingBag size={150} strokeWidth={1} />
  );

  return (
    <section className="mt-10">
      <button onClick={onBack} className="mb-6 flex items-center gap-2 text-sm font-bold text-orange-600">
        <ArrowLeft size={16} /> Back to products
      </button>
      <div className="grid gap-8 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-orange-100 sm:p-8 lg:grid-cols-2">
        <div className="flex min-h-[300px] items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-orange-50 to-[#FFF1E6] text-orange-400 sm:min-h-[440px]">
          {product.image_url ? <img src={product.image_url} alt={product.name} className="h-full max-h-[540px] w-full object-cover" /> : visual}
        </div>
        <div className="flex flex-col justify-center">
          <div className="flex items-center justify-between">
            <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-bold text-orange-600">
              {product.sale_price ? 'On sale' : 'Everyday favourite'}
            </span>
            <button
              onClick={onSave}
              className={`rounded-full border p-3 ${saved ? 'border-orange-500 text-orange-500' : 'border-slate-200 text-slate-400'}`}
              aria-label={saved ? 'Remove from saved products' : 'Save product'}
            >
              <Heart size={20} fill={saved ? 'currentColor' : 'none'} />
            </button>
          </div>
          <h1 className="mt-5 text-3xl font-black tracking-tight sm:text-4xl">{product.name}</h1>
          <p className="mt-4 leading-7 text-slate-600">{product.description}</p>
          <div className="mt-7 flex items-baseline gap-3">
            <span className="text-2xl font-black">{formatTsh(currentPrice)}</span>
            {product.sale_price && <span className="text-sm text-slate-400 line-through">{formatTsh(product.price)}</span>}
          </div>
          <p className="mt-3 text-sm font-semibold text-orange-600">
            {product.stock > 0 ? `${product.stock} available now` : 'Currently out of stock'}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <div className="flex items-center rounded-xl border border-orange-100">
              <button onClick={() => setQuantity((value) => Math.max(1, value - 1))} className="p-3 text-slate-500" aria-label="Decrease quantity">
                <Minus size={16} />
              </button>
              <span className="w-8 text-center text-sm font-bold">{quantity}</span>
              <button
                onClick={() => setQuantity((value) => Math.min(product.stock, value + 1))}
                className="p-3 text-slate-500"
                aria-label="Increase quantity"
              >
                <Plus size={16} />
              </button>
            </div>
            <button
              onClick={() => onAdd(quantity)}
              disabled={product.stock === 0}
              className="flex-1 rounded-xl bg-orange-500 px-6 py-3 font-bold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              Add {quantity} to cart
            </button>
          </div>
          <div className="mt-7 grid grid-cols-2 gap-3 text-xs text-slate-500">
            <div className="rounded-xl bg-[#FAF7F4] p-3">
              <strong className="block text-slate-800">Cash on Delivery</strong>Pay when it arrives
            </div>
            <div className="rounded-xl bg-[#FAF7F4] p-3">
              <strong className="block text-slate-800">Delivery everywhere</strong>Across Tanzania
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
