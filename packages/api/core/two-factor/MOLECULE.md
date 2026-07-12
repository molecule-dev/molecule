# @molecule/api-two-factor

Two-factor authentication interface for molecule.dev.

Provides an abstract two-factor authentication interface that can be
backed by any TOTP library. Use `setProvider` to provide a concrete
implementation such as `@molecule/api-two-factor-otplib`.

## Quick Start

```ts
import { Router } from 'express'
import { generateSecret, getUrls, verify } from '@molecule/api-two-factor'
// `store` = YOUR server-side persistence: the molecule DB via `@molecule/api-database`
// (or a `pg` pool on `DATABASE_URL`) — for an imported app too, NOT its Supabase
// service-role client. Keyed by user id; the browser never touches it.
const router = Router()

router.get('/status', async (_req, res) => {
  const rec = await store.get(userId)
  res.json({ enabled: !!rec?.enabled }) // a boolean — never the secret
})

router.post('/setup', async (_req, res) => {
  const secret = generateSecret()
  await store.upsert(userId, { secret, enabled: false }) // pending, server-side only
  const { keyUrl, QRImageUrl } = getUrls({ username, service: 'MyApp', secret })
  res.json({ keyUrl, QRImageUrl }) // the QR carries the secret — never return it raw
})

router.post('/enable', async (req, res) => {
  const rec = await store.get(userId)
  const { valid, timeStep } = verify({
    secret: rec.secret, token: req.body.token, afterTimeStep: rec.last_time_step,
  })
  if (!valid) return res.status(400).json({ error: 'Invalid code' })
  await store.upsert(userId, { enabled: true, last_time_step: timeStep })
  res.json({ enabled: true })
})
```

## Type
`core`

## Installation
```bash
npm install @molecule/api-two-factor
```

## API

### Interfaces

#### `TwoFactorProvider`

Abstract two-factor authentication provider interface.

Implementations must provide secret generation, URL/QR creation,
and token verification operations.

```typescript
interface TwoFactorProvider {
  /**
   * Generates a new base32-encoded TOTP secret.
   */
  generateSecret(): string

  /**
   * Generates an `otpauth://` key URI and a QR code image URL for enrollment.
   */
  getUrls(params: TwoFactorUrlParams): Promise<TwoFactorUrls>

  /**
   * Verifies a TOTP token against a secret. Returns whether the token is valid
   * and, on success, the matched RFC 6238 time step so the caller can persist
   * it and reject reuse of the same/earlier code (replay protection).
   */
  verify(params: TwoFactorVerifyParams): Promise<TwoFactorVerifyResult>
}
```

#### `TwoFactorUrlParams`

Parameters for generating TOTP URLs and QR codes.

```typescript
interface TwoFactorUrlParams {
  username: string
  service: string
  secret: string
}
```

#### `TwoFactorUrls`

Result of generating TOTP URLs, including a scannable QR code.

```typescript
interface TwoFactorUrls {
  keyUrl: string
  QRImageUrl: string
}
```

#### `TwoFactorVerifyParams`

Parameters for verifying a TOTP token against a secret.

```typescript
interface TwoFactorVerifyParams {
  secret: string
  token: string
  /**
   * The last successfully-consumed TOTP time step for this user, if any
   * (RFC 6238 time step counter). The provider rejects any token whose time
   * step is `<= afterTimeStep`, enforcing single-use of a code within its
   * validity window (replay protection). Persist {@link TwoFactorVerifyResult.timeStep}
   * after each successful verification and pass it back here on the next one.
   */
  afterTimeStep?: number
}
```

#### `TwoFactorVerifyResult`

Result of verifying a TOTP token.

```typescript
interface TwoFactorVerifyResult {
  /**
   * Whether the token is valid for the given secret.
   */
  valid: boolean
  /**
   * The RFC 6238 time step the token matched at — present only when
   * `valid` is `true`. Persist this and pass it back as
   * {@link TwoFactorVerifyParams.afterTimeStep} on the next verification so a
   * reused (same-step) or earlier code is rejected (single-use replay
   * protection).
   */
  timeStep?: number
}
```

### Functions

#### `generateSecret()`

Generates a new TOTP secret string using the bonded provider.

```typescript
function generateSecret(): string
```

**Returns:** A base32-encoded TOTP secret.

#### `getProvider()`

Retrieves the bonded two-factor provider, throwing if none is configured.

```typescript
function getProvider(): TwoFactorProvider
```

**Returns:** The bonded two-factor authentication provider.

#### `getUrls(params)`

Generates an `otpauth://` key URI and a QR code image URL for TOTP
enrollment using the bonded provider.

```typescript
function getUrls(params: TwoFactorUrlParams): Promise<TwoFactorUrls>
```

- `params` — The URL parameters including username, service name, and secret.

**Returns:** An object containing `keyUrl` (otpauth URI) and `QRImageUrl` (data URL).

#### `hasProvider()`

Checks whether a two-factor authentication provider is currently bonded.

```typescript
function hasProvider(): boolean
```

**Returns:** `true` if a two-factor provider is bonded.

#### `setProvider(provider)`

Registers a two-factor authentication provider as the active singleton.
Called by bond packages during application startup.

```typescript
function setProvider(provider: TwoFactorProvider): void
```

- `provider` — The two-factor authentication provider implementation to bond.

#### `verify(params)`

Verifies a TOTP token against a secret using the bonded provider.

```typescript
function verify(params: TwoFactorVerifyParams): Promise<TwoFactorVerifyResult>
```

- `params` — The verification parameters (secret, token, and optional

**Returns:** A result indicating whether the token is `valid` and, on success,
 *   the matched `timeStep` to persist for replay protection.

## Available Providers

| Provider | Package |
|----------|---------|
| otplib | `@molecule/api-two-factor-otplib` |

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-bond` ^1.0.0

**The TOTP secret is a SERVER-SIDE secret — it must NEVER reach the browser.**
`generateSecret()`, `getUrls()`, and `verify()` all run in YOUR API. The secret
lives only in the server + your database. The frontend sends a 6-digit token and
receives a boolean (or, once, the enrollment QR); it must NEVER receive, store, or
send the raw secret, and must NEVER read or write the 2FA table directly.

**The API OWNS the full lifecycle and state** (secret + `enabled` flag +
`last_time_step`). `verify()` is stateless on purpose — YOU load the stored secret
server-side and pass it in; do not accept a secret from the client. Expose these
endpoints so the frontend never needs the database:

- `GET  /2fa/status`  → `{ enabled }`, read from YOUR store. (This is the call a
  frontend most often wrongly points at the DB — keep it on the API.)
- `POST /2fa/setup`   → `generateSecret()`, store it server-side as PENDING
  (`enabled:false`), and return ONLY `getUrls()`'s `{ keyUrl, QRImageUrl }` — the QR
  carries the secret to the user's authenticator app; you never hand the raw secret
  to the browser to persist.
- `POST /2fa/enable`  → `verify()` the token against the PENDING secret; on success
  set `enabled:true` and persist `timeStep`.
- `POST /2fa/verify`  → `verify()` a login token against the STORED secret you load
  server-side; the browser sends only the token.
- `POST /2fa/disable` → clear the secret + `enabled` server-side.

Persist {@link TwoFactorVerifyResult.timeStep} and pass it back as
{@link TwoFactorVerifyParams.afterTimeStep} on the next `verify()` for single-use
replay protection.

**Adding 2FA to an app that has its OWN hosted database (Supabase / Firebase):** store
the 2FA state in the MOLECULE-provisioned database — `DATABASE_URL` (Postgres) is in the
sandbox env and `@molecule/api-database` is installed — NOT the app's Supabase/Firebase
ADMIN (service-role) client. That admin secret (e.g. `SUPABASE_SERVICE_ROLE_KEY`) is NOT
provisioned in the molecule environment — only the app's public/anon key is — so a
server-side `supabaseAdmin` / Firebase-admin write fails with "missing env var … Connect
Supabase in Lovable Cloud". Put the `user_2fa` table in the molecule DB, keyed by the
app's user id. (Still route EVERY 2FA read AND write through the server — a direct
`supabase.from('user_2fa')` from the BROWSER exposes the secret; a leftover client-side DB
call is a bug, not a shortcut.)
