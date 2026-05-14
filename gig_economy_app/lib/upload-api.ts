/**
 * Upload API – presigned S3 URLs for profile photo.
 */
import { apiRequest } from './api';

export interface PresignedUrlResult {
  uploadUrl: string;
  key: string;
  publicUrl: string;
}

export async function getPresignedUrlForProfilePhoto(
  contentType: string,
  fileName?: string
): Promise<PresignedUrlResult> {
  const key = fileName || `profile-${Date.now()}.jpg`;
  return apiRequest<PresignedUrlResult>('/api/v1/uploads/presigned-url', {
    method: 'POST',
    body: JSON.stringify({
      key,
      contentType,
      category: 'image',
    }),
  });
}
