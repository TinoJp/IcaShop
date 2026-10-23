import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, MessageCircle, PackageCheck, Search, ShieldCheck, Truck } from 'lucide-react';
import { useLanguage } from '@/i18n';
import { siteConfig } from '@/siteConfig';

export function AboutPage() {
  const { lang } = useLanguage();
  const isSwahili = lang === 'sw';
  const whatsapp = siteConfig.whatsapp.replace(/\D/g, '');

  const steps = isSwahili
    ? [
        { icon: Search, title: 'Tafuta unachohitaji', text: 'Vinjari bidhaa au tumia sehemu ya kutafuta kwa jina, maelezo au kundi la bidhaa.' },
        { icon: PackageCheck, title: 'Weka oda kwa urahisi', text: 'Ongeza bidhaa kwenye kikapu, jaza jina, namba ya simu na anwani ya kupokea.' },
        { icon: MessageCircle, title: 'Thibitisha kwa WhatsApp', text: 'Ujumbe wenye muhtasari wa oda yako utafunguka WhatsApp ili uwasiliane nasi na kupanga delivery.' },
        { icon: Truck, title: 'Pokea na ulipe', text: 'Tutawasiliana nawe kuhusu oda na delivery. Kwa sasa unalipa kwa Cash on Delivery unapopokea bidhaa.' },
      ]
    : [
        { icon: Search, title: 'Find what you need', text: 'Browse the catalog or search by product name, description, or category.' },
        { icon: PackageCheck, title: 'Place your order easily', text: 'Add products to your cart and provide your name, phone number, and delivery address.' },
        { icon: MessageCircle, title: 'Confirm on WhatsApp', text: 'A message with your order summary opens in WhatsApp so you can contact us and arrange delivery.' },
        { icon: Truck, title: 'Receive and pay', text: 'We will contact you about your order and delivery. Payment is currently Cash on Delivery when you receive your items.' },
      ];

  return (
    <article className="mx-auto max-w-5xl py-8 sm:py-12">
      <section className="relative overflow-hidden rounded-3xl bg-[#0F172A] px-6 py-10 text-white shadow-xl sm:px-12 sm:py-14">
        <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-orange-500/20 blur-3xl" />
        <div className="relative max-w-2xl">
          <p className="text-xs font-black uppercase tracking-[.2em] text-orange-400">iCa · Shop it · Love it</p>
          <h1 className="mt-4 text-3xl font-black leading-tight sm:text-5xl">
            {isSwahili ? 'Ununuzi rahisi, wa kuaminika.' : 'A simpler, more reassuring way to shop.'}
          </h1>
          <p className="mt-5 max-w-xl text-sm leading-7 text-slate-300 sm:text-base">
            {isSwahili
              ? 'iCa ni duka la mtandaoni linalokusaidia kupata bidhaa nzuri kwa urahisi na kuagiza ukiwa popote Tanzania. Tunafanya mchakato uwe wazi, rahisi na unaokupa nafasi ya kuwasiliana nasi kabla ya kupokea oda.'
              : 'iCa is an online shop helping you discover useful finds and order from wherever you are in Tanzania. We keep shopping straightforward, make order details clear, and give you a direct way to speak with us before delivery.'}
          </p>
          <Link to="/products" className="mt-8 inline-flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-3 font-bold text-white transition hover:bg-orange-600">
            {isSwahili ? 'Anza kutazama bidhaa' : 'Start exploring products'} <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      <section className="mt-12">
        <div className="max-w-2xl">
          <p className="text-xs font-black uppercase tracking-[.18em] text-orange-600">{isSwahili ? 'Jinsi ya kuagiza' : 'How it works'}</p>
          <h2 className="mt-2 text-2xl font-black sm:text-3xl">{isSwahili ? 'Hatua chache tu kutoka kuchagua hadi kupokea.' : 'A few simple steps from browsing to delivery.'}</h2>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {steps.map(({ icon: Icon, title, text }, index) => (
            <section key={title} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-orange-100 sm:p-6">
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-orange-50 text-orange-600"><Icon size={21} /></span>
                <span className="text-xs font-black uppercase tracking-wide text-orange-500">{isSwahili ? 'Hatua' : 'Step'} {index + 1}</span>
              </div>
              <h3 className="mt-4 font-black">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
            </section>
          ))}
        </div>
      </section>

      <section className="mt-8 grid gap-4 rounded-2xl border border-emerald-100 bg-emerald-50 p-5 sm:grid-cols-[auto_1fr] sm:items-center sm:p-7">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white text-emerald-600"><ShieldCheck size={24} /></span>
        <div>
          <h2 className="font-black">{isSwahili ? 'Lipa unapopokea' : 'Pay when your order arrives'}</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            {isSwahili
              ? 'Malipo ya sasa ni Cash on Delivery. Hakuna malipo yanayochukuliwa mtandaoni wakati wa kuweka oda; utalipa unapopokea bidhaa zako.'
              : 'Cash on Delivery is currently available. You are not charged online when placing an order; payment is made when you receive your items.'}
          </p>
        </div>
      </section>

      <section className="mt-10 rounded-2xl bg-[#FFF1E6] p-6 text-center sm:p-9">
        <CheckCircle2 className="mx-auto text-orange-600" size={30} />
        <h2 className="mt-3 text-2xl font-black">{isSwahili ? 'Tuko tayari kukusaidia.' : 'We are here to help.'}</h2>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-600">
          {isSwahili
            ? 'Una swali kabla ya kuagiza? Wasiliana nasi WhatsApp, au anza kutazama bidhaa na uchague kinachokufaa.'
            : 'Have a question before ordering? Message us on WhatsApp, or explore the catalog and find something that suits you.'}
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <Link to="/products" className="rounded-xl bg-orange-500 px-5 py-3 text-sm font-bold text-white transition hover:bg-orange-600">
            {isSwahili ? 'Tazama bidhaa' : 'Browse products'}
          </Link>
          {whatsapp && <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-white px-5 py-3 text-sm font-bold text-emerald-700 transition hover:bg-emerald-50"><MessageCircle size={17} />WhatsApp</a>}
        </div>
      </section>
    </article>
  );
}
