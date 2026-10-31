import { Link } from 'react-router-dom';
import { EmailField, PasswordField, SubmitButton } from '@/pages/AuthShared';
import { useAuthForm, type AuthPageProps } from '@/pages/useAuthForm';

/**
 * One page for both /login and /register.
 *
 * Structure:
 *   page (background image + dark tint)
 *   └─ big card (rounded, overflow-hidden)
 *      ├─ register pane  (left half)
 *      ├─ login pane     (right half)
 *      └─ sliding panel  (covers whichever half is NOT active)
 *
 * The active pane is visible; the other one fades to opacity-0 and is hidden
 * from keyboard / screen readers. The sliding panel moves to the hidden side.
 */
export function AuthPage(props: AuthPageProps) {
  const isRegister = props.mode === 'register';

  // Two separate form states, so an error or a typed password in one form
  // never leaks into the other.
  const loginForm = useAuthForm({ ...props, mode: 'login' });
  const registerForm = useAuthForm({ ...props, mode: 'register' });

  const paneBase =
    'row-start-1 flex flex-col justify-center px-7 py-10 sm:px-12 ' +
    'transition-[opacity,visibility] duration-500 ease-out motion-reduce:transition-none';
  const visible = 'opacity-100 visible';
  const hidden = 'opacity-0 invisible pointer-events-none';

  return (
    <div
      className="relative flex min-h-screen items-center justify-center px-4 py-10"
      style={{
        backgroundImage: "url('/auth-bg.jpg')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* light orange tint over the photo */}
      <div className="absolute inset-0 bg-orange-200/40" aria-hidden="true" />

      {/* ─────────── THE BIG DIV ─────────── */}
      <div className="relative grid w-full max-w-4xl overflow-hidden rounded-[32px] bg-white shadow-2xl ring-1 ring-white/40 md:grid-cols-2">
        {/* ── Register pane (left) ── */}
        <section
          aria-hidden={!isRegister}
          aria-label="Register"
          className={`${paneBase} col-start-1 ${isRegister ? visible : hidden}`}
        >
          <Brand />
          <h2 className="mt-6 text-3xl font-black tracking-tight text-slate-900">Create your account</h2>
          <p className="mt-2 text-sm text-slate-500">It only takes a minute to get started.</p>

          <form
            onSubmit={(event) => void registerForm.submit(event, 'register')}
            className="mt-6 space-y-4"
          >
            <label className="block text-sm font-bold">
              Full name
              <input
                value={registerForm.fullName}
                onChange={(event) => registerForm.setFullName(event.target.value)}
                required
                className="auth-input"
              />
            </label>
            <label className="block text-sm font-bold">
              Phone number
              <input
                type="tel"
                value={registerForm.phone}
                onChange={(event) => registerForm.setPhone(event.target.value)}
                placeholder="e.g. 0712 345 678"
                required
                pattern="^[0-9+ ()-]{10,16}$"
                title="Use a Tanzanian mobile number, such as 0712 345 678"
                className="auth-input"
              />
            </label>
            <EmailField value={registerForm.email} onChange={registerForm.setEmail} />
            <PasswordField value={registerForm.password} onChange={registerForm.setPassword} signup />
            <SubmitButton submitting={registerForm.submitting} label="Create account" />
            {registerForm.formError && (
              <p className="text-sm font-semibold text-red-600">{registerForm.formError}</p>
            )}
          </form>

          {/* mobile only: the sliding panel is hidden on small screens */}
          <p className="mt-6 text-center text-sm text-slate-500 md:hidden">
            Already have an account?{' '}
            <button
              type="button"
              onClick={() => props.onModeChange('login')}
              className="font-bold text-orange-600 hover:text-orange-700"
            >
              Sign in
            </button>
          </p>
        </section>

        {/* ── Login pane (right) ── */}
        <section
          aria-hidden={isRegister}
          aria-label="Sign in"
          className={`${paneBase} col-start-1 md:col-start-2 ${isRegister ? hidden : visible}`}
        >
          <Brand />
          <h2 className="mt-6 text-3xl font-black tracking-tight text-slate-900">Welcome back</h2>
          <p className="mt-2 text-sm text-slate-500">Sign in to manage your iCa account.</p>

          <form
            onSubmit={(event) => void loginForm.submit(event, 'login')}
            className="mt-6 space-y-4"
          >
            <EmailField value={loginForm.email} onChange={loginForm.setEmail} />
            <PasswordField value={loginForm.password} onChange={loginForm.setPassword} />
            <SubmitButton submitting={loginForm.submitting} label="Sign in" />
            {loginForm.formError && (
              <p className="text-sm font-semibold text-red-600">{loginForm.formError}</p>
            )}
          </form>

          <p className="mt-6 text-center text-sm text-slate-500 md:hidden">
            Don’t have an account?{' '}
            <button
              type="button"
              onClick={() => props.onModeChange('register')}
              className="font-bold text-orange-600 hover:text-orange-700"
            >
              Register
            </button>
          </p>
        </section>

        {/* ── Sliding panel (desktop only) ──
            Sits on the half that is currently hidden, inset from the card edge with rounded corners.
            Login active    -> panel on the LEFT  (covers register)
            Register active -> panel on the RIGHT (covers login)   */}
        <div
          className={`absolute inset-y-3 left-3 z-10 hidden w-[calc(50%-0.75rem)] overflow-hidden rounded-[26px] bg-gradient-to-br from-orange-100/90 via-orange-200/85 to-amber-200/80 text-slate-900 backdrop-blur-md transition-transform duration-500 ease-in-out motion-reduce:transition-none md:block ${
            isRegister ? 'translate-x-full' : 'translate-x-0'
          }`}
        >
          <div className="grid h-full">
            <PanelMessage
              active={!isRegister}
              title="New to iCa?"
              text="Create an account to save products, track orders and check out faster."
              action="Create account"
              onClick={() => props.onModeChange('register')}
            />
            <PanelMessage
              active={isRegister}
              title="Already have an account?"
              text="Sign in to see your orders, saved items and notifications."
              action="Sign in"
              onClick={() => props.onModeChange('login')}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function Brand() {
  return (
    <Link to="/" className="flex w-fit items-center gap-2" aria-label="Back to iCa home">
      <img src="/logo.jpeg" alt="" className="h-10 w-10 rounded-xl object-cover" />
      <span className="text-lg font-black tracking-tight">
        iCa<span className="text-orange-500">.</span>
      </span>
    </Link>
  );
}

function PanelMessage({
  active,
  title,
  text,
  action,
  onClick,
}: {
  active: boolean;
  title: string;
  text: string;
  action: string;
  onClick: () => void;
}) {
  return (
    <div
      aria-hidden={!active}
      className={`col-start-1 row-start-1 flex flex-col items-center justify-center px-10 text-center transition-[opacity,visibility] duration-500 motion-reduce:transition-none ${
        active ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'
      }`}
    >
      <h3 className="text-3xl font-black tracking-tight">{title}</h3>
      <p className="mt-3 max-w-xs text-sm text-slate-700">{text}</p>
      <button
        type="button"
        onClick={onClick}
        className="mt-7 rounded-xl bg-orange-500 px-7 py-3 text-sm font-bold text-white shadow-lg shadow-orange-500/30 transition hover:bg-orange-600 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-300"
      >
        {action}
      </button>
    </div>
  );
}