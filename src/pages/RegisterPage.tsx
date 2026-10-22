import {
  AuthLayout,
  AuthTabs,
  EmailField,
  PasswordField,
  SubmitButton,
} from '@/pages/AuthShared';
import { useAuthForm, type AuthPageProps } from '@/pages/useAuthForm';

export function RegisterPage(props: AuthPageProps) {
  const form = useAuthForm(props);

  return (
    <AuthLayout>
      <AuthTabs mode="register" onModeChange={props.onModeChange} />
      <h2 className="text-2xl font-black">Create your account</h2>
      <p className="mt-2 text-sm text-slate-500">It only takes a minute to get started.</p>
      <form onSubmit={(event) => void form.submit(event, 'register')} className="mt-7 space-y-5">
        <label className="block text-sm font-bold">
          Full name
          <input
            value={form.fullName}
            onChange={(event) => form.setFullName(event.target.value)}
            required
            className="auth-input"
          />
        </label>
        <label className="block text-sm font-bold">
          Phone number
          <input
            type="tel"
            value={form.phone}
            onChange={(event) => form.setPhone(event.target.value)}
            placeholder="e.g. 0712 345 678"
            required
            pattern="^[0-9+ ()-]{10,16}$"
            title="Use a Tanzanian mobile number, such as 0712 345 678"
            className="auth-input"
          />
        </label>
        <EmailField value={form.email} onChange={form.setEmail} />
        <PasswordField value={form.password} onChange={form.setPassword} signup />
        <SubmitButton submitting={form.submitting} label="Create account" />
        {form.formError && <p className="text-sm font-semibold text-red-600">{form.formError}</p>}
      </form>
    </AuthLayout>
  );
}
