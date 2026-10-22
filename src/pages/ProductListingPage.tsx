import { ArrowLeft } from 'lucide-react';
import { ProductCard } from '@/components/ProductCard';
import { formatTsh } from '@/utils';
import type { Category, Product } from '@/types';

type ProductListingPageProps = {
  products: Product[];
  categories: Category[];
  selectedCategory: string;
  searchTerm: string;
  priceLimit: number;
  maxPriceLimit: number;
  sortOrder: 'newest' | 'price-low' | 'price-high';
  savedProducts: string[];
  onPriceLimit: (value: number) => void;
  onSortOrder: (value: 'newest' | 'price-low' | 'price-high') => void;
  onCategory: (id: string) => void;
  onSave: (id: string) => void;
  onAdd: (product: Product, quantity?: number) => void;
  onOpen: (product: Product) => void;
};

export function ProductListingPage({
  products,
  categories,
  selectedCategory,
  searchTerm,
  priceLimit,
  maxPriceLimit,
  sortOrder,
  savedProducts,
  onPriceLimit,
  onSortOrder,
  onCategory,
  onSave,
  onAdd,
  onOpen,
}: ProductListingPageProps) {
  return (
    <section id="products" className="mt-10">
      <div className="flex flex-col gap-4 border-b border-orange-100 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <button onClick={() => onCategory('all')} className="mb-3 flex items-center gap-2 text-sm font-bold text-orange-600">
            <ArrowLeft size={16} /> Back to all products
          </button>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-500">Product catalogue</p>
          <h2 className="mt-1 text-3xl font-black tracking-tight">
            {searchTerm ? `Results for "${searchTerm}"` : 'Explore products'}
          </h2>
          <p className="mt-2 text-sm text-slate-500">{products.length} products available for delivery.</p>
        </div>
        <label className="flex items-center gap-2 text-sm font-semibold text-slate-600">
          Sort by
          <select
            value={sortOrder}
            onChange={(event) => onSortOrder(event.target.value as ProductListingPageProps['sortOrder'])}
            className="rounded-xl border border-orange-100 bg-white px-3 py-2 outline-none focus:border-orange-400"
          >
            <option value="newest">Recommended</option>
            <option value="price-low">Price: low to high</option>
            <option value="price-high">Price: high to low</option>
          </select>
        </label>
      </div>
      <div className="mt-6 grid gap-5 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-orange-100 sm:grid-cols-[1fr_220px]">
        <div>
          <p className="mb-3 text-sm font-bold">Filter by category</p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => onCategory('all')}
              className={`rounded-full px-3 py-2 text-xs font-bold ${selectedCategory === 'all' ? 'bg-orange-500 text-white' : 'bg-orange-50 text-slate-600'}`}
            >
              All
            </button>
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => onCategory(category.id)}
                className={`rounded-full px-3 py-2 text-xs font-bold ${selectedCategory === category.id ? 'bg-orange-500 text-white' : 'bg-orange-50 text-slate-600'}`}
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>
        <label className="text-sm font-bold">
          Up to {formatTsh(priceLimit)}
          <input
            type="range"
            min="25000"
            max={maxPriceLimit}
            step="5000"
            value={priceLimit}
            onChange={(event) => onPriceLimit(Number(event.target.value))}
            className="mt-3 w-full accent-orange-500"
          />
        </label>
      </div>
      {products.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-orange-200 bg-white p-10 text-center text-sm text-slate-500">
          No products match these filters. Try a different category or price range.
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-3 gap-2 sm:gap-4 lg:grid-cols-4">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              saved={savedProducts.includes(product.id)}
              onSave={() => onSave(product.id)}
              onAdd={onAdd}
              onOpen={() => onOpen(product)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
