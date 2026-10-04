---
'@molecule/api-uploads-s3': minor
---

Add `createProvider()` to run several S3-compatible stores in one app, each with its own endpoint, credentials, bucket, storage class and key prefix, plus `headFile()` for object metadata; the env-configured `provider` is unchanged.
