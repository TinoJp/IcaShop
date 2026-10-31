import { useState, type ReactNode } from 'react';
import { Eye, EyeOff, LockKeyhole, Mail } from 'lucide-react';

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <section className="relative mx-auto my-8 flex min-h-[min(680px,calc(100vh-12rem))] max-w-5xl items-center justify-center overflow-hidden rounded-[2rem] bg-gradient-to-br from-orange-100 via-[#FFF8F1] to-amber-50 px-4 py-10 sm:my-10 sm:px-8">
      <div className="pointer-events-none absolute -left-20 top-8 h-56 w-56 rounded-full bg-orange-200/50 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 right-0 h-72 w-72 rounded-full bg-amber-200/50 blur-3xl" />
      <div className="relative w-full max-w-md rounded-[1.75rem] border border-orange-100 bg-white/95 p-6 shadow-[0_24px_70px_rgba(154,75,18,0.12)] backdrop-blur sm:p-9">
        <div className="mb-7 text-center">
          <img src="/logo.jpeg" alt="iCa Shop it Love it logo" className="mx-auto h-16 w-16 rounded-2xl object-cover shadow-sm ring-4 ring-orange-50" />
          <p className="mt-3 text-sm font-bold text-orange-600">Shop it · Love it</p>
        </div>
        {children}
      </div>
    </section>
  );
}

export function EmailField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <label className="block text-sm font-bold">
      Email address
      <span className="mt-2 flex items-center gap-3 rounded-xl border border-orange-100 bg-orange-50/40 px-4 transition focus-within:border-orange-400 focus-within:ring-4 focus-within:ring-orange-100">
        <Mail size={18} className="shrink-0 text-orange-500" aria-hidden="true" />
        <input
          type="email"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          required
          autoComplete="email"
          placeholder="you@example.com"
          className="min-w-0 flex-1 bg-transparent py-3 outline-none placeholder:text-slate-400"
        />
      </span>
    </label>
  );
}

export function PasswordField({ value, onChange, signup = false }: { value: string; onChange: (value: string) => void; signup?: boolean }) {
  const [visible, setVisible] = useState(false);
  return (
    <label className="block text-sm font-bold">
      Password
      <span className="mt-2 flex items-center gap-3 rounded-xl border border-orange-100 bg-orange-50/40 px-4 transition focus-within:border-orange-400 focus-within:ring-4 focus-within:ring-orange-100">
        <LockKeyhole size={18} className="shrink-0 text-orange-500" aria-hidden="true" />
        <input
          type={visible ? 'text' : 'password'}
          minLength={signup ? 8 : undefined}
          autoComplete={signup ? 'new-password' : 'current-password'}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          required
          placeholder="Enter your password"
          className="min-w-0 flex-1 bg-transparent py-3 outline-none placeholder:text-slate-400"
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          className="shrink-0 rounded-md p-1 text-slate-400 transition hover:text-orange-600"
        >
          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </span>
      {signup && <span className="mt-2 block text-xs font-normal leading-5 text-slate-500">At least 8 characters, including uppercase and lowercase letters, a number, and a symbol.</span>}
    </label>
  );
}

export function SubmitButton({ submitting, label }: { submitting: boolean; label: string }) {
  return (
    <button
      disabled={submitting}
      className="w-full rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 py-3.5 font-bold text-white shadow-lg shadow-orange-500/20 transition hover:from-orange-600 hover:to-amber-600 disabled:cursor-not-allowed disabled:from-slate-300 disabled:to-slate-300 disabled:shadow-none"
    >
      {submitting ? 'Please wait…' : label}
    </button>
  );
}
