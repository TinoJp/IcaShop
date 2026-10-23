import { Link } from 'react-router-dom';
import { ArrowUp, Banknote, Mail, MapPin, MessageCircle, Phone, Truck } from 'lucide-react';
import { useLanguage } from '@/i18n';
import { siteConfig } from '@/siteConfig';
import type { Category } from '@/types';

type FooterProps = {
  categories: Category[];
  onCategory: (id: string) => void;
};

const linkClass = 'text-slate-400 transition hover:text-orange-400';

export function Footer({ categories, onCategory }: FooterProps) {
  const { t } = useLanguage();
  const { whatsapp, phone, email, location, social } = siteConfig;

  const whatsappDigits = whatsapp.replace(/\D/g, '');
  const phoneLink = phone.replace(/[^\d+]/g, '');
  const socials = [
    { label: 'Instagram', href: social.instagram },
    { label: 'Facebook', href: social.facebook },
    { label: 'TikTok', href: social.tiktok },
  ].filter((item) => item.href);
  const hasContact = Boolean(whatsappDigits || phoneLink || email || location);

  return (
    <footer id="footer" className="bg-[#0F172A] text-white">
      <div className="border-b border-white/10">
        <div className="mx-auto grid max-w-7xl gap-4 px-4 py-6 sm:grid-cols-2 sm:px-8">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/15 text-orange-400">
              <Banknote size={20} />
            </span>
            <p className="text-sm font-semibold">{t('cashOnDelivery')}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/15 text-orange-400">
              <Truck size={20} />
            </span>
            <p className="text-sm font-semibold">{t('deliveryEverywhere')}</p>
          </div>
        </div>
      </div>

      <div
        className={`mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:grid-cols-2 sm:px-8 ${
          hasContact ? 'lg:grid-cols-[1.4fr_1fr_1fr_1.2fr]' : 'lg:grid-cols-[1.4fr_1fr_1fr]'
        }`}
      >
        <div>
          <Link to="/" className="flex items-center gap-3" aria-label="iCa home">
            <img src="/logo.jpeg" alt="iCa Shop it Love it logo" className="h-14 w-14 rounded-2xl object-cover" />
            <span className="text-xl font-black tracking-tight">
              iCa<span className="text-orange-500">.</span>
            </span>
          </Link>
          <p className="mt-4 max-w-xs text-sm leading-6 text-slate-400">Shop it · Love it. {t('footerTagline')}</p>

          {socials.length > 0 && (
            <div className="mt-5">
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">{t('followUs')}</p>
              <div className="flex flex-wrap gap-2">
                {socials.map((item) => (
                  <a
                    key={item.label}
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-full border border-white/15 px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:border-orange-400 hover:text-orange-400"
                  >
                    {item.label}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        <div>
          <h3 className="font-bold">{t('footerShop')}</h3>
          <ul className="mt-4 space-y-3 text-sm">
            <li>
              <Link to="/" className={linkClass}>{t('home')}</Link>
            </li>
            <li>
              <Link to="/about" className={linkClass}>{t('aboutUs')}</Link>
            </li>
            <li>
              <button onClick={() => onCategory('all')} className={linkClass}>{t('allProducts')}</button>
            </li>
            {categories.slice(0, 5).map((category) => (
              <li key={category.id}>
                <button onClick={() => onCategory(category.id)} className={`${linkClass} text-left`}>
                  {category.name}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="font-bold">{t('customerCare')}</h3>
          <ul className="mt-4 space-y-3 text-sm">
            <li>
              <Link to="/account" className={linkClass}>{t('myAccount')}</Link>
            </li>
            <li>
              <Link to="/account/orders" className={linkClass}>{t('trackOrder')}</Link>
            </li>
            <li>
              <Link to="/account/saved" className={linkClass}>{t('savedItems')}</Link>
            </li>
          </ul>
        </div>

        {hasContact && (
          <div>
            <h3 className="font-bold">{t('getInTouch')}</h3>
            <p className="mt-4 text-sm leading-6 text-slate-400">{t('footerContactHint')}</p>
            <ul className="mt-4 space-y-3 text-sm">
              {whatsappDigits && (
                <li>
                  <a
                    href={`https://wa.me/${whatsappDigits}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex items-center gap-2 ${linkClass}`}
                  >
                    <MessageCircle size={16} className="shrink-0 text-orange-400" /> {t('chatWhatsapp')}
                  </a>
                </li>
              )}
              {phoneLink && (
                <li>
                  <a href={`tel:${phoneLink}`} className={`flex items-center gap-2 ${linkClass}`}>
                    <Phone size={16} className="shrink-0 text-orange-400" /> {phone}
                  </a>
                </li>
              )}
              {email && (
                <li>
                  <a href={`mailto:${email}`} className={`flex items-center gap-2 break-all ${linkClass}`}>
                    <Mail size={16} className="shrink-0 text-orange-400" /> {email}
                  </a>
                </li>
              )}
              {location && (
                <li className="flex items-center gap-2 text-slate-400">
                  <MapPin size={16} className="shrink-0 text-orange-400" /> {location}
                </li>
              )}
            </ul>
          </div>
        )}
      </div>

      <div className="border-t border-white/10 px-4 py-5 sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} iCa. {t('rights')}</p>
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex items-center gap-1.5 font-semibold text-slate-400 transition hover:text-orange-400"
          >
            {t('backToTop')} <ArrowUp size={14} />
          </button>
        </div>
      </div>
    </footer>
  );
}
