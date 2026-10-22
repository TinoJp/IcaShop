import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

export type Lang = 'en' | 'sw';

const translations = {
  en: {
    // App shell
    cashOnDelivery: 'Cash on Delivery',
    deliveryEverywhere: 'Delivery everywhere in Tanzania',
    categories: 'Categories',
    searchPlaceholder: 'Search products, brands or categories',
    home: 'Home',
    products: 'Products',
    myOrders: 'My Orders',
    adminDashboard: 'Admin dashboard',
    admin: 'Admin',
    myAccount: 'My account',
    signIn: 'Sign in',
    adminRequired: 'You need an admin account to access this area.',
    customerCare: 'Customer care',
    helpCenter: 'Help Center',
    trackOrder: 'Track your order',
    returnsRefunds: 'Returns & refunds',
    aboutIca: 'About iCa',
    aboutUs: 'About us',
    contactUs: 'Contact us',
    terms: 'Terms & conditions',
    shoppingEasy: 'Shopping made easy',
    footerTagline: 'Thoughtful finds delivered anywhere in Tanzania.',
    rights: 'All rights reserved.',
    // Home page
    heroTag: 'Curated finds, delivered to you',
    heroLine1: 'Find it.',
    heroLine2: 'Love it. Buy it.',
    heroDesc: 'Everyday essentials and lovely surprises, all in one place. Shop confidently with Cash on Delivery.',
    exploreProducts: 'Explore products',
    browseBy: 'Browse by',
    shopCategories: 'Shop categories',
    findSomething: 'Find something made for you',
    all: 'All',
    onSale: 'On Sale',
    onSaleDesc: 'Little treats, now at an even better price.',
    newArrivals: 'New Arrivals',
    newArrivalsDesc: 'Fresh picks for your next great find.',
    viewAll: 'View all',
    noProducts: 'No products match this selection yet.',
    // Footer
    footerShop: 'Shop',
    allProducts: 'All products',
    savedItems: 'Saved items',
    getInTouch: 'Get in touch',
    footerContactHint: 'Questions about an order? We are happy to help.',
    chatWhatsapp: 'Chat on WhatsApp',
    followUs: 'Follow us',
    backToTop: 'Back to top',
  },
  sw: {
    // App shell
    cashOnDelivery: 'Lipa Ukipokea',
    deliveryEverywhere: 'Tunafikisha popote Tanzania',
    categories: 'Makundi',
    searchPlaceholder: 'Tafuta bidhaa, chapa au makundi',
    home: 'Nyumbani',
    products: 'Bidhaa',
    myOrders: 'Oda Zangu',
    adminDashboard: 'Dashibodi ya Admin',
    admin: 'Admin',
    myAccount: 'Akaunti Yangu',
    signIn: 'Ingia',
    adminRequired: 'Unahitaji akaunti ya admin kufikia eneo hili.',
    customerCare: 'Huduma kwa Wateja',
    helpCenter: 'Kituo cha Msaada',
    trackOrder: 'Fuatilia oda yako',
    returnsRefunds: 'Marejesho na Fidia',
    aboutIca: 'Kuhusu iCa',
    aboutUs: 'Kuhusu sisi',
    contactUs: 'Wasiliana nasi',
    terms: 'Vigezo na Masharti',
    shoppingEasy: 'Ununuzi Rahisi',
    footerTagline: 'Bidhaa nzuri zinafikishwa popote Tanzania.',
    rights: 'Haki zote zimehifadhiwa.',
    // Home page
    heroTag: 'Bidhaa teule, zinakufikia mlangoni',
    heroLine1: 'Ipate.',
    heroLine2: 'Ipende. Inunue.',
    heroDesc: 'Mahitaji ya kila siku na zawadi nzuri, vyote mahali pamoja. Nunua kwa uhakika kwa Lipa Ukipokea.',
    exploreProducts: 'Tazama bidhaa',
    browseBy: 'Tafuta kwa',
    shopCategories: 'Makundi ya bidhaa',
    findSomething: 'Pata kitu kilichokuandalia',
    all: 'Zote',
    onSale: 'Punguzo',
    onSaleDesc: 'Vitu vizuri, sasa kwa bei nafuu zaidi.',
    newArrivals: 'Bidhaa Mpya',
    newArrivalsDesc: 'Chaguo mpya kwa ununuzi wako ujao.',
    viewAll: 'Tazama zote',
    noProducts: 'Hakuna bidhaa zinazolingana na chaguo hili bado.',
    // Footer
    footerShop: 'Duka',
    allProducts: 'Bidhaa zote',
    savedItems: 'Zilizohifadhiwa',
    getInTouch: 'Tuwasiliane',
    footerContactHint: 'Una swali kuhusu oda yako? Tuko tayari kukusaidia.',
    chatWhatsapp: 'Ongea nasi WhatsApp',
    followUs: 'Tufuatilie',
    backToTop: 'Rudi juu',
  },
} as const;

export type TranslationKey = keyof (typeof translations)['en'];

type LanguageContextValue = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: TranslationKey) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

const STORAGE_KEY = 'ica-lang';

function getInitialLang(): Lang {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved === 'sw' ? 'sw' : 'en';
  } catch {
    return 'en';
  }
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(getInitialLang);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  const t = useCallback((key: TranslationKey) => translations[lang][key], [lang]);

  return <LanguageContext.Provider value={{ lang, setLang, t }}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used inside LanguageProvider');
  return ctx;
}