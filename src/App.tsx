import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import {
  BrowserRouter,
  Link,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
} from 'react-router-dom';
import {
  ChevronDown,
  Grid2X2,
  Heart,
  Home as HomeIcon,
  LayoutGrid,
  LogOut,
  Search,
  ShoppingBag,
  Store,
  UserRound,
  X,
} from 'lucide-react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { useCart } from '@/cart';
import { normalizeTanzanianPhone, isTanzanianPhone } from '@/utils';
import { LanguageProvider, useLanguage, type Lang } from '@/i18n';
import { CartDrawer } from '@/components/CartDrawer';
import { Checkout, OrderConfirmation } from '@/pages/CheckoutPage';
import { OrdersPage } from '@/pages/OrdersPage';
import { AccountPage } from '@/pages/AccountPage';
import { AccountDashboard } from '@/pages/AccountDashboard';
import { AccountOverview } from '@/pages/AccountOverview';
import { SavedPage } from '@/pages/SavedPage';
import { Footer } from '@/pages/Footer';
import { type AuthMode, type AuthPageProps } from '@/pages/useAuthForm';
import { LoginPage } from '@/pages/LoginPage';
import { HomePage } from '@/pages/HomePage';
import { ProductDetailPage } from '@/pages/ProductDetailPage';
import { ProductListingPage } from '@/pages/ProductListingPage';
import { RegisterPage } from '@/pages/RegisterPage';
import type { Category, Product, Profile, OrderRow } from '@/types';

// The admin area is only downloaded when an admin opens /admin.
const AdminRoutes = lazy(() =>
  import('@/pages/admin/AdminRoutes').then((m) => ({ default: m.AdminRoutes })),
);

// Turns a Supabase auth error into a message the visitor can act on.
function authErrorMessage(err: { code?: string; message?: string; status?: number }, fallback: string) {
  const code = err.code ?? '';
  const message = (err.message ?? '').toLowerCase();

  if (code === 'invalid_credentials' || message.includes('invalid login credentials')) {
    return 'Wrong email or password. Please check and try again.';
  }
  if (code === 'email_not_confirmed' || message.includes('email not confirmed')) {
    return 'Please confirm your email first. Check your inbox for the confirmation link.';
  }
  if (code === 'user_already_exists' || message.includes('already registered')) {
    return 'An account with this email already exists. Try signing in instead.';
  }
  if (code === 'weak_password' || message.includes('password should be')) {
    return 'Use at least 8 characters with uppercase and lowercase letters, a number, and a symbol.';
  }
  if (code.includes('rate_limit') || err.status === 429) {
    return 'Too many attempts. Please wait a minute and try again.';
  }
  if (message.includes('failed to fetch') || message.includes('network') || err.status === 0) {
    return 'Cannot reach the server. Check your internet connection and try again.';
  }

  console.error('Auth error:', err);
  return fallback;
}

function ScrollToTop() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) {
      document.querySelector(hash)?.scrollIntoView({ behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [pathname, hash]);
  return null;
}

function NotFound({ lang }: { lang: Lang }) {
  const sw = lang === 'sw';
  return (
    <div className="mx-auto mt-16 max-w-md rounded-3xl bg-white p-10 text-center shadow-sm ring-1 ring-orange-100">
      <p className="text-6xl font-black text-orange-500">404</p>
      <h1 className="mt-3 text-2xl font-black tracking-tight">{sw ? 'Ukurasa haupatikani' : 'Page not found'}</h1>
      <p className="mt-2 text-sm text-slate-500">
        {sw ? 'Ukurasa unaoutafuta haupo au umehamishwa.' : 'The page you are looking for does not exist or has moved.'}
      </p>
      <Link
        to="/"
        className="mt-6 inline-flex rounded-xl bg-orange-500 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-orange-500/20 transition hover:bg-orange-600"
      >
        {sw ? 'Rudi Nyumbani' : 'Back to home'}
      </Link>
    </div>
  );
}

function ProductDetailRoute({
  products,
  loading,
  lang,
  savedProducts,
  onBack,
  onAdd,
  onSave,
}: {
  products: Product[];
  loading: boolean;
  lang: Lang;
  savedProducts: string[];
  onBack: () => void;
  onAdd: (product: Product, quantity?: number) => void;
  onSave: (productId: string) => void;
}) {
  const { slug } = useParams();
  const product = products.find((item) => item.slug === slug);

  if (loading) return <div className="h-96 animate-pulse rounded-2xl bg-orange-100" />;
  if (!product) return <NotFound lang={lang} />;

  return (
    <ProductDetailPage
      product={product}
      onBack={onBack}
      onAdd={(quantity) => onAdd(product, quantity)}
      saved={savedProducts.includes(product.id)}
      onSave={() => onSave(product.id)}
    />
  );
}

function AppContent() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [priceLimit, setPriceLimit] = useState(250000);
  const [maxPriceLimit, setMaxPriceLimit] = useState(250000);
  const [sortOrder, setSortOrder] = useState<'newest' | 'price-low' | 'price-high'>('newest');
  const [savedProducts, setSavedProducts] = useState<string[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [placedOrder, setPlacedOrder] = useState<OrderRow | null>(null);
  const [placedOrderWhatsappUrl, setPlacedOrderWhatsappUrl] = useState('');
  const [deliveryFee, setDeliveryFee] = useState(5000);
  const [freeDeliveryThreshold, setFreeDeliveryThreshold] = useState(100000);

  const cart = useCart();
  const { lang, setLang, t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const pathname = location.pathname;

  // Where to go after signing in (set when a page redirects the visitor to /login)
  const from = (location.state as { from?: string } | null)?.from;

  useEffect(() => {
    const loadCatalog = async () => {
      const [categoriesResult, productsResult, settingsResult, imagesResult] = await Promise.all([
        supabase.from('categories').select('id, name, slug').order('display_order'),
        supabase
          .from('products')
          .select('id, category_id, name, slug, description, price, sale_price, stock, created_at')
          .eq('is_active', true)
          .eq('is_archived', false)
          .order('created_at', { ascending: false }),
        supabase.from('settings').select('setting_key, setting_value'),
        supabase.from('product_images').select('product_id,image_url,display_order').order('display_order'),
      ]);

      if (categoriesResult.error || productsResult.error) {
        setError('We could not load the catalog right now. Please refresh and try again.');
      } else {
        setCategories(categoriesResult.data ?? []);
        const images = new Map<string, string>();
        for (const image of imagesResult.data ?? []) {
          if (!images.has(image.product_id)) images.set(image.product_id, image.image_url);
        }
        setProducts((productsResult.data ?? []).map((product) => ({ ...product, image_url: images.get(product.id) ?? null })));
      }

      if (!settingsResult.error && settingsResult.data) {
        const map = Object.fromEntries(settingsResult.data.map((s) => [s.setting_key, s.setting_value]));
        if (map.delivery_fee) setDeliveryFee(Number(map.delivery_fee));
        if (map.free_delivery_threshold) setFreeDeliveryThreshold(Number(map.free_delivery_threshold));
        const configuredMaxPrice = Number(map.product_price_filter_max);
        if (Number.isSafeInteger(configuredMaxPrice) && configuredMaxPrice >= 25000) {
          setMaxPriceLimit(configuredMaxPrice);
          setPriceLimit(configuredMaxPrice);
        }
      }

      setLoading(false);
    };

    void loadCatalog();
  }, []);

  useEffect(() => {
    const loadProfile = async (currentUser: User | null) => {
      if (!currentUser) {
        setUser(null);
        setProfile(null);
        setSavedProducts([]);
        return;
      }
      const [profileResult, savedResult] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, full_name, phone, address, role')
          .eq('id', currentUser.id)
          .maybeSingle(),
        supabase.from('saved_products').select('product_id').eq('user_id', currentUser.id),
      ]);
      setProfile(profileResult.data);
      setSavedProducts((savedResult.data ?? []).map((row) => row.product_id as string));
      // Set last, so `profile` is already loaded by the time `user` appears.
      setUser(currentUser);
    };

    void (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      await loadProfile(session?.user ?? null);
      setAuthReady(true);
    })();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      void (async () => {
        await loadProfile(session?.user ?? null);
      })();
    });
    return () => subscription.unsubscribe();
  }, []);

  // After a successful sign in / registration, the /login and /register routes
  // redirect automatically as soon as `user` is set.
  const signIn = async (email: string, password: string) => {
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      throw new Error(authErrorMessage(signInError, 'We could not sign you in. Check your details and try again.'));
    }
  };

  const register = async (fullName: string, email: string, password: string, phone: string) => {
    const normalizedPhone = normalizeTanzanianPhone(phone);
    if (!isTanzanianPhone(normalizedPhone)) throw new Error('Enter a valid Tanzanian mobile number, such as 0712 345 678.');
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, phone: normalizedPhone } },
    });
    if (signUpError) {
      throw new Error(authErrorMessage(signUpError, 'We could not create your account. Please check your details and try again.'));
    }
    // No session means Supabase is waiting for the email to be confirmed
    if (data.user && !data.session) {
      throw new Error('Account created. Please check your email to confirm it, then sign in.');
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const updateProfile = async (values: Pick<Profile, 'full_name' | 'phone' | 'address'>) => {
    if (!user) return;
    const { data, error: updateError } = await supabase
      .from('profiles')
      .update(values)
      .eq('id', user.id)
      .select('id, full_name, phone, address, role')
      .maybeSingle();
    if (updateError || !data) throw new Error('We could not save your profile. Please try again.');
    setProfile(data);
  };

  const filteredProducts = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return products
      .filter((product) => {
        const matchesCategory = selectedCategory === 'all' || product.category_id === selectedCategory;
        const matchesSearch = !term || `${product.name} ${product.description}`.toLowerCase().includes(term);
        const matchesPrice = (product.sale_price ?? product.price) <= priceLimit;
        return matchesCategory && matchesSearch && matchesPrice;
      })
      .sort((first, second) => {
        if (sortOrder === 'price-low') return (first.sale_price ?? first.price) - (second.sale_price ?? second.price);
        if (sortOrder === 'price-high') return (second.sale_price ?? second.price) - (first.sale_price ?? first.price);
        return 0;
      });
  }, [products, searchTerm, selectedCategory, priceLimit, sortOrder]);

  const saleProducts = filteredProducts.filter((product) => product.sale_price !== null);
  const newProducts = [...filteredProducts]
    .sort((first, second) => Date.parse(second.created_at ?? '') - Date.parse(first.created_at ?? ''))
    .slice(0, 6);
  const savedItems = products.filter((product) => savedProducts.includes(product.id));

  const openProduct = (product: Product) => navigate(`/products/${product.slug}`);
  const openListing = () => navigate('/products');
  const openHome = () => navigate('/');
  const openOrders = () => navigate('/account/orders');
  const openCategories = () => navigate('/#categories');
  const openAdmin = () => navigate('/admin');
  const openAccountOrLogin = () => navigate(user ? '/account' : '/login');
  const openCheckout = () => {
    setCartOpen(false);
    if (!user) {
      navigate('/login', { state: { from: '/checkout' } });
      return;
    }
    navigate('/checkout');
  };
  const persistSaved = async (productId: string) => {
    if (!user) {
      navigate('/login', { state: { from: pathname } });
      return;
    }

    const wasSaved = savedProducts.includes(productId);
    setSavedProducts((saved) => (wasSaved ? saved.filter((id) => id !== productId) : [...saved, productId]));

    const { error: saveError } = wasSaved
      ? await supabase.from('saved_products').delete().eq('user_id', user.id).eq('product_id', productId)
      : await supabase.from('saved_products').insert({ user_id: user.id, product_id: productId });

    // 23505 means it was already saved, which is fine. Anything else: put the heart back as it was.
    if (saveError && saveError.code !== '23505') {
      setSavedProducts((saved) => (wasSaved ? [...saved, productId] : saved.filter((id) => id !== productId)));
    }
  };
  const toggleSaved = (productId: string) => {
    void persistSaved(productId);
  };

  const handleOrderPlaced = (order: OrderRow, whatsappUrl: string) => {
    setPlacedOrder(order);
    setPlacedOrderWhatsappUrl(whatsappUrl);
    cart.clear();
    navigate('/order-confirmation');
  };

  const changeAuthMode = (mode: AuthMode) => {
    const target = mode === 'login' ? '/login' : mode === 'register' ? '/register' : mode === 'account' ? '/account' : '/';
    navigate(target, { state: location.state });
  };

  const authPageProps = (mode: Exclude<AuthMode, 'closed'>): AuthPageProps => ({
    mode,
    user,
    profile,
    onModeChange: changeAuthMode,
    onSignIn: signIn,
    onRegister: register,
    onSignOut: signOut,
    onUpdateProfile: updateProfile,
  });

  const showSidebar =
    pathname === '/' ||
    pathname.startsWith('/products') ||
    pathname.startsWith('/account') ||
    pathname === '/checkout' ||
    pathname === '/order-confirmation';

  const waiting = !authReady;

  const routes = (
    <Routes>
      <Route
        path="/"
        element={
          <HomePage
            categories={categories}
            saleProducts={saleProducts}
            newProducts={newProducts}
            selectedCategory={selectedCategory}
            savedProducts={savedProducts}
            loading={loading}
            error={error}
            onCategory={(categoryId) => {
              setSelectedCategory(categoryId);
              openListing();
            }}
            onExplore={openListing}
            onSave={toggleSaved}
            onAdd={cart.add}
            onOpen={openProduct}
          />
        }
      />

      <Route
        path="/products"
        element={
          <ProductListingPage
            products={filteredProducts}
            categories={categories}
            selectedCategory={selectedCategory}
            searchTerm={searchTerm}
            priceLimit={priceLimit}
            maxPriceLimit={maxPriceLimit}
            sortOrder={sortOrder}
            onPriceLimit={setPriceLimit}
            onSortOrder={setSortOrder}
            onCategory={setSelectedCategory}
            savedProducts={savedProducts}
            onSave={toggleSaved}
            onAdd={cart.add}
            onOpen={openProduct}
          />
        }
      />

      <Route
        path="/products/:slug"
        element={
          <ProductDetailRoute
            products={products}
            loading={loading}
            lang={lang}
            savedProducts={savedProducts}
            onBack={openListing}
            onAdd={(product, quantity) => {
              cart.add(product, quantity);
              setCartOpen(true);
            }}
            onSave={toggleSaved}
          />
        }
      />

      <Route
        path="/checkout"
        element={
          waiting ? null : !user ? (
            <Navigate to="/login" state={{ from: '/checkout' }} replace />
          ) : (
            <Checkout
              items={cart.items}
              subtotal={cart.subtotal}
              profile={profile}
              deliveryFee={deliveryFee}
              freeDeliveryThreshold={freeDeliveryThreshold}
              onBack={() => {
                setCartOpen(true);
                navigate('/');
              }}
              onPlaced={handleOrderPlaced}
            />
          )
        }
      />

      <Route
        path="/order-confirmation"
        element={
          placedOrder ? (
            <OrderConfirmation
              order={placedOrder}
              whatsappUrl={placedOrderWhatsappUrl}
              onContinue={() => {
                setPlacedOrder(null);
                setPlacedOrderWhatsappUrl('');
                openHome();
              }}
            />
          ) : (
            <Navigate to="/account/orders" replace />
          )
        }
      />

      <Route path="/orders" element={<Navigate to="/account/orders" replace />} />

      <Route
        path="/login"
        element={waiting ? null : user ? <Navigate to={from ?? '/'} replace /> : <LoginPage {...authPageProps('login')} />}
      />
      <Route
        path="/register"
        element={waiting ? null : user ? <Navigate to={from ?? '/account'} replace /> : <RegisterPage {...authPageProps('register')} />}
      />
      <Route
        path="/account"
        element={
          waiting ? null : !user ? (
            <Navigate to="/login" state={{ from: pathname }} replace />
          ) : (
            <AccountDashboard savedCount={savedItems.length} isAdmin={profile?.role === 'admin'} />
          )
        }
      >
        <Route index element={<AccountOverview profile={profile} savedCount={savedItems.length} />} />
        <Route path="orders" element={<OrdersPage />} />
        <Route
          path="saved"
          element={<SavedPage products={savedItems} loading={loading} onSave={toggleSaved} onAdd={cart.add} onOpen={openProduct} />}
        />
        <Route path="profile" element={<AccountPage {...authPageProps('account')} />} />
        <Route path="*" element={<NotFound lang={lang} />} />
      </Route>

      <Route path="*" element={<NotFound lang={lang} />} />
    </Routes>
  );

  // The admin area has its own layout (sidebar + top bar), separate from the storefront.
  if (pathname.startsWith('/admin')) {
    if (waiting) return null;
    if (!user) return <Navigate to="/login" state={{ from: pathname }} replace />;
    if (profile?.role !== 'admin') {
      return (
        <div className="m-8 rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
          {t('adminRequired')}
        </div>
      );
    }
    return (
      <Suspense fallback={<div className="m-8 h-64 animate-pulse rounded-2xl bg-orange-100" />}>
        <AdminRoutes
          profile={profile}
          onExit={openHome}
          onSignOut={signOut}
          onPriceFilterMaxChange={(value) => {
            setMaxPriceLimit(value);
            setPriceLimit(value);
          }}
        />
      </Suspense>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF7F4] pb-24 text-[#0F172A] lg:pb-0">
      <ScrollToTop />

      <div className="bg-[#0F172A] px-4 py-2 text-[11px] font-medium text-white/80 sm:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <p>Shop it · Love it</p>
          <div className="hidden items-center gap-5 sm:flex">
            <span>{t('cashOnDelivery')}</span>
            <span>{t('deliveryEverywhere')}</span>
          </div>
        </div>
      </div>

      <header className="sticky top-0 z-30 border-b border-orange-100 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-4 sm:px-8">
          <button onClick={openHome} className="flex shrink-0 items-center gap-2" aria-label="iCa home">
            <img src="/logo.jpeg" alt="iCa Shop it Love it logo" className="h-12 w-12 rounded-2xl object-cover shadow-sm" />
            <span className="hidden text-lg font-black tracking-tight sm:block">
              iCa<span className="text-orange-500">.</span>
            </span>
          </button>
          <div className="hidden w-44 items-center gap-2 rounded-xl bg-[#FAF7F4] px-4 py-3 text-sm font-semibold lg:flex">
            <Grid2X2 size={17} className="text-orange-500" /> {t('categories')} <ChevronDown size={15} className="ml-auto" />
          </div>
          <div className="flex min-w-0 flex-1 items-center rounded-xl border border-orange-100 bg-[#FAF7F4] px-4 py-2.5 focus-within:border-orange-400 focus-within:ring-4 focus-within:ring-orange-100">
            <Search size={19} className="shrink-0 text-orange-500" />
            <input
              value={searchTerm}
              onChange={(event) => {
                setSearchTerm(event.target.value);
                if (pathname !== '/products') navigate('/products');
              }}
              placeholder={t('searchPlaceholder')}
              className="min-w-0 flex-1 bg-transparent px-3 text-sm outline-none placeholder:text-slate-400"
              aria-label="Search products"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} aria-label="Clear search">
                <X size={16} className="text-slate-400" />
              </button>
            )}
          </div>
          <button
            onClick={() => setLang(lang === 'en' ? 'sw' : 'en')}
            className="hidden rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold sm:block"
            aria-label="Change language"
          >
            <span className={lang === 'en' ? 'text-orange-600' : 'text-slate-400'}>EN</span>
            <span className="text-slate-300"> / </span>
            <span className={lang === 'sw' ? 'text-orange-600' : 'text-slate-400'}>SW</span>
          </button>
          <button
            onClick={() => setCartOpen(true)}
            className="relative rounded-xl p-2.5 hover:bg-orange-50"
            aria-label={`${cart.count} items in cart`}
          >
            <ShoppingBag size={21} />
            {cart.count > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-orange-500 px-1 text-[10px] font-bold text-white">
                {cart.count}
              </span>
            )}
          </button>
          <button
            onClick={openAccountOrLogin}
            className="hidden items-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-orange-500/20 transition hover:bg-orange-600 sm:flex"
          >
            <UserRound size={17} /> {user ? profile?.full_name || t('myAccount') : t('signIn')}
          </button>
        </div>
      </header>

      {menuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            className="absolute inset-0 bg-slate-900/20"
            onClick={() => setMenuOpen(false)}
            aria-label="Close menu"
          />
          <div className="absolute bottom-24 left-4 right-4 max-h-[70vh] overflow-y-auto rounded-2xl border border-orange-100 bg-white p-3 shadow-xl">
            <nav className="flex flex-col gap-1 text-sm font-semibold">
              <button onClick={() => { openOrders(); setMenuOpen(false); }} className="rounded-lg px-3 py-2 text-left hover:bg-orange-50">{t('myOrders')}</button>
              {profile?.role === 'admin' && (
                <button onClick={() => { openAdmin(); setMenuOpen(false); }} className="rounded-lg px-3 py-2 text-left font-bold text-orange-600 hover:bg-orange-50">{t('adminDashboard')}</button>
              )}
              <button onClick={() => { openAccountOrLogin(); setMenuOpen(false); }} className="rounded-lg px-3 py-2 text-left hover:bg-orange-50">
                {user ? t('myAccount') : t('signIn')}
              </button>
              {user && (
                <button
                  onClick={() => { void signOut(); setMenuOpen(false); }}
                  className="rounded-lg px-3 py-2 text-left hover:bg-orange-50"
                >
                  {lang === 'sw' ? 'Toka' : 'Sign out'}
                </button>
              )}
              <button
                onClick={() => setLang(lang === 'en' ? 'sw' : 'en')}
                className="rounded-lg px-3 py-2 text-left hover:bg-orange-50"
              >
                <span className={lang === 'en' ? 'text-orange-600' : 'text-slate-400'}>EN</span>
                <span className="text-slate-300"> / </span>
                <span className={lang === 'sw' ? 'text-orange-600' : 'text-slate-400'}>SW</span>
              </button>
            </nav>
          </div>
        </div>
      )}

      <main id="top" className="mx-auto max-w-7xl px-4 pb-16 pt-5 sm:px-8">
        {showSidebar ? (
          <div className="grid gap-5 lg:grid-cols-[190px_1fr]">
            <aside className="hidden lg:block">
              <div className="flex flex-col overflow-y-auto rounded-2xl bg-white p-4 shadow-sm ring-1 ring-orange-100 lg:sticky lg:top-24 lg:h-[calc(100vh-7rem)]">
                <div className="mb-5 flex items-center gap-2 border-b border-orange-100 pb-4">
                  <img src="/logo.jpeg" alt="iCa" className="h-10 w-10 rounded-xl object-cover" />
                  <div>
                    <p className="font-black">iCa<span className="text-orange-500">.</span></p>
                    <p className="text-[10px] text-slate-500">Shop it · Love it</p>
                  </div>
                </div>
                <nav className="space-y-1 text-sm font-semibold">
                  <button onClick={openHome} className={`flex w-full items-center gap-3 rounded-xl border-l-2 px-3 py-3 ${pathname === '/' ? 'border-orange-500 bg-orange-50 text-orange-600' : 'border-transparent text-slate-600 hover:bg-orange-50'}`}>
                    <HomeIcon size={17} /> {t('home')}
                  </button>
                  <button onClick={openListing} className={`flex w-full items-center gap-3 rounded-xl border-l-2 px-3 py-3 ${pathname.startsWith('/products') ? 'border-orange-500 bg-orange-50 text-orange-600' : 'border-transparent text-slate-600 hover:bg-orange-50'}`}>
                    <Grid2X2 size={17} /> {t('products')}
                  </button>
                  <button onClick={openOrders} className={`flex w-full items-center gap-3 rounded-xl border-l-2 px-3 py-3 ${pathname === '/account/orders' ? 'border-orange-500 bg-orange-50 text-orange-600' : 'border-transparent text-slate-600 hover:bg-orange-50'}`}>
                    <ShoppingBag size={17} /> {t('myOrders')}
                  </button>
                  {profile?.role === 'admin' && (
                    <button onClick={openAdmin} className="flex w-full items-center gap-3 rounded-xl border-l-2 border-transparent px-3 py-3 text-slate-600 hover:bg-orange-50">
                      <LayoutGrid size={17} /> {t('admin')}
                    </button>
                  )}
                  <button onClick={openAccountOrLogin} className={`flex w-full items-center gap-3 rounded-xl border-l-2 px-3 py-3 ${pathname.startsWith('/account') && pathname !== '/account/orders' ? 'border-orange-500 bg-orange-50 text-orange-600' : 'border-transparent text-slate-600 hover:bg-orange-50'}`}>
                    <UserRound size={17} /> {user ? t('myAccount') : t('signIn')}
                  </button>
                </nav>

                {user && (
                  <div className="mt-auto border-t border-orange-100 pt-3">
                    <button
                      onClick={() => void signOut()}
                      className="flex w-full items-center gap-3 rounded-xl border-l-2 border-transparent px-3 py-3 text-sm font-semibold text-slate-600 hover:bg-orange-50 hover:text-orange-600"
                    >
                      <LogOut size={17} /> {lang === 'sw' ? 'Toka' : 'Sign out'}
                    </button>
                  </div>
                )}
              </div>
            </aside>

            <div className="min-w-0">{routes}</div>
          </div>
        ) : (
          routes
        )}
      </main>

      <Footer
        categories={categories}
        onCategory={(categoryId: Category['id']) => {
          setSelectedCategory(categoryId);
          openListing();
        }}
      />

      <CartDrawer
        open={cartOpen}
        items={cart.items}
        subtotal={cart.subtotal}
        onClose={() => setCartOpen(false)}
        onQuantity={cart.setQuantity}
        onRemove={cart.remove}
        onCheckout={openCheckout}
      />

      {!cartOpen && (
        <nav
          aria-label="Mobile navigation"
          className="fixed inset-x-0 bottom-0 z-50 flex items-stretch justify-around border-t border-orange-100 bg-white/95 px-2 pb-[env(safe-area-inset-bottom)] pt-2 shadow-[0_-6px_24px_rgba(15,23,42,0.08)] backdrop-blur lg:hidden"
        >
          <button
            onClick={() => { setMenuOpen(false); openHome(); }}
            aria-current={pathname === '/' ? 'page' : undefined}
            className={`flex min-w-0 flex-1 flex-col items-center gap-1 rounded-2xl py-2 text-[10px] font-semibold ${pathname === '/' ? 'bg-orange-50 text-orange-600' : 'text-slate-500'}`}
          >
            <HomeIcon size={21} /> <span className="truncate">{t('home')}</span>
          </button>
          <button
            onClick={() => { setMenuOpen(false); openListing(); }}
            aria-current={pathname.startsWith('/products') ? 'page' : undefined}
            className={`flex min-w-0 flex-1 flex-col items-center gap-1 rounded-2xl py-2 text-[10px] font-semibold ${pathname.startsWith('/products') ? 'bg-orange-50 text-orange-600' : 'text-slate-500'}`}
          >
            <Grid2X2 size={21} /> <span className="truncate">{t('products')}</span>
          </button>
          <button
            onClick={() => { setMenuOpen(false); openCategories(); }}
            aria-current={pathname === '/' && location.hash === '#categories' ? 'location' : undefined}
            className={`flex min-w-0 flex-1 flex-col items-center gap-1 rounded-2xl py-2 text-[10px] font-semibold ${pathname === '/' && location.hash === '#categories' ? 'bg-orange-50 text-orange-600' : 'text-slate-500'}`}
          >
            <Store size={21} /> <span className="truncate">{t('allShops')}</span>
          </button>
          <button
            onClick={() => { setMenuOpen(false); navigate('/account/saved'); }}
            aria-current={pathname === '/account/saved' ? 'page' : undefined}
            className={`flex min-w-0 flex-1 flex-col items-center gap-1 rounded-2xl py-2 text-[10px] font-semibold ${pathname === '/account/saved' ? 'bg-orange-50 text-orange-600' : 'text-slate-500'}`}
          >
            <Heart size={21} /> <span className="truncate">{t('savedItems')}</span>
          </button>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            aria-expanded={menuOpen}
            aria-label={t('more')}
            className={`flex min-w-0 flex-1 flex-col items-center gap-1 rounded-2xl py-2 text-[10px] font-semibold ${menuOpen ? 'bg-orange-50 text-orange-600' : 'text-slate-500'}`}
          >
            <LayoutGrid size={21} /> <span className="truncate">{t('more')}</span>
          </button>
        </nav>
      )}
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <LanguageProvider>
        <AppContent />
      </LanguageProvider>
    </BrowserRouter>
  );
}
