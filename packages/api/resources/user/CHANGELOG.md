# @molecule/api-resource-user

## 1.6.0

### Minor Changes

- 0e1561e: Add `AUTH_SCHEME` / `verifyMiddleware({ scheme })` and a `GET /users/me` `accessToken`, and keep the caller's own session when the password changes.

## 1.5.7

### Patch Changes

- 6e60d60: - `@molecule/api-resource-api-key`: the setup SQL now ships at `src/__setup__/api_keys.sql`, the path its README states.
  - `@molecule/api-resource-article`: the README names `src/__setup__/` as the directory its four setup SQL files ship in.
  - `@molecule/api-resource-device`: the setup SQL now ships at `src/__setup__/devices.sql`, the path its README states.
  - `@molecule/api-resource-firmware`: the README names `src/__setup__/firmware.sql` as the setup SQL path.
  - `@molecule/api-resource-journal-entry`: the README names `src/__setup__/journal_entries.sql` as the setup SQL path.
  - `@molecule/api-resource-payment`: the setup SQL now ships at `src/__setup__/payments.sql`, the path its README states.
  - `@molecule/api-resource-status-page`: the setup SQL now ships under `src/__setup__/`, the path its README states.
  - `@molecule/api-resource-user`: the setup SQL now ships at `src/__setup__/users.sql` and `src/__setup__/usersSecrets.sql`, the paths its README states.

## 1.5.6

### Patch Changes

- 5f74674: `authorization.set()` refuses to mint a session without a `deviceId`. The global `verifyMiddleware` exposes a session only when its payload carries a device id naming an active `devices` row, so a token signed without one was handed to the client and then answered 401 on every request, with nothing said at sign-in. It now throws, naming the missing field and the call that supplies it: `get<DeviceService>('device')?.createOrUpdate(userId, deviceName)`, which resolves to the device id string. The sign-in sequence — device, then session — is documented on `set()` and in the package's module docs, with the typed calls for both steps.

## 1.5.5

### Patch Changes

- 5264569: The package reference now states that `handlers.*` return `{ statusCode, headers?, body }` and never write to `res`, with the three lines that apply a result when a handler is called directly.

## 1.5.4

### Patch Changes

- `sign()`'s reference and `authorization.set()`'s now state how a session token reaches a JSON response body — `authorization.set(req, res, { userId, deviceId })` returns it, and `verifyMiddleware({ allowCookieSession: false })` keeps the cookie off — and that an app has exactly one bonded JWT provider (keys from `JWT_PRIVATE_KEY`/`JWT_PUBLIC_KEY`, no `JWT_SECRET`), so replacing it changes every token the app and its packages mint and verify.

## 1.5.3

### Patch Changes

- 733afff: The package reference now names the two tables it owns — `users` (props only, no password column) and `usersSecrets` — and the key that joins them: `usersSecrets.id` is the user's id, never a fresh uuid. It also names the handlers to call for signup, login and password changes instead of hand-writing both rows.

## 1.5.2

### Patch Changes

- 94a72bd: `verifyMiddleware({ allowCookieSession: false })` now turns the session cookie off in both directions: `set()` no longer writes the `token` / `sessionId` / `mol_auth` cookies for a token-only request, and a token-only mount drops a session an earlier, laxer mount resolved from the cookie (a header-resolved session is untouched).

## 1.5.1

### Patch Changes

- fc8dd5a: The `set` docs say a session token needs a real device row on every sign-in path.

## 1.5.0

### Minor Changes

- 0ed89f7: Usernames are stored as sent or refused (letters, digits, `.`, `-`, `_`), a body nested under `user` gets its own error, `verifyMiddleware({ allowCookieSession: false })` makes an API token-only, and `utilities.stripSensitiveUserColumns` is exported.

## 1.4.14

### Patch Changes

- 60d0840: The README documents every export with its signature, parameters and return value, namespace members included.

## 1.4.13

### Patch Changes

- 417b24b: Documents that a session token needs an active device row, and how to mint one.

## 1.4.12

### Patch Changes

- 29e9bc0: Documents that a hand-written logout must call `invalidateDeviceExistsCache` after deleting the device row.

## 1.4.11

### Patch Changes

- 401afac: The session middleware also reads `Authorization: Token <jwt>`, not only `Bearer`.

## 1.4.10

### Patch Changes

- 9247837: Test coverage hardening only: the squatter-data wipe handler's tests now assert the stored hash is never used. No runtime change.

## 1.4.9

### Patch Changes

- 0dbfaff: Login now refuses the request, instead of issuing a session, when two-factor authentication is enabled for an account but no two-factor secret is stored.
- 5844509: Log in now runs the same dummy password comparison (and records the failure) when an account exists but its secrets row is missing.
- be066d7: Log in now derives its dummy password hash once per process even when several invalid-credential requests arrive at the same time, instead of running one full-cost hash per concurrent request.

## 1.4.8

### Patch Changes

- 4e6bd12: Logging in with a password reset link now applies the same one-hour validity gate as the reset confirmation itself (a future-dated timestamp is refused, so the login path is no longer the looser gate for the same credential), and the login analytics event reports the credential that actually authenticated when a request carries both a password and a reset token.
- ab5eb98: Password resets submitted through the emailed link are consumed atomically, and logging in with a reset link no longer spends the link on the two-factor challenge, so the retried request with the 2FA code now succeeds.

## 1.4.7

### Patch Changes

- 9e6fca7: Login 2FA codes, 2FA enable/disable codes and password-reset links are now consumed atomically, so concurrent requests with the same code or link can no longer both succeed.

## 1.4.6

### Patch Changes

- 240411e: Declares its `uuid` dependency.

## 1.4.5

### Patch Changes

- c5e8e42: The password-reset email now links to the reset page when only `APP_ORIGIN` is configured (it used to require `SITE_ORIGIN`), and the link carries the account's email so the reset page can prefill it.

## 1.4.4

### Patch Changes

- dc5c6b6: Account deletion removes the user row first, so a failed delete cannot leave an account without its password.

## 1.4.3

### Patch Changes

- 349bef1: OAuth login now backfills a missing email on an existing account from a provider-verified address (non-destructive: never when another account holds the email; an unverified same-address account is upgraded to verified instead).

## 1.4.2

### Patch Changes

- 67e9ffc: OAuth account creation now claims the provider handle as the username (`vialoh` from GitHub's `vialoh@github`) instead of flattening it into `vialohgithub`; collisions append re-checked numeric then id-based suffixes.

## 1.4.0

### Minor Changes

- 40a3441: `PATCH /users/:id/plan` accepts an optional `quantity`, passed to the payment provider for per-seat plans and clamped to a whole number of at least one.

## 1.3.0

### Minor Changes

- 49f6145: Adds `POST /users/:id/billing-portal/:provider`, which opens the bonded provider's hosted billing portal so a subscriber can update their card, read invoices, and cancel. Returns `{ url }`; an optional `returnPath` sends them back to a specific app page. Requires `@molecule/api-payments` ^1.1.0.

## 1.2.1

### Patch Changes

- 0f378c5: Log-in, sign-up and OAuth log-in responses no longer include secret user columns (confirmation/reset tokens, OAuth material) — the same denylist the self-read endpoints already apply.

## 1.2.0

### Minor Changes

- e404093: `verifyMiddleware` accepts `{ shouldRefreshSession }`, letting an app skip the transparent token re-issue (and its presence hint) for sessions that must not appear signed in. Defaults to current behaviour.

## 1.1.1

### Patch Changes

- 3909f94: `updatePlan` now logs every rejected plan update (with `errorKey` context) and analytics-tracking failures instead of silently swallowing them.

## 1.1.0

### Minor Changes

- OAuth sign-up/login now persists the provider profile: display name (falling back to the email's local part), bio, and the profile image re-hosted as an inline data URI (never a third-party URL). Blank name/bio/avatar are backfilled on later OAuth logins without overwriting user-set values.

## 1.0.1

### Patch Changes

- Ship the generated package documentation.

  1.0.0 published with `files: ["dist"]`, so no package carried a README and every
  npm page read "This package does not have a README". The generated doc (formerly
  MOLECULE.md, now README.md) is now included in the tarball, giving both humans and
  coding agents the full API reference from node_modules.

- Updated dependencies
  - @molecule/api-bond@1.0.1
  - @molecule/api-config@1.0.1
  - @molecule/api-database@1.0.1
  - @molecule/api-entitlements@1.0.1
  - @molecule/api-i18n@1.0.1
  - @molecule/api-jwt@1.0.1
  - @molecule/api-locales-user@1.0.1
  - @molecule/api-locales-user-payments@1.0.1
  - @molecule/api-password@1.0.1
  - @molecule/api-payments@1.0.1
  - @molecule/api-push-notifications@1.0.1
  - @molecule/api-rate-limit@1.0.1
  - @molecule/api-resource@1.0.1
  - @molecule/api-resource-device@1.0.1
  - @molecule/api-secrets@1.0.1
  - @molecule/api-two-factor@1.0.1
