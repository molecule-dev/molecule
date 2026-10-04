# @molecule/api-deploy-target-s3

## 1.1.1

### Patch Changes

- dc5c6b6: The S3 client now has connection and socket-inactivity timeouts (10 s / 60 s, overridable), so a hung S3 socket can no longer stall the caller indefinitely.

## 1.1.0

### Minor Changes

- 6059880: Deploy requests accept an optional `onPhase` callback reporting `building` and `publishing` transitions; the S3 bond reports `publishing`.
