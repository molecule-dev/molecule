# @molecule/api-uploads-encrypted

## 1.1.0

### Minor Changes

- 73ec5cf: New upload provider that encrypts every file with the bonded stream encryption before another upload provider stores it, and decrypts and authenticates it on read.
