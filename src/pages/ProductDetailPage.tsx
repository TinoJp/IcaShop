import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Heart, Minus, Plus, Shirt, ShoppingBag, Watch } from 'lucide-react';
import { ProductCard } from '@/components/ProductCard';
import type { Lang } from '@/i18n';
import { formatTsh } from '@/utils';
import type { Product, ProductVariant } from '@/types';

type ProductDetailPageProps = {
  product: Product;
  relatedProducts: Product[];
  savedProducts: string[];
  lang: Lang;
  saved: boolean;
  onBack: () => void;
  onAdd: (product: Product, quantity?: number, variant?: ProductVariant | null) => void;
  onOpen: (product: Product) => void;
  onSave: (productId: string) => void;
};

export function ProductDetailPage({ product, relatedProducts, savedProducts, lang, onBack, onAdd, onOpen, saved, onSave }: ProductDetailPageProps) {
  const [quantity, setQuantity] = useState(1);
  const variants = useMemo(() => {
    if (product.variants && product.variants.length > 0) return product.variants;
    return [{
      id: product.id,
      product_id: product.id,
      image_url: product.image_url ?? '',
      alt_text: product.name,
      display_order: 0,
      variant_name: product.name,
      variant_price: product.sale_price ?? product.price,
      variant_stock: product.stock,
    }] satisfies ProductVariant[];
  }, [product]);
  const [selectedVariantId, setSelectedVariantId] = useState(variants[0]?.id ?? product.id);
  useEffect(() => {
    setSelectedVariantId(variants[0]?.id ?? product.id);
    setQuantity(1);
  }, [product.id, variants]);
  const selectedVariant = variants.find((variant) => variant.id === selectedVariantId) ?? variants[0];
  const currentPrice = selectedVariant?.variant_price ?? product.sale_price ?? product.price;
  const currentStock = selectedVariant?.variant_stock ?? product.stock;
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
        <div className="min-w-0 self-center">
          <div className="mb-5 flex aspect-square max-h-[34rem] items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-orange-50 to-[#FFF1E6] text-orange-400">
            {(selectedVariant?.image_url || product.image_url) ? (
              <img src={selectedVariant?.image_url || product.image_url || ''} alt={selectedVariant?.alt_text || product.name} className="h-full w-full object-contain p-4" />
            ) : visual}
          </div>
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-sm font-bold text-slate-800">Choose an option</p>
            {variants.length > 2 && <span className="text-xs text-slate-500">Swipe to see more →</span>}
          </div>
          <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain pb-3 [scrollbar-width:thin]">
            {variants.map((variant) => (
              <button
                key={variant.id}
                type="button"
                onClick={() => setSelectedVariantId(variant.id)}
                aria-pressed={selectedVariantId === variant.id}
                className={`w-[46%] min-w-[46%] snap-start overflow-hidden rounded-2xl border bg-white text-left transition sm:w-[31%] sm:min-w-[31%] ${selectedVariantId === variant.id ? 'border-orange-500 ring-2 ring-orange-200' : 'border-slate-200 hover:border-orange-300'}`}
              >
                <div className="flex aspect-[4/3] items-center justify-center overflow-hidden bg-gradient-to-br from-orange-50 to-[#FFF1E6] text-orange-400">
                  {variant.image_url ? <img src={variant.image_url} alt={variant.alt_text || variant.variant_name} className="h-full w-full object-contain" /> : visual}
                </div>
                <div className="p-3">
                  <div className="truncate text-xs font-bold text-slate-700">{variant.variant_name}</div>
                  <div className="mt-1 text-xs font-semibold text-orange-600">{formatTsh(variant.variant_price ?? product.sale_price ?? product.price)}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-col justify-center">
          <div className="flex items-center justify-between">
            <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-bold text-orange-600">
              {product.sale_price ? 'On sale' : 'Everyday favourite'}
            </span>
            <button
              onClick={() => onSave(product.id)}
              className={`rounded-full border p-3 ${saved ? 'border-orange-500 text-orange-500' : 'border-slate-200 text-slate-400'}`}
              aria-label={saved ? 'Remove from saved products' : 'Save product'}
            >
              <Heart size={20} fill={saved ? 'currentColor' : 'none'} />
            </button>
          </div>
          <h1 className="mt-5 text-3xl font-black tracking-tight sm:text-4xl">{product.name}</h1>
          {selectedVariant && (
            <div className="mt-4 rounded-xl border border-orange-100 bg-orange-50 px-3 py-2 text-sm">
              <span className="font-bold text-orange-700">Selected option:</span> {selectedVariant.variant_name}
            </div>
          )}
          <p className="mt-4 leading-7 text-slate-600">{product.description}</p>
          <div className="mt-7 flex items-baseline gap-3">
            <span className="text-2xl font-black">{formatTsh(currentPrice)}</span>
            {product.sale_price && <span className="text-sm text-slate-400 line-through">{formatTsh(product.price)}</span>}
          </div>
          <p className="mt-3 text-sm font-semibold text-orange-600">
            {currentStock > 0 ? `${currentStock} available now` : 'Currently out of stock'}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <div className="flex items-center rounded-xl border border-orange-100">
              <button onClick={() => setQuantity((value) => Math.max(1, value - 1))} className="p-3 text-slate-500" aria-label="Decrease quantity">
                <Minus size={16} />
              </button>
              <span className="w-8 text-center text-sm font-bold">{quantity}</span>
              <button
                onClick={() => setQuantity((value) => Math.min(currentStock, value + 1))}
                className="p-3 text-slate-500"
                aria-label="Increase quantity"
              >
                <Plus size={16} />
              </button>
            </div>
            <button
              onClick={() => onAdd(product, quantity, selectedVariant)}
              disabled={currentStock === 0}
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
      {relatedProducts.length > 0 && (
        <section className="mt-12">
          <div className="mb-5">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-500">{lang === 'sw' ? 'Unaweza pia kupenda' : 'You may also like'}</p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900">{lang === 'sw' ? 'Bidhaa zinazohusiana' : 'Related products'}</h2>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
            {relatedProducts.map((relatedProduct) => (
              <ProductCard
                key={relatedProduct.id}
                product={relatedProduct}
                saved={savedProducts.includes(relatedProduct.id)}
                onSave={() => onSave(relatedProduct.id)}
                onAdd={onAdd}
                onOpen={() => onOpen(relatedProduct)}
              />
            ))}
          </div>
        </section>
      )}
    </section>
  );
}
