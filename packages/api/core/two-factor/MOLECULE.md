# @molecule/api-two-factor

Two-factor authentication interface for molecule.dev.

Provides an abstract two-factor authentication interface that can be
backed by any TOTP library. Use `setProvider` to provide a concrete
implementation such as `@molecule/api-two-factor-otplib`.

## Quick Start

```ts
import { Router } from 'express'
import { generateSecret, getUrls, verify } from '@molecule/api-two-factor'
// `store` = YOUR server-side persistence: the datastore the environment provides (in
// molecule, `DATABASE_URL` via `@molecule/api-database` or a `pg` pool) — NOT an imported
// app's own hosted-DB admin client. Keyed by user id; the browser never touches it.
const router = Router()

router.get('/status', async (_req, res) => {
  const rec = await store.get(userId)
  res.json({ enabled: !!rec?.enabled }) // a boolean — never the secret
})

router.post('/setup', async (_req, res) => {
  const secret = generateSecret()
  await store.upsert(userId, { secret, enabled: false }) // pending, server-side only
  const { keyUrl, QRImageUrl } = await getUrls({ username, service: 'MyApp', secret })
  res.json({ keyUrl, QRImageUrl }) // the QR carries the secret — never return it raw
})

router.post('/enable', async (req, res) => {
  const rec = await store.get(userId)
  try {
    const { valid, timeStep, reason } = await verify({
      secret: rec.secret, token: req.body.token, afterTimeStep: rec.last_time_step,
    })
    if (!valid) {
      // reason === 'replay' means the code was ALREADY USED — tell the user to wait for
      // the next one; anything else is a wrong/expired code.
      return res.status(400).json({ error: reason === 'replay' ? 'Code already used — wait for the next one' : 'Invalid code' })
    }
    await store.upsert(userId, { enabled: true, last_time_step: timeStep })
    res.json({ enabled: true })
  } catch (error) {
    // The STORED secret itself is unusable (corrupted record) — not a wrong code.
    // Tell the user to re-run setup rather than re-enter a code that can never verify.
    logger.error('2FA verify failed — stored secret unusable', { error, userId })
    res.status(500).json({ error: 'Two-factor setup is corrupted — please re-run setup' })
  }
})
```

```ts
// Real-path integration test (vitest) — the regression layer that keeps the 2FA lifecycle
// working on every later build. Real provider, real datastore, NO mocks. Computing a real
// TOTP from the enrollment secret is what catches a broken verify(); asserting a wrong code
// REJECTS is what catches a verify() that always returns true.
//
// otplib v13 API: `generate` (NOT the removed v12 `authenticator.generate`), and BOTH
// otplib's generate() and this package's verify()/getUrls() are ASYNC — always await.
import { generate } from 'otplib'
import { expect, test } from 'vitest'

import { generateSecret, setProvider, verify } from '@molecule/api-two-factor'
import { provider } from '@molecule/api-two-factor-otplib'

setProvider(provider)

test('2FA lifecycle: setup → enable → verify → wrong code rejects', async () => {
  const userId = `test-user-${Date.now()}`
  const secret = generateSecret()
  await store.upsert(userId, { secret, enabled: false })        // pending, like /setup

  const code = await generate({ secret })                       // a REAL, FRESH code
  const enable = await verify({ secret, token: code })          // verify immediately
  expect(enable.valid).toBe(true)                               // fails here if wiring is broken
  await store.upsert(userId, { enabled: true, last_time_step: enable.timeStep })

  // Replay protection: the SAME code (same time step) must not verify twice — and the
  // result SAYS it was a replay, so callers can tell "already used" from "wrong/expired".
  const replayed = await verify({ secret, token: code, afterTimeStep: enable.timeStep })
  expect(replayed).toEqual({ valid: false, reason: 'replay' })
  // A wrong code must reject — a verify() that always passes is a broken integration.
  expect((await verify({ secret, token: '000000' })).valid).toBe(false)

  await store.delete(userId)                                    // disable
})
```

## Type
`core`

## Installation
```bash
npm install @molecule/api-two-factor @molecule/api-bond
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
   *
   * A rejected/wrong/expired code resolves to `{ valid: false }` (optionally
   * with {@link TwoFactorVerifyResult.reason}) — it never throws. `verify()`
   * MAY still reject the promise when the STORED `secret` itself is unusable
   * (missing or not valid base32): that is server-side data corruption, not
   * an invalid code, and callers must handle it separately (message "re-run
   * setup", not "wrong code").
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
  /**
   * Acceptance window in SECONDS as `[past, future]` around the current time
   * step. Defaults to the provider's `[60, 30]` — two steps of past skew (a
   * code stays valid ~60–90s after it was shown, tolerant of slow entry) and
   * one step of future skew (a fast client clock). Override only when your
   * threat model needs a tighter window (e.g. `[30, 0]`); tighter windows make
   * codes expire while a slow flow is still typing them.
   */
  epochTolerance?: [number, number]
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
  /**
   * Present only when `valid` is `false`, identifying failure modes a caller
   * should message differently (absent when the token is simply wrong or
   * expired):
   *
   * - `'replay'` — the token WOULD have verified but its time step is
   *   `<= afterTimeStep`: the code was already used (replay protection).
   *   Tell the user to wait for the NEXT code — this is not a wrong or
   *   expired code, and not a library fault. A provider MAY also report
   *   `'replay'` when the persisted `afterTimeStep` sits further ahead than
   *   the current time step plus the acceptance window can reach — this
   *   happens after the SERVER clock moves backward (VM snapshot restore,
   *   NTP correction, container clock drift) following a prior successful
   *   verify. In that case no token can be newer than the one already
   *   consumed until wall-clock time catches back up, so it is reported the
   *   same way rather than as a crash. See `@molecule/api-two-factor-otplib`'s
   *   provider for the reference implementation of this check.
   * - `'format'` — the token is not a syntactically valid one-time code
   *   (wrong length or non-digits; grouping whitespace from authenticator-app
   *   display formatting such as `"123 456"` is stripped before this check).
   *   Prompt the user to re-enter the code — nothing is wrong with the secret
   *   or the wiring, and the underlying library was never consulted.
   *
   * `verify()` may still REJECT (throw/reject the promise) instead of
   * returning `valid:false` when the STORED SECRET itself is unusable
   * (missing, malformed, not valid base32) — that is server-side data
   * corruption, not an invalid code, and must never be silently treated as
   * one. Catch it separately from a normal `!valid` result and steer the
   * user to re-run 2FA setup rather than re-enter a code.
   */
  reason?: 'replay' | 'format'
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

### Runtime Dependencies

- `@molecule/api-bond`

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

**Code freshness — what a failed verify() actually means.** TOTP codes rotate every 30s;
the default acceptance window is `[60, 30]` (≈60–90s of past validity). So:
- Generate/read the code IMMEDIATELY before verifying. A code that sat through a slow flow
  legitimately expires — on `valid:false`, generate a FRESH code and retry ONCE before
  suspecting your wiring (or this library).
- `{ valid: false, reason: 'replay' }` means the code was ALREADY USED (single-use
  protection): wait for the NEXT code. This is correct behavior, not a bug. A provider
  may also report this when the SERVER clock has moved backward since the last successful
  verify (VM snapshot restore, NTP correction, container clock drift) — no code can be
  newer than the one already consumed until wall-clock time catches back up. Same message
  ("wait"), different root cause; it will resolve on its own once the clock is correct.
- `{ valid: false, reason: 'format' }` means the token isn't a syntactically valid code
  (wrong length / non-digits). Authenticator-app grouping whitespace (`"123 456"`) is
  stripped automatically before this check, so this is a real typo: prompt the user to
  re-enter the code — the secret and the wiring are fine.
- `verify()` THROWS (does not resolve `valid:false`) when the STORED SECRET itself is
  unusable — missing, or not valid base32 (server-side data corruption). Handle this
  separately from a normal rejection: tell the user to re-run setup, not to re-enter a code.
- Re-running setup regenerates the PENDING secret — codes computed from the previous
  QR/secret will never verify again. Do not click "set up" twice and reuse the first QR.
- `verify()`, `getUrls()`, and otplib v13's `generate()` are all ASYNC — always `await`.

(The end-to-end lifecycle to drive is the `@e2e` checklist below.)

**Adding 2FA to an app that already has its OWN backend/database:** persist the 2FA record
in YOUR server-side datastore — the state (secret + `enabled`) has to live somewhere the
server controls. Do NOT assume the imported app's own hosted-DB ADMIN credentials are
available: an imported repo ships only its public/client config, so a server-side admin write
to the app's external database fails at runtime with a "missing env var". Use whatever
server-side datastore the ENVIRONMENT actually provides — in the molecule sandbox that's the
provisioned `DATABASE_URL` (`@molecule/api-database` or a `pg` pool) — keyed by the app's user
id. (Still route EVERY 2FA read AND write through the server — a direct read/write of the 2FA
table from the BROWSER exposes the secret; a leftover client-side DB call is a bug.)

## E2E Tests

Integration checklist — drive the app's REAL UI as the user would (in
molecule.dev: navigate_preview → read_preview_ui → interact_preview, targeting
elements by data-mol-id), adapt to this app's actual auth/settings screens, and
check every box off one by one. A box you can't check is an integration bug to
fix — not a skip:
- [ ] Sign up + log in through the real auth screens still works — do this
  FIRST; the most common 2FA-integration regression is a broken login.
- [ ] Open security/settings → "Set up 2FA" → a QR code / secret key is
  VISIBLE. An error here means the server-side setup route or 2FA store is broken.
- [ ] Entering a REAL TOTP code enables 2FA; a made-up `000000` must FAIL.
  COUNTERPARTY: the secret is shown on screen during setup — compute the current
  6-digit code from it with the preinstalled otplib (v13: `await generate({ secret })`;
  both otplib's `generate()` and this package's `verify()` are async). NEVER add
  an endpoint that leaks the stored secret to the client to obtain the code.
- [ ] Log out, log back in → the 2FA challenge appears AFTER the password → a
  valid code completes login; a wrong code is rejected with a clear error.
- [ ] Disable 2FA from settings → log out / log back in → no challenge.
Keep a real-path integration test in the repo (the second `@example`) so the
lifecycle stays covered on every later build.
