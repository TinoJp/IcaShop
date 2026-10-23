import {
  ArrowRight,
  Baby,
  Grid2X2,
  Home as HomeIcon,
  Laptop,
  Shirt,
  Sparkles,
  Trophy,
} from 'lucide-react';
import { ProductCard } from '@/components/ProductCard';
import { useLanguage } from '@/i18n';
import type { Category, Product } from '@/types';

const categoryIcons: Record<string, typeof Laptop> = {
  electronics: Laptop,
  fashion: Shirt,
  'home-garden': HomeIcon,
  beauty: Sparkles,
  sports: Trophy,
  'toys-games': Baby,
};

// Words shown under the hero button. Clicking one searches for it.
// Change these to words that match products you actually sell.
const popularSearches = ['Smartphones', 'Laptops', 'Shoes', 'Watches', 'Headphones'];

type HomePageProps = {
  categories: Category[];
  saleProducts: Product[];
  newProducts: Product[];
  selectedCategory: string;
  savedProducts: string[];
  loading: boolean;
  error: string;
  onCategory: (id: string) => void;
  onExplore: () => void;
  onSearch?: (term: string) => void;
  onSave: (id: string) => void;
  onAdd: (product: Product, quantity?: number) => void;
  onOpen: (product: Product) => void;
};

export function HomePage({
  categories,
  saleProducts,
  newProducts,
  selectedCategory,
  savedProducts,
  loading,
  error,
  onCategory,
  onExplore,
  onSearch,
  onSave,
  onAdd,
  onOpen,
}: HomePageProps) {
  const { t } = useLanguage();

  return (
    <>
      <section className="relative overflow-hidden rounded-3xl bg-[#FEEFEA] shadow-sm ring-1 ring-orange-100">
        <div className="grid items-center md:grid-cols-[1fr_1.05fr]">
          <div className="relative z-10 px-6 pb-2 pt-10 sm:px-12 sm:pt-14 md:pb-14">
            <h1 className="text-4xl font-black leading-[1.08] tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
              {t('heroTitleA')}
              <br />
              <span className="text-orange-500">{t('heroTitleB')}</span>
            </h1>
            <p className="mt-5 max-w-md text-sm leading-6 text-slate-600 sm:text-base">{t('heroDesc')}</p>
            <button
              onClick={onExplore}
              className="mt-7 inline-flex items-center gap-2 rounded-xl bg-orange-500 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-orange-500/25 transition hover:-translate-y-0.5 hover:bg-orange-600"
            >
              {t('shopNow')} <ArrowRight size={17} />
            </button>

            {onSearch && popularSearches.length > 0 && (
              <div className="mt-8 flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-slate-800">{t('popularSearches')}:</span>
                {popularSearches.map((term) => (
                  <button
                    key={term}
                    onClick={() => onSearch(term)}
                    className="rounded-full border border-orange-100 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:border-orange-400 hover:text-orange-600"
                  >
                    {term}
                  </button>
                ))}
              </div>
            )}
          </div>

          <img
            src="/hero-products.webp"
            alt=""
            width={1247}
            height={864}
            fetchPriority="high"
            className="h-auto w-full [-webkit-mask-image:linear-gradient(to_right,transparent_4.5%,black_9%)] [mask-image:linear-gradient(to_right,transparent_4.5%,black_9%)]"
          />
        </div>
      </section>

      <section id="categories" className="mt-10">
        <div className="mb-4 flex items-end justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-500">{t('browseBy')}</p>
            <h2 className="mt-1 text-2xl font-black tracking-tight">{t('shopCategories')}</h2>
          </div>
          <span className="hidden text-sm text-slate-500 sm:block">{t('findSomething')}</span>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {[{ id: 'all', name: t('all'), slug: 'all' }, ...categories].map((category) => {
            const Icon = categoryIcons[category.slug] ?? Grid2X2;
            return (
              <button
                key={category.id}
                onClick={() => onCategory(category.id)}
                className={`flex shrink-0 items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-semibold transition ${
                  selectedCategory === category.id
                    ? 'border-orange-500 bg-orange-500 text-white shadow-md shadow-orange-500/20'
                    : 'border-orange-200 bg-white text-slate-600 hover:border-orange-400 hover:text-orange-600'
                }`}
              >
                <Icon size={16} />
                {category.name}
              </button>
            );
          })}
        </div>
      </section>

      {error ? (
        <div className="mt-10 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</div>
      ) : loading ? (
        <div className="mt-10 grid grid-cols-2 gap-2 sm:gap-4 lg:grid-cols-4">
          <div className="h-72 animate-pulse rounded-2xl bg-orange-100" />
          <div className="h-72 animate-pulse rounded-2xl bg-orange-100" />
          <div className="h-72 animate-pulse rounded-2xl bg-orange-100" />
          <div className="h-72 animate-pulse rounded-2xl bg-orange-100" />
        </div>
      ) : (
        <div id="products" className="mt-10 space-y-12">
          <ProductSection
            title={t('onSale')}
            description={t('onSaleDesc')}
            products={saleProducts}
            savedProducts={savedProducts}
            onSave={onSave}
            onAdd={onAdd}
            onOpen={onOpen}
          />
          <ProductSection
            title={t('newArrivals')}
            description={t('newArrivalsDesc')}
            products={newProducts}
            savedProducts={savedProducts}
            onSave={onSave}
            onAdd={onAdd}
            onOpen={onOpen}
          />
        </div>
      )}
    </>
  );
}

function ProductSection({
  title,
  description,
  products,
  savedProducts,
  onSave,
  onAdd,
  onOpen,
}: {
  title: string;
  description: string;
  products: Product[];
  savedProducts: string[];
  onSave: (id: string) => void;
  onAdd: (product: Product, quantity?: number) => void;
  onOpen: (product: Product) => void;
}) {
  const { t } = useLanguage();

  return (
    <section>
      <div className="mb-5 flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-tight">{title}</h2>
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        </div>
        <span className="hidden items-center gap-1 text-sm font-bold text-orange-600 sm:flex">
          {t('viewAll')} <ArrowRight size={15} />
        </span>
      </div>
      {products.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-orange-200 bg-white p-8 text-center text-sm text-slate-500">
          {t('noProducts')}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:gap-4 lg:grid-cols-4">
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