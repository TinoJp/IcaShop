import { Heart, ShoppingBag, Shirt, Star, Watch } from 'lucide-react';
import { formatTsh } from '@/utils';
import type { Product } from '@/types';

type ProductCardProps = {
  product: Product;
  saved: boolean;
  onSave: () => void;
  onAdd: (product: Product, quantity?: number) => void;
  onOpen: () => void;
};

export function ProductCard({ product, saved, onSave, onAdd, onOpen }: ProductCardProps) {
  const categoryVisual = product.name.toLowerCase().includes('watch') ? (
    <Watch size={70} strokeWidth={1.2} />
  ) : product.name.toLowerCase().includes('sneaker') ? (
    <Shirt size={70} strokeWidth={1.2} />
  ) : (
    <ShoppingBag size={70} strokeWidth={1.2} />
  );

  return (
    <article className="group overflow-hidden rounded-xl bg-white p-2 shadow-sm ring-1 ring-slate-100 transition hover:-translate-y-1 hover:shadow-xl hover:shadow-orange-500/10 sm:rounded-2xl sm:p-3 lg:p-4">
      <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-orange-50 to-[#FFF1E6] text-orange-400">
        <button onClick={onOpen} className="absolute inset-0 grid h-full w-full place-items-center transition duration-500 group-hover:scale-105" aria-label={`View ${product.name}`}>
          {product.image_url ? <img src={product.image_url} alt={product.name} loading="lazy" className="h-full w-full object-cover" /> : categoryVisual}
        </button>
        {product.sale_price && (
          <span className="absolute left-1.5 top-1.5 rounded-md bg-orange-500 px-1.5 py-1 text-[9px] font-bold text-white sm:left-2 sm:top-2 sm:px-2 sm:text-[10px]">SALE</span>
        )}
        <button
          onClick={onSave}
          className={`absolute right-1.5 top-1.5 rounded-full bg-white p-1.5 shadow-sm transition hover:scale-105 sm:right-2 sm:top-2 sm:p-2 ${saved ? 'text-orange-500' : 'text-slate-400'}`}
          aria-label={saved ? `Remove ${product.name} from saved products` : `Save ${product.name}`}
        >
          <Heart size={14} className="sm:h-4 sm:w-4" fill={saved ? 'currentColor' : 'none'} />
        </button>
      </div>
      <div className="px-0.5 pt-2.5 sm:px-1 sm:pt-4">
        <button onClick={onOpen} className="w-full truncate text-left text-xs font-bold hover:text-orange-600 sm:text-sm">
          {product.name}
        </button>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-[13px] font-black sm:text-base">{formatTsh(product.sale_price ?? product.price)}</span>
          {product.sale_price && <span className="text-[9px] text-slate-400 line-through sm:text-[11px]">{formatTsh(product.price)}</span>}
        </div>
        <div className="mt-1.5 flex items-center gap-1 text-[9px] text-orange-500 sm:mt-2 sm:text-[11px]">
          <Star size={10} fill="currentColor" /> <span className="truncate text-slate-400">Ready to ship</span>
        </div>
        <button
          onClick={() => onAdd(product)}
          className="mt-3 w-full rounded-lg bg-orange-500 py-2 text-[10px] font-bold text-white transition hover:bg-orange-600 focus:outline-none focus:ring-4 focus:ring-orange-200 sm:mt-4 sm:rounded-xl sm:py-2.5 sm:text-xs"
        >
          Add to cart
        </button>
      </div>
    </article>
  );
}
