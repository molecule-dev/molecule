# @molecule/api-uploads-s3

## 1.1.1

### Patch Changes

- 40fb13e: `headFile` throws `NoSuchBucket` for a missing bucket instead of answering "no object"; `partSizeBytes` sets the multipart part size for bodies above the default ~48.8 GiB ceiling.

## 1.1.0

### Minor Changes

- 914a9c1: Add `createProvider()` to run several S3-compatible stores in one app, each with its own endpoint, credentials, bucket, storage class and key prefix, plus `headFile()` for object metadata, per-object Object Lock retention and checksum options, and `describeBucketProtection()` / `bucketProtectionMeets()` to check a bucket is versioned and locked; the env-configured `provider` is unchanged.

## 1.0.8

### Patch Changes

- 9237172: api-analytics gains `trackBondFailure` — the standard bond failure telemetry (`bond.failure` events, best-effort and throttled) that makes every vendor-facing bond failure queryable. The email, S3 uploads and Stripe bonds emit it at their vendor failure boundaries, including swallowed ones like a webhook handler returning null.
- Updated dependencies [9237172]
  - @molecule/api-analytics@1.1.0

## 1.0.7

### Patch Changes

- 477d2d4: The documented environment variable for the socket-inactivity timeout is `AWS_S3_SOCKET_TIMEOUT_MS`, the name the provider reads.

## 1.0.6

### Patch Changes

- dc5c6b6: The S3 client now has connection and socket-inactivity timeouts (10 s / 60 s, overridable), so a hung S3 socket can no longer stall the caller indefinitely.

## 1.0.5

### Patch Changes

- SDK clients honor the proxy environment, and the env names provisioning tools actually export are accepted.

## 1.0.3

### Patch Changes

- 8a62afc: Route S3 calls through the outbound proxy when one is configured. The AWS SDK v3 builds its own agent and reads no proxy variable, so on a host whose only egress path is a proxy every upload failed with a bare connection error; the client now receives a CONNECT-capable agent via its own `requestHandler` option, resolved against `AWS_S3_ENDPOINT` / `AWS_ENDPOINT_URL_S3` when set and the regional endpoint otherwise, so an internal S3-compatible endpoint listed in `NO_PROXY` keeps connecting directly. Nothing is passed when no proxy is configured.
- Updated dependencies [8b35739]
  - @molecule/api-proxy-agent@1.1.0

## 1.0.1

### Patch Changes

- Ship the generated package documentation.

  1.0.0 published with `files: ["dist"]`, so no package carried a README and every
  npm page read "This package does not have a README". The generated doc (formerly
  MOLECULE.md, now README.md) is now included in the tarball, giving both humans and
  coding agents the full API reference from node_modules.

- Updated dependencies
  - @molecule/api-bond@1.0.1
  - @molecule/api-i18n@1.0.1
  - @molecule/api-secrets@1.0.1
  - @molecule/api-uploads@1.0.1
