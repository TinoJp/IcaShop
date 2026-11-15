import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('getSupabaseConfig', () => {
  it('throws a clear error when the Supabase URL is missing', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', '');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon-key');

    const { getSupabaseConfig } = await import('./supabase');

    expect(() =>
      getSupabaseConfig({
        VITE_SUPABASE_URL: '',
        VITE_SUPABASE_ANON_KEY: 'anon-key',
      })
    ).toThrow('Missing required environment variables');
  });

  it('throws a clear error when the anonymous key is missing', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', '');

    const { getSupabaseConfig } = await import('./supabase');

    expect(() =>
      getSupabaseConfig({
        VITE_SUPABASE_URL: 'https://example.supabase.co',
        VITE_SUPABASE_ANON_KEY: '',
      })
    ).toThrow('Missing required environment variables');
  });

  it('returns the configured values when both values are present', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon-key');

    const { getSupabaseConfig } = await import('./supabase');

    expect(
      getSupabaseConfig({
        VITE_SUPABASE_URL: 'https://example.supabase.co',
        VITE_SUPABASE_ANON_KEY: 'anon-key',
      })
    ).toEqual({
      url: 'https://example.supabase.co',
      anonKey: 'anon-key',
    });
  });
});
