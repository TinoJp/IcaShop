import { useState } from 'react';
import { Camera, UserRound } from 'lucide-react';
import { useAuthForm, type AuthPageProps } from '@/pages/useAuthForm';

export function AccountPage(props: AuthPageProps) {
  const form = useAuthForm(props);
  const [avatarError, setAvatarError] = useState('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const uploadAvatar = async (file: File | undefined) => {
    if (!file) return;
    setAvatarError('');
    setUploadingAvatar(true);
    try {
      await props.onUploadProfileAvatar(file);
    } catch (cause) {
      setAvatarError(cause instanceof Error ? cause.message : 'We could not upload your profile photo.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  return (
    <section className="mx-auto mt-10 max-w-3xl rounded-3xl bg-white p-6 shadow-sm ring-1 ring-orange-100 sm:p-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-500">My account</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight">
            Welcome back{props.profile?.full_name ? `, ${props.profile.full_name.split(' ')[0]}` : ''}.
          </h1>
          <p className="mt-2 text-sm text-slate-500">Keep your delivery details ready for checkout.</p>
        </div>
        <div className="rounded-full bg-orange-100 px-3 py-1 text-xs font-bold text-orange-600">
          {props.profile?.role === 'admin' ? 'Admin account' : 'Customer account'}
        </div>
      </div>
      <div className="mt-8 flex flex-wrap items-center gap-5">
        <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-orange-50 ring-4 ring-orange-100">
          {props.profile?.avatar_url ? (
            <img src={props.profile.avatar_url} alt="Your profile" className="h-full w-full object-cover" />
          ) : (
            <UserRound size={38} className="text-orange-400" aria-hidden="true" />
          )}
        </div>
        <div>
          <label className={`inline-flex cursor-pointer items-center gap-2 rounded-xl border border-orange-200 px-4 py-2.5 text-sm font-bold text-orange-600 transition hover:bg-orange-50 ${uploadingAvatar ? 'pointer-events-none opacity-60' : ''}`}>
            <Camera size={17} />
            {uploadingAvatar ? 'Uploading…' : props.profile?.avatar_url ? 'Change photo' : 'Add profile photo'}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              className="sr-only"
              disabled={uploadingAvatar}
              onChange={(event) => {
                void uploadAvatar(event.target.files?.[0]);
                event.currentTarget.value = '';
              }}
            />
          </label>
          <p className="mt-2 text-xs text-slate-500">JPG, PNG, WebP, or AVIF · up to 5 MB</p>
          {avatarError && <p role="alert" className="mt-2 text-sm font-semibold text-red-600">{avatarError}</p>}
        </div>
      </div>
      <form onSubmit={(event) => void form.submit(event, 'account')} className="mt-8 grid gap-5 sm:grid-cols-2">
        <label className="text-sm font-bold">
          Full name
          <input value={form.fullName} onChange={(event) => form.setFullName(event.target.value)} required className="auth-input" />
        </label>
        <label className="text-sm font-bold">
          Email address
          <input value={form.email} readOnly className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-normal text-slate-500" />
        </label>
        <label className="text-sm font-bold">
          Phone number
          <input
            value={form.phone}
            onChange={(event) => form.setPhone(event.target.value)}
            placeholder="e.g. 0712 345 678"
            className="auth-input"
          />
        </label>
        <label className="text-sm font-bold sm:col-span-2">
          Delivery address
          <textarea
            value={form.address}
            onChange={(event) => form.setAddress(event.target.value)}
            rows={3}
            placeholder="Street, area, city"
            className="auth-input resize-none"
          />
        </label>
        <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
          <button
            disabled={form.submitting}
            className="rounded-xl bg-orange-500 px-5 py-3 text-sm font-bold text-white transition hover:bg-orange-600 disabled:bg-slate-300"
          >
            {form.submitting ? 'Saving…' : 'Save details'}
          </button>
          <button
            type="button"
            onClick={() => void props.onSignOut()}
            className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-600 hover:border-orange-300 hover:text-orange-600"
          >
            Sign out
          </button>
          {form.message && <span className="text-sm font-semibold text-orange-600">{form.message}</span>}
        </div>
        {form.formError && <p className="text-sm font-semibold text-red-600 sm:col-span-2">{form.formError}</p>}
      </form>
    </section>
  );
}
