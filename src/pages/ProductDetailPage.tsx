import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight, Heart, Minus, Plus, Shirt, ShoppingBag, Truck, Watch } from 'lucide-react';
import { ProductCard } from '@/components/ProductCard';
import type { Lang } from '@/i18n';
import { siteConfig } from '@/siteConfig';
import { formatTsh } from '@/utils';
import type { Product, ProductVariant } from '@/types';

type ProductDetailPageProps = {
  product: Product;
  relatedProducts: Product[];
  savedProducts: string[];
  lang: Lang;
  categoryName: string;
  deliveryFee: number;
  freeDeliveryThreshold: number;
  saved: boolean;
  onBack: () => void;
  onAdd: (product: Product, quantity?: number, variant?: ProductVariant | null) => void;
  onOpen: (product: Product) => void;
  onSave: (productId: string) => void;
};

export function ProductDetailPage({ product, relatedProducts, savedProducts, lang, categoryName, deliveryFee, freeDeliveryThreshold, onBack, onAdd, onOpen, saved, onSave }: ProductDetailPageProps) {
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
  const relatedTrackRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    setSelectedVariantId(variants[0]?.id ?? product.id);
    setQuantity(1);
  }, [product.id, variants]);
  const selectedVariant = variants.find((variant) => variant.id === selectedVariantId) ?? variants[0];
  const selectedVariantIndex = Math.max(0, variants.findIndex((variant) => variant.id === selectedVariant?.id));
  const currentPrice = selectedVariant?.variant_price ?? product.sale_price ?? product.price;
  const currentStock = selectedVariant?.variant_stock ?? product.stock;
  const visual = product.name.toLowerCase().includes('watch') ? (
    <Watch size={150} strokeWidth={1} />
  ) : product.name.toLowerCase().includes('sneaker') ? (
    <Shirt size={150} strokeWidth={1} />
  ) : (
    <ShoppingBag size={150} strokeWidth={1} />
  );
  const selectVariant = (variant: ProductVariant) => {
    setSelectedVariantId(variant.id);
    setQuantity((value) => variant.variant_stock > 0 ? Math.min(value, variant.variant_stock) : 1);
  };
  const moveGallery = (direction: -1 | 1) => {
    const nextIndex = (selectedVariantIndex + direction + variants.length) % variants.length;
    selectVariant(variants[nextIndex]);
  };
  const addSelectedToCart = () => onAdd(product, quantity, selectedVariant);
  const supportMessage = lang === 'sw'
    ? `Nina swali kuhusu ${product.name}, muda wa uwasilishaji au masharti ya marejesho.`
    : `I have a question about ${product.name}, delivery timing, or return eligibility.`;
  const supportUrl = `https://wa.me/${siteConfig.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(supportMessage)}`;

  return (
    <section className="mt-10">
      <button onClick={onBack} className="mb-6 flex items-center gap-2 text-sm font-bold text-orange-600">
        <ArrowLeft size={16} /> Back to products
      </button>
      <div className="grid gap-8 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-orange-100 sm:p-8 lg:grid-cols-2">
        <div className="min-w-0 self-center">
          <div className="relative mb-4 flex aspect-square max-h-[34rem] items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-orange-50 to-[#FFF1E6] text-orange-400">
            {(selectedVariant?.image_url || product.image_url) ? (
              <img src={selectedVariant?.image_url || product.image_url || ''} alt={selectedVariant?.alt_text || product.name} className="h-full w-full object-contain p-4" />
            ) : visual}
            {variants.length > 1 && (
              <>
                <button type="button" onClick={() => moveGallery(-1)} aria-label="Show previous product image" className="absolute left-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-slate-700 shadow transition hover:bg-white">
                  <ChevronLeft size={22} />
                </button>
                <button type="button" onClick={() => moveGallery(1)} aria-label="Show next product image" className="absolute right-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-slate-700 shadow transition hover:bg-white">
                  <ChevronRight size={22} />
                </button>
                <span className="absolute bottom-3 right-3 rounded-full bg-slate-900/65 px-2.5 py-1 text-xs font-semibold text-white">
                  {selectedVariantIndex + 1} / {variants.length}
                </span>
              </>
            )}
          </div>
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-sm font-bold text-slate-800">{lang === 'sw' ? 'Chagua picha au chaguo' : 'Choose an image or option'}</p>
            {variants.length > 3 && <span className="text-xs text-slate-500">{lang === 'sw' ? 'Telezesha kuona zaidi →' : 'Swipe to see more →'}</span>}
          </div>
          <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain pb-3 [scrollbar-width:thin]">
            {variants.map((variant) => (
              <button
                key={variant.id}
                type="button"
                onClick={() => selectVariant(variant)}
                aria-pressed={selectedVariantId === variant.id}
                className={`w-28 min-w-28 snap-start overflow-hidden rounded-xl border bg-white text-left transition ${selectedVariantId === variant.id ? 'border-orange-500 ring-2 ring-orange-200' : 'border-slate-200 hover:border-orange-300'}`}
              >
                <div className="flex aspect-square items-center justify-center overflow-hidden bg-gradient-to-br from-orange-50 to-[#FFF1E6] text-orange-400">
                  {variant.image_url ? <img src={variant.image_url} alt="" className="h-full w-full object-contain p-1" /> : visual}
                </div>
                <div className="p-2">
                  <div className="truncate text-[11px] font-bold text-slate-700">{variant.variant_name}</div>
                  <div className="mt-0.5 truncate text-[10px] font-semibold text-orange-600">{formatTsh(variant.variant_price ?? product.sale_price ?? product.price)}</div>
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
              onClick={addSelectedToCart}
              disabled={currentStock === 0}
              className="hidden flex-1 rounded-xl bg-orange-500 px-6 py-3 font-bold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-slate-300 lg:block"
            >
              Add {quantity} to cart
            </button>
          </div>
        </div>
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-orange-100">
          <h2 className="text-lg font-black text-slate-900">{lang === 'sw' ? 'Maelezo ya bidhaa' : 'Product details'}</h2>
          <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-600">{product.description || (lang === 'sw' ? 'Hakuna maelezo ya ziada.' : 'No additional description available.')}</p>
          <dl className="mt-4 divide-y divide-slate-100 border-t border-slate-100 text-sm">
            <div className="flex justify-between gap-4 py-3"><dt className="text-slate-500">{lang === 'sw' ? 'Kategoria' : 'Category'}</dt><dd className="text-right font-semibold text-slate-800">{categoryName || (lang === 'sw' ? 'Bidhaa' : 'Product')}</dd></div>
            <div className="flex justify-between gap-4 py-3"><dt className="text-slate-500">{lang === 'sw' ? 'Chaguo' : 'Selected option'}</dt><dd className="text-right font-semibold text-slate-800">{selectedVariant?.variant_name || product.name}</dd></div>
            <div className="flex justify-between gap-4 py-3"><dt className="text-slate-500">{lang === 'sw' ? 'Upatikanaji' : 'Availability'}</dt><dd className="text-right font-semibold text-slate-800">{currentStock > 0 ? (lang === 'sw' ? 'Inapatikana' : `${currentStock} in stock`) : (lang === 'sw' ? 'Haipo kwa sasa' : 'Out of stock')}</dd></div>
          </dl>
        </section>
        <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-orange-100">
          <h2 className="text-lg font-black text-slate-900">{lang === 'sw' ? 'Uwasilishaji na msaada' : 'Delivery & support'}</h2>
          <div className="mt-4 flex gap-3 rounded-xl bg-orange-50 p-4">
            <Truck size={20} className="mt-0.5 shrink-0 text-orange-600" />
            <div className="text-sm">
              <p className="font-bold text-slate-800">{lang === 'sw' ? 'Uwasilishaji Tanzania nzima' : 'Delivery across Tanzania'}</p>
              <p className="mt-1 text-slate-600">{lang === 'sw' ? `Ada ya uwasilishaji: ${formatTsh(deliveryFee)}. Bure kwa oda za ${formatTsh(freeDeliveryThreshold)} au zaidi.` : `Delivery fee: ${formatTsh(deliveryFee)}. Free for orders of ${formatTsh(freeDeliveryThreshold)} or more.`}</p>
              <p className="mt-1 text-slate-500">{lang === 'sw' ? 'Muda wa kufika utathibitishwa wakati wa kupanga uwasilishaji.' : 'Delivery timing can be confirmed when arranging your order.'}</p>
            </div>
          </div>
          <p className="mt-4 text-sm leading-6 text-slate-600">{lang === 'sw' ? 'Una swali kuhusu muda wa uwasilishaji au masharti ya marejesho? Wasiliana nasi kabla ya kuagiza.' : 'Questions about delivery timing or return eligibility? Contact us before ordering.'}</p>
          <a href={supportUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex rounded-xl border border-orange-200 px-4 py-2.5 text-sm font-bold text-orange-700 transition hover:bg-orange-50">
            {lang === 'sw' ? 'Uliza WhatsApp' : 'Ask us on WhatsApp'}
          </a>
        </section>
      </div>
      {relatedProducts.length > 0 && (
        <section className="mt-12">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-500">{lang === 'sw' ? 'Unaweza pia kupenda' : 'You may also like'}</p>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900">{lang === 'sw' ? 'Bidhaa zinazohusiana' : 'Related products'}</h2>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => relatedTrackRef.current?.scrollBy({ left: -280, behavior: 'smooth' })} aria-label="Scroll related products left" className="grid h-10 w-10 place-items-center rounded-full border border-orange-100 bg-white text-slate-700 shadow-sm hover:border-orange-300"><ChevronLeft size={20} /></button>
              <button type="button" onClick={() => relatedTrackRef.current?.scrollBy({ left: 280, behavior: 'smooth' })} aria-label="Scroll related products right" className="grid h-10 w-10 place-items-center rounded-full border border-orange-100 bg-white text-slate-700 shadow-sm hover:border-orange-300"><ChevronRight size={20} /></button>
            </div>
          </div>
          <div ref={relatedTrackRef} className="flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain pb-4 [scrollbar-width:thin] sm:gap-5">
            {relatedProducts.map((relatedProduct) => (
              <div key={relatedProduct.id} className="w-[72%] min-w-[72%] snap-start sm:w-[44%] sm:min-w-[44%] lg:w-[calc(25%-1rem)] lg:min-w-[calc(25%-1rem)]">
                <ProductCard
                  product={relatedProduct}
                  saved={savedProducts.includes(relatedProduct.id)}
                  onSave={() => onSave(relatedProduct.id)}
                  onAdd={onAdd}
                  onOpen={() => onOpen(relatedProduct)}
                />
              </div>
            ))}
          </div>
        </section>
      )}
      <div className="fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-40 border-t border-orange-100 bg-white/95 p-3 shadow-[0_-8px_24px_rgba(15,23,42,0.12)] backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-7xl items-center gap-3">
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-slate-500">{selectedVariant?.variant_name || product.name}</p>
            <p className="text-base font-black text-slate-900">{formatTsh(currentPrice)}</p>
          </div>
          <button type="button" onClick={addSelectedToCart} disabled={currentStock === 0} className="ml-auto flex-1 rounded-xl bg-orange-500 px-4 py-3 text-sm font-bold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-slate-300">
            {currentStock === 0 ? (lang === 'sw' ? 'Haipo kwa sasa' : 'Out of stock') : (lang === 'sw' ? `Ongeza ${quantity} kwenye kikapu` : `Add ${quantity} to cart`)}
          </button>
        </div>
      </div>
    </section>
  );
}
