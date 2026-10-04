---
'@molecule/api-uploads-s3': minor
---

Add `createProvider()` to run several S3-compatible stores in one app, each with its own endpoint, credentials, bucket, storage class and key prefix, plus `headFile()` for object metadata, per-object Object Lock retention and checksum options, and `describeBucketProtection()` / `bucketProtectionMeets()` to check a bucket is versioned and locked; the env-configured `provider` is unchanged.
