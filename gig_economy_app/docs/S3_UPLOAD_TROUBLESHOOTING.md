# S3 SignatureDoesNotMatch – Why It Happens & How to Fix

## What the error means

When you get `SignatureDoesNotMatch` (403) on an S3 presigned upload, S3 is rejecting the request because the signature in the URL does not match the request it received.

## Recommended path: upload via your API (implemented)

Profile photos use **`POST /api/uploads/profile-photo`** with multipart field **`photo`**. The backend runs **`PutObject`** with your AWS credentials, so the phone never talks to S3 with a presigned URL. This avoids React Native issues (empty `blob`, `SignatureDoesNotMatch`, etc.). Objects appear under `uploads/<userId>/…` in the bucket.

---

## Root cause fixed in this repo (AWS SDK v3) — presigned URLs only

**`@aws-sdk/client-s3` v3.1000+** defaults `requestChecksumCalculation` to **`WHEN_SUPPORTED`**. For `PutObject`, the flexible-checksums middleware then adds **`x-amz-checksum-crc32`** (and related headers) to the request **before** the URL is presigned. Those headers are part of the signature.

Your app sends a simple **PUT** with the file body and **does not** send those checksum headers → **SignatureDoesNotMatch**.

**Fix:** Instantiate `S3Client` with `requestChecksumCalculation: RequestChecksumCalculation.WHEN_REQUIRED` when generating presigned URLs (see `upload.service.ts`). PutObject does not require a checksum, so no checksum headers are added and plain client PUTs work.

## Common causes

### 1. **Expo `FileSystem.uploadAsync` behavior**

`FileSystem.uploadAsync` is built for multipart form uploads, not raw S3 PUT uploads. It can add headers (e.g. `Content-Type`), use chunked encoding, or send the body in a way that does not match what the presigned URL expects, which leads to signature mismatch.

**Fix:** Use `fetch` with explicit `method: 'PUT'` and minimal headers so the request exactly matches what the presigned URL expects.

### 2. **Content-Type mismatch**

- If the backend signs the URL **with** `ContentType`, the client must send that exact value.
- If the backend signs **without** `ContentType`, the client should not send it (or only send it if you know it won’t affect signing).
- The app was sending `Content-Type` while the backend does not sign it. Some HTTP clients modify or normalize headers, which can cause mismatch.
- AWS SDK intentionally omits `Content-Type` from signing by default to avoid these issues.

### 3. **Region mismatch**

`AWS_REGION` must match the S3 bucket’s region. If the bucket is in `ap-south-1` but `AWS_REGION` is `us-east-2`, the presigned URL will point at the wrong region and can trigger redirects and signature errors.

**Check:** Run `aws s3api get-bucket-location --bucket YOUR_BUCKET` and set `AWS_REGION` in `.env` accordingly.

### 4. **Clock skew**

Presigned URLs include a timestamp. If the device clock differs from AWS by more than ~15 minutes, S3 rejects the request. Emulators/simulators often have wrong time.

### 5. **Credentials**

Check that `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` in `.env` are correct and free of extra spaces or encoding issues.
