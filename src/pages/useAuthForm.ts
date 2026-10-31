import { useEffect, useState, type FormEvent } from 'react';
import type { User } from '@supabase/supabase-js';
import type { Profile } from '@/types';

export type AuthMode = 'closed' | 'login' | 'register' | 'account';

export type AuthPageProps = {
  mode: Exclude<AuthMode, 'closed'>;
  user: User | null;
  profile: Profile | null;
  onModeChange: (mode: AuthMode) => void;
  onSignIn: (email: string, password: string) => Promise<void>;
  onRegister: (fullName: string, email: string, password: string, phone: string) => Promise<void>;
  onSignOut: () => Promise<void>;
  onUpdateProfile: (values: Pick<Profile, 'full_name' | 'phone' | 'address'>) => Promise<void>;
  onUploadProfileAvatar: (file: File) => Promise<void>;
};

const PASSWORD_SYMBOLS = "!@#$%^&*()_+-=[]{};':\"\\|<>?,./`~";

function meetsSignupPasswordPolicy(password: string) {
  return password.length >= 8
    && /[a-z]/.test(password)
    && /[A-Z]/.test(password)
    && /[0-9]/.test(password)
    && [...password].some((character) => PASSWORD_SYMBOLS.includes(character));
}

export function useAuthForm({ user, profile, onSignIn, onRegister, onUpdateProfile }: AuthPageProps) {
  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [address, setAddress] = useState(profile?.address ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [formError, setFormError] = useState('');

  useEffect(() => {
    setFullName(profile?.full_name ?? '');
    setPhone(profile?.phone ?? '');
    setAddress(profile?.address ?? '');
    setEmail(user?.email ?? '');
  }, [profile, user]);

  const submit = async (event: FormEvent<HTMLFormElement>, mode: 'login' | 'register' | 'account') => {
    event.preventDefault();
    if (mode === 'register' && !meetsSignupPasswordPolicy(password)) {
      setFormError('Use at least 8 characters with an uppercase letter, a lowercase letter, a number, and a symbol.');
      setMessage('');
      return;
    }
    setSubmitting(true);
    setFormError('');
    setMessage('');
    try {
      if (mode === 'login') await onSignIn(email, password);
      if (mode === 'register') await onRegister(fullName, email, password, phone);
      if (mode === 'account') {
        await onUpdateProfile({ full_name: fullName.trim(), phone: phone.trim(), address: address.trim() });
        setMessage('Your account details have been saved.');
      }
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return {
    fullName, setFullName, email, setEmail, password, setPassword, phone, setPhone, address, setAddress,
    submitting, message, formError, submit,
  };
}
