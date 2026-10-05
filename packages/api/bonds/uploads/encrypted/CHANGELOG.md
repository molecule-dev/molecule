# @molecule/api-uploads-encrypted

## 1.1.1

### Patch Changes

- 40fb13e: A multipart size limit (`limit`) or a source that closes before it ends now fails the upload instead of sealing the truncated body as a complete object; the README says what the inner store sees.

## 1.1.0

### Minor Changes

- 73ec5cf: New upload provider that encrypts every file with the bonded stream encryption before another upload provider stores it, and decrypts and authenticates it on read.
