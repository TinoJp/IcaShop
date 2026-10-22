import {
  AuthLayout,
  AuthTabs,
  EmailField,
  PasswordField,
  SubmitButton,
} from '@/pages/AuthShared';
import { useAuthForm, type AuthPageProps } from '@/pages/useAuthForm';

export function LoginPage(props: AuthPageProps) {
  const form = useAuthForm(props);

  return (
    <AuthLayout>
      <AuthTabs mode="login" onModeChange={props.onModeChange} />
      <h2 className="text-2xl font-black">Welcome back</h2>
      <p className="mt-2 text-sm text-slate-500">Sign in to manage your iCa account.</p>
      <form onSubmit={(event) => void form.submit(event, 'login')} className="mt-7 space-y-5">
        <EmailField value={form.email} onChange={form.setEmail} />
        <PasswordField value={form.password} onChange={form.setPassword} />
        <SubmitButton submitting={form.submitting} label="Sign in" />
        {form.formError && <p className="text-sm font-semibold text-red-600">{form.formError}</p>}
      </form>
    </AuthLayout>
  );
}
