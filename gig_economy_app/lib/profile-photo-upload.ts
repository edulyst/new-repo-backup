/**
 * Profile photo upload – presigned S3 PUT directly from the app.
 * Flow: get presigned URL from backend → PUT file straight to S3 → update profile.
 */
import * as FileSystem from 'expo-file-system/legacy';
import { getStoredAuth } from './auth-storage';
import { updateMe } from './users-api';
import { getPresignedUrlForProfilePhoto } from './upload-api';

const VALID_IMAGE_EXT = ['jpg', 'jpeg', 'png', 'webp', 'gif'];

function getErrorMessage(e: unknown): string {
  if (!e) return 'Unknown error';
  if (typeof e === 'string') return e;
  if (typeof e === 'object' && 'message' in e) return String((e as { message: unknown }).message);
  try {
    return JSON.stringify(e);
  } catch {
    return 'Unknown error';
  }
}

/** Ensure we have a file:// URI so the file is locally readable (iOS ph:// isn't). */
async function getUploadableUri(uri: string): Promise<string> {
  if (uri.startsWith('file://')) return uri;
  const cachePath = `${FileSystem.cacheDirectory}profile-upload-${Date.now()}.jpg`;
  try {
    await FileSystem.copyAsync({ from: uri, to: cachePath });
  } catch {
    throw new Error(
      'Could not read image. Try taking a new photo or choosing a different image.'
    );
  }
  return cachePath.startsWith('file://') ? cachePath : `file://${cachePath}`;
}

export async function uploadProfilePhoto(localUri: string): Promise<string> {
  const rawExt = localUri.split('.').pop()?.toLowerCase() ?? '';
  const ext = VALID_IMAGE_EXT.includes(rawExt) ? rawExt : 'jpg';
  const mimeType =
    ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';

  const auth = await getStoredAuth();
  if (!auth?.token) {
    throw new Error('You need to sign in to upload a profile photo.');
  }

  const uploadableUri = await getUploadableUri(localUri);

  // 1. Ask backend to generate a short-lived presigned S3 PUT URL.
  const fileName = `profile-${Date.now()}.${ext}`;
  const { uploadUrl, publicUrl, key } = await getPresignedUrlForProfilePhoto(
    mimeType,
    fileName
  );

  // Avoid logging the full presigned URL (it includes signature params).
  console.debug('[uploadProfilePhoto] presigned', {
    ext,
    mimeType,
    key,
    s3Host: uploadUrl.split('/')[2],
    publicUrl,
  });

  // 2. Read the local file as a blob via React Native's fetch (supports file://).
  let blob: Blob;
  try {
    const fileRes = await fetch(uploadableUri);
    if (!fileRes.ok) {
      throw new Error(`Local file read failed (HTTP ${fileRes.status})`);
    }
    blob = await fileRes.blob();
  } catch (e) {
    console.error('[uploadProfilePhoto] local file read error', {
      uploadableUri,
      error: getErrorMessage(e),
    });
    throw e instanceof Error ? e : new Error(getErrorMessage(e));
  }

  // 3. PUT the blob directly to S3 using the presigned URL.
  //    The presigned URL already embeds credentials – do NOT include Authorization.
  //    Content-Type is not part of the S3 signature (backend omits it intentionally),
  //    so sending it here is safe and ensures S3 stores the correct MIME type.
  let s3Res: Response;
  try {
    s3Res = await fetch(uploadUrl, {
      method: 'PUT',
      body: blob,
      headers: { 'Content-Type': mimeType },
    });
  } catch (e) {
    // Often a network-layer/CORS issue; the device might not provide an HTTP response.
    console.error('[uploadProfilePhoto] S3 PUT network error', {
      s3Host: uploadUrl.split('/')[2],
      key,
      error: getErrorMessage(e),
    });
    throw e instanceof Error ? e : new Error(getErrorMessage(e));
  }

  if (!s3Res.ok) {
    const body = await s3Res.text().catch(() => '');
    // Extract a human-readable message from the S3 XML error response when possible.
    const match = body.match(/<Message>([^<]+)<\/Message>/);
    const s3RequestId =
      s3Res.headers.get('x-amz-request-id') ?? s3Res.headers.get('x-amz-id-2') ?? undefined;
    const regionMatch = body.match(/<Region>([^<]+)<\/Region>/)?.[1];
    const bucketRegionMatch = body.match(/<BucketRegion>([^<]+)<\/BucketRegion>/)?.[1];
    const bucketRegionHeader = s3Res.headers.get('x-amz-bucket-region') ?? undefined;
    const detail = match ? match[1] : `HTTP ${s3Res.status}`;
    console.error('[uploadProfilePhoto] S3 PUT failed', {
      key,
      status: s3Res.status,
      detail,
      s3RequestId,
      bucketRegionHeader,
      suggestedRegion: regionMatch ?? bucketRegionMatch,
      s3Body: body.slice(0, 1500),
    });
    throw new Error(`S3 upload failed: ${detail}. Please try again.`);
  }

  // 4. Persist the public URL on the user's profile.
  await updateMe({ profilePhotoUrl: publicUrl });
  return publicUrl;
}
