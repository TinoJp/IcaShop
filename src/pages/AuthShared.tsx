import type { ReactNode } from 'react';
import type { AuthPageProps } from '@/pages/useAuthForm';

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <section className="mx-auto mt-10 grid max-w-4xl overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-orange-100 lg:grid-cols-[0.8fr_1.2fr]">
      <div className="bg-orange-500 p-8 text-white sm:p-10">
        <img src="/logo.jpeg" alt="iCa Shop it Love it logo" className="h-14 w-14 rounded-2xl object-cover" />
        <p className="mt-12 text-sm font-semibold text-orange-100">Shop it · Love it</p>
        <h1 className="mt-3 text-4xl font-black leading-tight">
          Good finds
          <br />
          start here.
        </h1>
        <p className="mt-5 text-sm leading-6 text-orange-50">Create an account to save favourites and keep your delivery details ready.</p>
      </div>
      <div className="p-6 sm:p-10">{children}</div>
    </section>
  );
}

export function AuthTabs({ mode, onModeChange }: { mode: 'login' | 'register'; onModeChange: AuthPageProps['onModeChange'] }) {
  return (
    <div className="mb-8 flex gap-5 border-b border-slate-100 text-sm font-bold">
      <button
        onClick={() => onModeChange('login')}
        className={`pb-3 ${mode === 'login' ? 'border-b-2 border-orange-500 text-orange-600' : 'text-slate-400'}`}
      >
        Sign in
      </button>
      <button
        onClick={() => onModeChange('register')}
        className={`pb-3 ${mode === 'register' ? 'border-b-2 border-orange-500 text-orange-600' : 'text-slate-400'}`}
      >
        Create account
      </button>
    </div>
  );
}

export function EmailField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <label className="block text-sm font-bold">
      Email address
      <input
        type="email"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required
        className="auth-input"
      />
    </label>
  );
}

export function PasswordField({ value, onChange, signup = false }: { value: string; onChange: (value: string) => void; signup?: boolean }) {
  return (
    <label className="block text-sm font-bold">
      Password
      <input
        type="password"
        minLength={signup ? 8 : undefined}
        autoComplete={signup ? 'new-password' : 'current-password'}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required
        className="auth-input"
      />
      {signup && <span className="mt-2 block text-xs font-normal leading-5 text-slate-500">At least 8 characters, including uppercase and lowercase letters, a number, and a symbol.</span>}
    </label>
  );
}

export function SubmitButton({ submitting, label }: { submitting: boolean; label: string }) {
  return (
    <button
      disabled={submitting}
      className="w-full rounded-xl bg-orange-500 py-3 font-bold text-white transition hover:bg-orange-600 disabled:bg-slate-300"
    >
      {submitting ? 'Please wait…' : label}
    </button>
  );
}
