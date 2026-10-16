# @molecule/api-jwt

## 1.0.6

### Patch Changes

- `sign()`'s reference and `authorization.set()`'s now state how a session token reaches a JSON response body — `authorization.set(req, res, { userId, deviceId })` returns it, and `verifyMiddleware({ allowCookieSession: false })` keeps the cookie off — and that an app has exactly one bonded JWT provider (keys from `JWT_PRIVATE_KEY`/`JWT_PUBLIC_KEY`, no `JWT_SECRET`), so replacing it changes every token the app and its packages mint and verify.

## 1.0.5

### Patch Changes

- f7f1460: `sign()` is documented as the low-level signer: a token it mints is not a session, because the app's session middleware accepts a JWT only when its payload also carries a `deviceId` naming an active device row — the doc now names `authorization.set()` in `@molecule/api-resource-user` as the function that mints one the middleware accepts.

## 1.0.4

### Patch Changes

- 60d0840: The README documents every export with its signature, parameters and return value, namespace members included.

## 1.0.2

### Patch Changes

- 7301411: Generated JWT private-key PEM files are now written with owner-only permissions (`0o600`, directory `0o700`), and the legacy-location migration chmods the copied private key down as well.

## 1.0.1

### Patch Changes

- Ship the generated package documentation.

  1.0.0 published with `files: ["dist"]`, so no package carried a README and every
  npm page read "This package does not have a README". The generated doc (formerly
  MOLECULE.md, now README.md) is now included in the tarball, giving both humans and
  coding agents the full API reference from node_modules.

- Updated dependencies
  - @molecule/api-bond@1.0.1
