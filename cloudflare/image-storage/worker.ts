interface R2Bucket {
  put(
    key: string,
    value: ArrayBuffer,
    options: { httpMetadata: { contentType: string; cacheControl: string } },
  ): Promise<unknown>;
  head(key: string): Promise<{ key: string } | null>;
  delete(key: string): Promise<void>;
}

interface Env {
  IMAGES: R2Bucket;
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  PUBLIC_IMAGE_BASE_URL: string;
  ALLOWED_ORIGINS: string;
}

type AuthenticatedUser = { id: string };
type ImageKind = 'avatar' | 'product';

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const allowedTypes = new Map([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
  ['image/avif', 'avif'],
]);
const maxFileSize = 5 * 1024 * 1024;

class HttpError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
  }
}

function jsonResponse(body: object, status: number, origin: string | null): Response {
  const headers = new Headers({
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    Vary: 'Origin',
  });
  if (origin) {
    headers.set('Access-Control-Allow-Origin', origin);
    headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    headers.set('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  }
  return new Response(JSON.stringify(body), { status, headers });
}

function imageBaseUrl(env: Env): URL {
  const base = new URL(env.PUBLIC_IMAGE_BASE_URL);
  if (base.protocol !== 'https:' || base.username || base.password || base.search || base.hash) {
    throw new Error('PUBLIC_IMAGE_BASE_URL must be an HTTPS URL without credentials, query, or fragment.');
  }
  base.pathname = `${base.pathname.replace(/\/+$/, '')}/`;
  return base;
}

async function authenticate(request: Request, env: Env): Promise<AuthenticatedUser> {
  const token = request.headers.get('Authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) throw new HttpError(401, 'Please sign in to manage images.');

  const response = await fetch(`${env.SUPABASE_URL.replace(/\/+$/, '')}/auth/v1/user`, {
    headers: {
      apikey: env.SUPABASE_ANON_KEY,
      Authorization: `Bearer ${token}`,
    },
  });
  if (response.status === 401 || response.status === 403) {
    throw new HttpError(401, 'Your session is invalid or expired. Please sign in again.');
  }
  if (!response.ok) throw new HttpError(502, 'Could not verify your account with Supabase.');

  const user = await response.json() as { id?: string };
  if (!user.id || !uuidPattern.test(user.id)) throw new HttpError(401, 'Your session is invalid.');
  return { id: user.id };
}

async function requireAdmin(user: AuthenticatedUser, env: Env, token: string): Promise<void> {
  const query = new URLSearchParams({ id: `eq.${user.id}`, select: 'role' });
  const response = await fetch(
    `${env.SUPABASE_URL.replace(/\/+$/, '')}/rest/v1/profiles?${query}`,
    {
      headers: {
        apikey: env.SUPABASE_ANON_KEY,
        Authorization: `Bearer ${token}`,
      },
    },
  );
  if (!response.ok) throw new HttpError(502, 'Could not verify administrator access.');
  const profiles = await response.json() as Array<{ role?: string }>;
  if (profiles[0]?.role !== 'admin') throw new HttpError(403, 'Administrator access is required for product images.');
}

function imageKeyFromUrl(imageUrl: string, env: Env): string | null {
  let candidate: URL;
  const base = imageBaseUrl(env);
  try {
    candidate = new URL(imageUrl);
  } catch {
    return null;
  }
  if (candidate.origin !== base.origin || !candidate.pathname.startsWith(base.pathname)) return null;

  let key: string;
  try {
    key = candidate.pathname.slice(base.pathname.length).split('/').map(decodeURIComponent).join('/');
  } catch {
    return null;
  }
  const match = key.match(/^(products|avatars)\/([0-9a-f-]{36})\/([0-9a-f-]{36})\.(jpg|png|webp|avif)$/i);
  if (!match || !uuidPattern.test(match[2]) || !uuidPattern.test(match[3])) return null;
  return key;
}

function uploadedImageType(bytes: Uint8Array): string | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return 'image/png';
  if (
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' &&
    String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP'
  ) return 'image/webp';
  if (
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.slice(4, 8)) === 'ftyp' &&
    ['avif', 'avis'].includes(String.fromCharCode(...bytes.slice(8, 12)))
  ) return 'image/avif';
  return null;
}

async function uploadImage(request: Request, env: Env, user: AuthenticatedUser): Promise<Response> {
  const base = imageBaseUrl(env);
  const contentLength = Number(request.headers.get('Content-Length') ?? 0);
  if (contentLength > maxFileSize + 64 * 1024) throw new HttpError(413, 'Image must be 5 MB or smaller.');

  const form = await request.formData();
  const file = form.get('file');
  const kind = form.get('kind');
  const entityId = form.get('entityId');
  if (!(file instanceof File) || (kind !== 'avatar' && kind !== 'product') || typeof entityId !== 'string') {
    throw new HttpError(400, 'A valid image, image type, and owner ID are required.');
  }
  if (!uuidPattern.test(entityId)) throw new HttpError(400, 'The image owner ID is invalid.');
  if (file.size === 0 || file.size > maxFileSize) throw new HttpError(413, 'Image must be between 1 byte and 5 MB.');

  const token = request.headers.get('Authorization')!.replace(/^Bearer\s+/i, '');
  if (kind === 'avatar') {
    if (entityId !== user.id) throw new HttpError(403, 'You can only upload your own profile photo.');
  } else {
    await requireAdmin(user, env, token);
  }

  const expectedType = allowedTypes.get(file.type);
  if (!expectedType) throw new HttpError(415, 'Choose a JPG, PNG, WebP, or AVIF image.');
  const bytes = await file.arrayBuffer();
  if (uploadedImageType(new Uint8Array(bytes)) !== file.type) {
    throw new HttpError(415, 'The image content does not match its file type.');
  }

  const key = `${kind === 'avatar' ? 'avatars' : 'products'}/${entityId}/${crypto.randomUUID()}.${expectedType}`;
  await env.IMAGES.put(key, bytes, {
    httpMetadata: {
      contentType: file.type,
      cacheControl: 'public, max-age=31536000, immutable',
    },
  });
  const imageUrl = new URL(key.split('/').map(encodeURIComponent).join('/'), base).toString();
  return jsonResponse({ imageUrl }, 201, request.headers.get('Origin'));
}

async function deleteImage(request: Request, env: Env, user: AuthenticatedUser): Promise<Response> {
  let body: { kind?: ImageKind; imageUrl?: string };
  try {
    body = await request.json() as { kind?: ImageKind; imageUrl?: string };
  } catch {
    throw new HttpError(400, 'A valid image deletion request is required.');
  }
  if ((body.kind !== 'avatar' && body.kind !== 'product') || typeof body.imageUrl !== 'string') {
    throw new HttpError(400, 'A valid image type and URL are required.');
  }

  const key = imageKeyFromUrl(body.imageUrl, env);
  if (!key) {
    throw new HttpError(400, 'The image URL is invalid or is not managed by image storage.');
  }
  const isAvatar = key.startsWith('avatars/');
  const ownerId = key.split('/')[1];
  if (body.kind === 'avatar') {
    if (!isAvatar || ownerId !== user.id) throw new HttpError(403, 'You can only remove your own profile photo.');
  } else {
    if (isAvatar) throw new HttpError(400, 'That URL is not a product image.');
    const token = request.headers.get('Authorization')!.replace(/^Bearer\s+/i, '');
    await requireAdmin(user, env, token);
  }

  const object = await env.IMAGES.head(key);
  if (!object) {
    throw new HttpError(404, 'The image no longer exists in storage.');
  }
  await env.IMAGES.delete(key);
  return jsonResponse({ deleted: true }, 200, request.headers.get('Origin'));
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get('Origin');
    const allowedOrigins = env.ALLOWED_ORIGINS.split(',').map((item) => item.trim()).filter(Boolean);
    if (origin && !allowedOrigins.includes(origin)) {
      return jsonResponse({ error: 'This website is not allowed to use image storage.' }, 403, null);
    }
    if (request.method === 'OPTIONS') return jsonResponse({}, 200, origin);

    try {
      if (request.method !== 'POST') throw new HttpError(405, 'Method not allowed.');
      if (request.headers.get('Content-Length') && Number(request.headers.get('Content-Length')) > maxFileSize + 64 * 1024) {
        throw new HttpError(413, 'Image must be 5 MB or smaller.');
      }

      const user = await authenticate(request, env);
      const path = new URL(request.url).pathname.replace(/\/+$/, '');
      if (path === '/upload') return await uploadImage(request, env, user);
      if (path === '/delete') return await deleteImage(request, env, user);
      throw new HttpError(404, 'Image storage route not found.');
    } catch (error) {
      if (error instanceof HttpError) return jsonResponse({ error: error.message }, error.status, origin);
      console.error('Image storage request failed:', error);
      return jsonResponse({ error: 'Image storage request failed. Please try again.' }, 500, origin);
    }
  },
};
