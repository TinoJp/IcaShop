import { useEffect, useRef, useState } from 'react';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { useLanguage, type Lang } from '@/i18n';
import type { Category } from '@/types';

const AUTOPLAY_MS = 5000;

type SlideCopy = { titleA: string; titleB: string; desc: string; cta: string };

type Slide = {
  id: string;
  image: string;
  bg: string; // must match the left edge colour of the image so the fade blends
  keywords: string[] | null; // words searched in category name/slug, in priority order. null = all products
  searches: string[];
  copy?: Record<Lang, SlideCopy>; // no copy = use the existing t('heroTitleA') ... keys
};

const slides: Slide[] = [
  {
    id: 'general',
    image: '/hero-products.webp',
    bg: '#FEEFEA',
    keywords: null,
    searches: ['Smartphones', 'Laptops', 'Shoes', 'Watches', 'Headphones'],
  },
  {
    id: 'electronics',
    image: '/hero-electronics.webp',
    bg: '#DBD8D3',
    keywords: ['electronic'],
    searches: ['Laptops', 'Earbuds', 'Smartwatch', 'Power bank'],
    copy: {
      en: {
        titleA: 'Level up',
        titleB: 'your tech.',
        desc: 'Laptops, earbuds, smartwatches and power banks for your everyday hustle.',
        cta: 'Shop electronics',
      },
      sw: {
        titleA: 'Pandisha',
        titleB: 'teknolojia yako.',
        desc: 'Laptop, earbuds, smartwatch na power bank kwa mihangaiko yako ya kila siku.',
        cta: 'Nunua electronics',
      },
    },
  },
  {
    id: 'gents',
    image: '/hero-gents.webp',
    bg: '#F9EBD1',
    keywords: ['gent', 'shoes'],
    searches: ['Sneakers', 'Loafers', 'Watches', 'Belts'],
    copy: {
      en: {
        titleA: 'Dress sharp.',
        titleB: 'Walk proud.',
        desc: 'Shoes, watches, belts and wallets for the modern gentleman.',
        cta: "Shop gent's stuff",
      },
      sw: {
        titleA: 'Vaa vizuri.',
        titleB: 'Tembea kwa kujiamini.',
        desc: 'Viatu, saa, mikanda na pochi kwa muungwana wa kisasa.',
        cta: 'Nunua vya wanaume',
      },
    },
  },
  {
    id: 'beauty',
    image: '/hero-beauty.webp',
    bg: '#F0DFD8',
    keywords: ['beauty', 'ladies'],
    searches: ['Perfume', 'Lipstick', 'Skincare', 'Makeup'],
    copy: {
      en: {
        titleA: 'Glow up.',
        titleB: 'Own your look.',
        desc: 'Perfume, skincare, makeup and the little gold touches.',
        cta: 'Shop beauty',
      },
      sw: {
        titleA: "Ng'ara.",
        titleB: 'Jipende zaidi.',
        desc: 'Marashi, huduma ya ngozi, make-up na vipodozi vya kila siku.',
        cta: 'Nunua urembo',
      },
    },
  },
  {
    id: 'kids',
    image: '/hero-kids.webp',
    bg: '#FBE7C2',
    keywords: ['kids', 'station'],
    searches: ['School bags', 'Notebooks', 'Toys', 'Water bottles'],
    copy: {
      en: {
        titleA: 'Ready for',
        titleB: 'school and play.',
        desc: 'Backpacks, notebooks, pencils and toys the little ones will love.',
        cta: 'Shop kids & school',
      },
      sw: {
        titleA: 'Tayari kwa',
        titleB: 'shule na michezo.',
        desc: 'Mabegi, madaftari, penseli na vitu vya kuchezea watoto wanavyovipenda.',
        cta: 'Nunua vya watoto',
      },
    },
  },
  {
    id: 'home',
    image: '/hero-home.webp',
    bg: '#EFE5DB',
    keywords: ['home appliances', 'home', 'furniture'],
    searches: ['Kettle', 'Blender', 'Lamp', 'Decor'],
    copy: {
      en: {
        titleA: 'Make home',
        titleB: 'feel like home.',
        desc: 'Kitchen appliances, lamps and decor for a cosy space.',
        cta: 'Shop for home',
      },
      sw: {
        titleA: 'Fanya nyumbani',
        titleB: 'pawe pazuri zaidi.',
        desc: 'Vifaa vya jikoni, taa na mapambo kwa nyumba yenye utulivu.',
        cta: 'Nunua vya nyumbani',
      },
    },
  },
];

const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

// Finds the category id by looking for the keywords in the category name or slug (emoji in names is fine).
function findCategoryId(categories: Category[], keywords: string[]) {
  for (const keyword of keywords) {
    const hit = categories.find((category) => normalize(`${category.name} ${category.slug}`).includes(keyword));
    if (hit) return hit.id;
  }
  return undefined;
}

type HeroCarouselProps = {
  categories: Category[];
  onCategory: (id: string) => void;
  onExplore: () => void;
  onSearch?: (term: string) => void;
};

export function HeroCarousel({ categories, onCategory, onExplore, onSearch }: HeroCarouselProps) {
  const { t, lang } = useLanguage();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const count = slides.length;

  const goTo = (next: number) => setIndex(((next % count) + count) % count);

  // setTimeout (not setInterval) so any manual change restarts the 5 seconds.
  useEffect(() => {
    if (paused) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = window.setTimeout(() => setIndex((current) => (current + 1) % count), AUTOPLAY_MS);
    return () => window.clearTimeout(timer);
  }, [index, paused, count]);

  const openSlide = (slide: Slide) => {
    if (!slide.keywords) {
      onCategory('all');
      return;
    }
    const categoryId = findCategoryId(categories, slide.keywords);
    if (categoryId) onCategory(categoryId);
    else onExplore();
  };

  return (
    <section
      className="relative overflow-hidden rounded-3xl shadow-sm ring-1 ring-orange-100 transition-colors duration-700 motion-reduce:transition-none"
      style={{ backgroundColor: slides[index].bg }}
      aria-roledescription="carousel"
      aria-label="Featured collections"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onTouchStart={(event) => {
        touchStartX.current = event.touches[0].clientX;
      }}
      onTouchEnd={(event) => {
        if (touchStartX.current === null) return;
        const delta = event.changedTouches[0].clientX - touchStartX.current;
        touchStartX.current = null;
        if (Math.abs(delta) > 50) goTo(delta < 0 ? index + 1 : index - 1);
      }}
    >
      {/* All slides sit in the same grid cell, so the height never jumps between slides. */}
      <div className="grid">
        {slides.map((slide, i) => {
          const active = i === index;
          const Heading = i === 0 ? 'h1' : 'h2'; // only one h1 per page
          const copy = slide.copy
            ? slide.copy[lang]
            : { titleA: t('heroTitleA'), titleB: t('heroTitleB'), desc: t('heroDesc'), cta: t('shopNow') };

          return (
            <div
              key={slide.id}
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} / ${count}`}
              aria-hidden={!active}
              className={`col-start-1 row-start-1 grid items-center transition-opacity duration-700 motion-reduce:transition-none md:grid-cols-[1fr_1.05fr] ${
                active ? 'opacity-100' : 'pointer-events-none opacity-0'
              }`}
            >
              <div className="relative z-10 px-6 pb-2 pt-10 sm:px-12 sm:pt-14 md:pb-14">
                <Heading className="text-4xl font-black leading-[1.08] tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
                  {copy.titleA}
                  <br />
                  <span className="text-orange-500">{copy.titleB}</span>
                </Heading>
                <p className="mt-5 max-w-md text-sm leading-6 text-slate-600 sm:text-base">{copy.desc}</p>
                <button
                  onClick={() => openSlide(slide)}
                  tabIndex={active ? 0 : -1}
                  className="mt-7 inline-flex items-center gap-2 rounded-xl bg-orange-500 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-orange-500/25 transition hover:-translate-y-0.5 hover:bg-orange-600"
                >
                  {copy.cta} <ArrowRight size={17} />
                </button>

                {onSearch && slide.searches.length > 0 && (
                  <div className="mt-8 flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold text-slate-800">{t('popularSearches')}:</span>
                    {slide.searches.map((term) => (
                      <button
                        key={term}
                        onClick={() => onSearch(term)}
                        tabIndex={active ? 0 : -1}
                        className="rounded-full border border-orange-100 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:border-orange-400 hover:text-orange-600"
                      >
                        {term}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <img
                src={slide.image}
                alt=""
                width={1248}
                height={864}
                loading={i === 0 ? 'eager' : 'lazy'}
                fetchPriority={i === 0 ? 'high' : 'auto'}
                className="h-auto w-full [-webkit-mask-image:linear-gradient(to_right,transparent_4.5%,black_9%)] [mask-image:linear-gradient(to_right,transparent_4.5%,black_9%)]"
              />
            </div>
          );
        })}
      </div>

      {/* Dots */}
      <div className="absolute bottom-3 left-5 z-20 flex items-center sm:left-11">
        {slides.map((slide, i) => (
          <button
            key={slide.id}
            onClick={() => goTo(i)}
            aria-label={`Slide ${i + 1}`}
            aria-current={i === index}
            className="p-1.5"
          >
            <span
              className={`block h-2 rounded-full transition-all duration-300 ${
                i === index ? 'w-6 bg-orange-500' : 'w-2 bg-orange-300 hover:bg-orange-400'
              }`}
            />
          </button>
        ))}
      </div>

      {/* Arrows (desktop only; on phones people swipe) */}
      <div className="absolute bottom-3 right-4 z-20 hidden gap-2 md:flex">
        <button
          onClick={() => goTo(index - 1)}
          aria-label="Previous slide"
          className="rounded-full bg-white/90 p-2 text-slate-700 shadow-sm ring-1 ring-orange-100 transition hover:text-orange-600"
        >
          <ChevronLeft size={16} />
        </button>
        <button
          onClick={() => goTo(index + 1)}
          aria-label="Next slide"
          className="rounded-full bg-white/90 p-2 text-slate-700 shadow-sm ring-1 ring-orange-100 transition hover:text-orange-600"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </section>
  );
}