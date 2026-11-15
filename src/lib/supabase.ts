import { createClient } from '@supabase/supabase-js';

type SupabaseEnv = {
  VITE_SUPABASE_URL?: string;
  VITE_SUPABASE_ANON_KEY?: string;
};

type SupabaseClient = ReturnType<typeof createClient>;

let cachedClient: SupabaseClient | null = null;

export function getSupabaseConfig(env: SupabaseEnv = import.meta.env) {
  const url = (env.VITE_SUPABASE_URL ?? '').trim();
  const anonKey = (env.VITE_SUPABASE_ANON_KEY ?? '').trim();

  if (!url || !anonKey) {
    throw new Error(
      'Missing required environment variables: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY. Add them to your .env file before starting the app.'
    );
  }

  return { url, anonKey };
}

export function getSupabaseClient(env: SupabaseEnv = import.meta.env): SupabaseClient {
  if (cachedClient) return cachedClient;

  const { url, anonKey } = getSupabaseConfig(env);
  cachedClient = createClient(url, anonKey);
  return cachedClient;
}

export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getSupabaseClient();
    const value = Reflect.get(client as object, prop);
    return typeof value === 'function' ? value.bind(client) : value;
  },
  set(_target, prop, value) {
    const client = getSupabaseClient();
    return Reflect.set(client as object, prop, value);
  },
  has(_target, prop) {
    return prop in getSupabaseClient();
  },
  ownKeys() {
    return Reflect.ownKeys(getSupabaseClient() as object);
  },
  getOwnPropertyDescriptor(_target, prop) {
    const descriptor = Object.getOwnPropertyDescriptor(getSupabaseClient() as object, String(prop));
    return descriptor ? { ...descriptor, configurable: true } : undefined;
  },
});
