import {
  AuthLayout,
  EmailField,
  PasswordField,
  SubmitButton,
} from '@/pages/AuthShared';
import { useAuthForm, type AuthPageProps } from '@/pages/useAuthForm';

export function LoginPage(props: AuthPageProps) {
  const form = useAuthForm(props);

  return (
    <AuthLayout>
      <div className="text-center">
        <h2 className="text-3xl font-black tracking-tight text-slate-900">Welcome back</h2>
        <p className="mt-2 text-sm text-slate-500">Sign in to manage your iCa account.</p>
      </div>
      <form onSubmit={(event) => void form.submit(event, 'login')} className="mt-7 space-y-5">
        <EmailField value={form.email} onChange={form.setEmail} />
        <PasswordField value={form.password} onChange={form.setPassword} />
        <SubmitButton submitting={form.submitting} label="Sign in" />
        {form.formError && <p className="text-sm font-semibold text-red-600">{form.formError}</p>}
      </form>
      <p className="mt-6 text-center text-sm text-slate-500">
        Don’t have an account?{' '}
        <button
          type="button"
          onClick={() => props.onModeChange('register')}
          className="font-bold text-orange-600 hover:text-orange-700"
        >
          Register
        </button>
      </p>
    </AuthLayout>
  );
}
