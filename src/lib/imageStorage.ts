import { supabase } from '@/lib/supabase';

export type ImageKind = 'avatar' | 'product';

type ImageApiResponse = {
  imageUrl?: string;
  deleted?: boolean;
  error?: string;
};

const imageApiUrl = import.meta.env.VITE_IMAGE_API_URL?.replace(/\/+$/, '');

async function imageRequest<T extends ImageApiResponse>(
  path: string,
  init: RequestInit,
): Promise<T> {
  if (!imageApiUrl) {
    throw new Error('Image storage is not configured. Set VITE_IMAGE_API_URL and redeploy the app.');
  }

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Please sign in before managing images.');

  const response = await fetch(`${imageApiUrl}${path}`, {
    ...init,
    headers: {
      ...init.headers,
      Authorization: `Bearer ${session.access_token}`,
    },
  });
  const responseText = await response.text();
  let result: T;
  try {
    result = JSON.parse(responseText) as T;
  } catch {
    throw new Error(`Image storage returned an invalid response (${response.status}).`);
  }
  if (!response.ok) throw new Error(result.error ?? `Image storage request failed (${response.status}).`);
  return result;
}

export async function uploadImage(file: File, kind: ImageKind, entityId: string): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('kind', kind);
  formData.append('entityId', entityId);
  const result = await imageRequest('/upload', { method: 'POST', body: formData });
  if (!result.imageUrl) throw new Error('Image storage did not return an image URL.');
  return result.imageUrl;
}

export function validateDeleteResponse(result: ImageApiResponse): void {
  if (result.deleted !== true) {
    throw new Error(result.error ?? 'The image could not be found or deleted.');
  }
}

export async function deleteImage(kind: ImageKind, imageUrl: string): Promise<void> {
  const result = await imageRequest('/delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ kind, imageUrl }),
  });
  validateDeleteResponse(result);
}
