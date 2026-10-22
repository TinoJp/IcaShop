import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { ProductCard } from '@/components/ProductCard';
import type { Product } from '@/types';

type SavedPageProps = {
  products: Product[];
  loading: boolean;
  onSave: (id: string) => void;
  onAdd: (product: Product, quantity?: number) => void;
  onOpen: (product: Product) => void;
};

export function SavedPage({ products, loading, onSave, onAdd, onOpen }: SavedPageProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-3 gap-2 sm:gap-4 lg:grid-cols-4">
        <div className="h-72 animate-pulse rounded-2xl bg-orange-100" />
        <div className="h-72 animate-pulse rounded-2xl bg-orange-100" />
        <div className="hidden h-72 animate-pulse rounded-2xl bg-orange-100 md:block" />
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center rounded-3xl border border-dashed border-orange-200 bg-white p-12 text-center">
        <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-orange-50">
          <Heart size={36} className="text-orange-300" />
        </div>
        <p className="text-lg font-black">No saved items yet</p>
        <p className="mt-1 text-sm text-slate-500">Tap the heart on any product to keep it here for later.</p>
        <Link
          to="/products"
          className="mt-5 inline-flex rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-orange-600"
        >
          Browse products
        </Link>
      </div>
    );
  }

  return (
    <section>
      <div className="mb-6">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-500">Wishlist</p>
        <h1 className="mt-1 text-3xl font-black tracking-tight">Saved items</h1>
        <p className="mt-2 text-sm text-slate-500">
          {products.length} item{products.length === 1 ? '' : 's'} saved.
        </p>
      </div>
      <div className="grid grid-cols-3 gap-2 sm:gap-4 lg:grid-cols-4">
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            saved
            onSave={() => onSave(product.id)}
            onAdd={onAdd}
            onOpen={() => onOpen(product)}
          />
        ))}
      </div>
    </section>
  );
}
