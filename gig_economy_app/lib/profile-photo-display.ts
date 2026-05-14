/**
 * Stored profile photos use the public S3 HTTPS URL. If the bucket is private,
 * `<Image uri={publicUrl} />` gets 403 — use a short-lived presigned GET for display.
 */
import { apiRequest } from './api';

export async function resolveProfilePhotoDisplayUrl(
  storedUrl: string | null | undefined
): Promise<string | null> {
  if (!storedUrl) return null;
  if (
    storedUrl.startsWith('file://') ||
    storedUrl.startsWith('content://') ||
    storedUrl.startsWith('ph://') ||
    storedUrl.startsWith('blob:')
  ) {
    return storedUrl;
  }
  if (!storedUrl.startsWith('http')) return storedUrl;

  try {
    const { readUrl } = await apiRequest<{ readUrl: string; expiresIn: number }>(
      '/api/v1/uploads/presigned-read',
      {
        method: 'POST',
        body: JSON.stringify({ publicUrl: storedUrl }),
      }
    );
    return readUrl;
  } catch {
    return storedUrl;
  }
}
