# @molecule/api-resource-api-key

Hashed API tokens with scopes, masking, rotation, revocation, and
last-used tracking. Mirrors the shape of `@molecule/api-resource-payment`
— apps depend on this package directly and read/write through the
abstract `DataStore` from `@molecule/api-database`.

## Quick Start

```typescript
import { createApiKey, verifyApiKey, recordApiKeyUse } from '@molecule/api-resource-api-key'

// Issue a new key. The plaintext is returned exactly ONCE.
const { apiKey, plaintext } = await createApiKey({
  user_id: user.id,
  name: 'CI deploy key',
  scopes: ['deploy:write'],
})

// Later — incoming request bearing the plaintext token:
const verified = await verifyApiKey(plaintext)
if (verified) await recordApiKeyUse(verified.id)
```

## Type
`resource`

## Installation
```bash
npm install @molecule/api-resource-api-key @molecule/api-bond @molecule/api-database @molecule/api-i18n @molecule/api-locales-resource-api-key @molecule/api-resource
```

## API

### Interfaces

#### `ApiKey`

A persisted API key record. The plaintext token is never stored —
only its SHA-256 hash. The plaintext is returned exactly once at
creation/rotation time.

```typescript
interface ApiKey {
  /** Primary key (UUID). */
  id: string
  /** ID of the user that owns this key. */
  user_id: string
  /** Human-readable label for the key (e.g. "CI deploy key"). */
  name: string
  /** SHA-256 hash of the plaintext token (hex). */
  hashed_token: string
  /** Display string safe to surface in UIs (e.g. `sk_live_…ABCD`). */
  masked: string
  /** Permission scopes granted to this key. */
  scopes: string[]
  /** Last time the key was successfully used to authenticate, or null. */
  last_used_at: Date | null
  /** Optional expiration timestamp. Null means never expires. */
  expires_at: Date | null
  /** Creation timestamp. */
  created_at: Date
  /** When the key was revoked, or null if still active. */
  revoked_at: Date | null
  /** Hash algorithm version — used for future migration paths. */
  version: ApiKeyHashVersion
}
```

#### `CreateApiKeyInput`

Input shape for {@link createApiKey}.

```typescript
interface CreateApiKeyInput {
  /** ID of the user to own the new key. */
  user_id: string
  /** Human-readable label for the key. */
  name: string
  /** Permission scopes for the key. Defaults to an empty array. */
  scopes?: string[]
  /** Optional expiration time. Null/undefined means never expires. */
  expires_at?: Date
  /**
   * Optional token prefix for masked display (e.g. `'sk_live_'`).
   * Defaults to `'sk_'`.
   */
  prefix?: string
}
```

#### `CreateApiKeyResult`

Result of {@link createApiKey} / {@link rotateApiKey}. The plaintext
token is returned exactly ONCE in this object — callers must persist
or display it immediately, because it cannot be recovered later.

```typescript
interface CreateApiKeyResult {
  /** The freshly persisted API key record. */
  apiKey: ApiKey
  /** The plaintext token. Returned exactly once. */
  plaintext: string
}
```

#### `Resource`

Resource definition for use with the standard molecule resource registry.

```typescript
interface Resource {
  name: string
  tableName: string
  schema: unknown
}
```

### Types

#### `ApiKeyHashVersion`

The hash algorithm version stored on each row. Allows future
migration from SHA-256 to a stronger algorithm without breaking
verification of existing keys.

```typescript
type ApiKeyHashVersion = 1
```

### Functions

#### `constantTimeEqual(a, b)`

Constant-time compare of two strings of arbitrary length.

Uses {@link timingSafeEqual} — when the lengths differ, falsifies
after a same-shape compare so the runtime does not leak length
information to an attacker.

```typescript
function constantTimeEqual(a: string, b: string): boolean
```

- `a` — First string.
- `b` — Second string.

**Returns:** True iff `a` and `b` are byte-identical.

#### `createApiKey(input)`

Create a new API key. Generates a fresh plaintext token, hashes it
with SHA-256, persists the row, and returns BOTH the persisted record
and the plaintext.

The plaintext is returned exactly once — callers MUST surface it
immediately to the user (or store it in their own vault). It cannot
be recovered after this call returns.

```typescript
function createApiKey(input: CreateApiKeyInput): Promise<CreateApiKeyResult>
```

- `input` — Creation parameters.

**Returns:** The persisted {@link ApiKey} plus its plaintext token.

#### `generatePlaintextToken(prefix)`

Generate a cryptographically random plaintext API token.

The returned string has the form `<prefix><base64url>`, where
`<base64url>` is {@link PLAINTEXT_BYTES} random bytes encoded
url-safely. Callers must treat the result as a secret — it is the
only chance to surface the plaintext to a user.

```typescript
function generatePlaintextToken(prefix?: string): string
```

- `prefix` — Optional token prefix (e.g. `'sk_live_'`). Defaults to {@link DEFAULT_PREFIX}.

**Returns:** The newly generated plaintext token.

#### `hashPlaintextToken(plaintext)`

SHA-256-hash a plaintext token. Deterministic for a given input.

```typescript
function hashPlaintextToken(plaintext: string): string
```

- `plaintext` — The plaintext token to hash.

**Returns:** Hex-encoded SHA-256 digest.

#### `maskPlaintextToken(plaintext, prefix)`

Build a UI-safe display string of the form `<prefix>…<last4>`.

The middle of the token is replaced with an ellipsis; only the
configured prefix and last {@link MASKED_TAIL_LENGTH} characters
are kept.

```typescript
function maskPlaintextToken(plaintext: string, prefix?: string): string
```

- `plaintext` — The plaintext token.
- `prefix` — Optional prefix override. When omitted, the function infers it from the leading `<word>_` segment of `plaintext`, falling back to {@link DEFAULT_PREFIX}.

**Returns:** The masked display string.

#### `recordApiKeyUse(id)`

Record that an API key was just used to authenticate. Sets
`last_used_at` to the current time.

```typescript
function recordApiKeyUse(id: string): Promise<void>
```

- `id` — ID of the key that was used.

#### `revokeApiKey(id)`

Revoke an API key. Sets `revoked_at` to the current time. Subsequent
calls to {@link verifyApiKey} with the matching plaintext will return
`null`.

```typescript
function revokeApiKey(id: string): Promise<void>
```

- `id` — ID of the key to revoke.

#### `rotateApiKey(id)`

Rotate an existing API key. Revokes the old row and creates a fresh
key (new plaintext, new hash, new masked) that inherits the original
key's `user_id`, `name`, `scopes`, and `expires_at`.

The freshly generated plaintext is returned exactly once.

```typescript
function rotateApiKey(id: string): Promise<CreateApiKeyResult>
```

- `id` — ID of the existing key to rotate.

**Returns:** The new {@link ApiKey} plus its plaintext token.

#### `verifyApiKey(plaintext)`

Verify a plaintext API key. Hashes the input, looks up the row by
hash, then constant-time-compares the stored hash against the
recomputed hash before performing any short-circuit return.

Returns `null` if the key is not found, has been revoked, or is
past its expiration.

```typescript
function verifyApiKey(plaintext: string): Promise<ApiKey | null>
```

- `plaintext` — The plaintext token to verify.

**Returns:** The matching {@link ApiKey}, or `null` if no valid match exists.

### Constants

#### `DEFAULT_PREFIX`

Default token prefix when one isn't supplied.

```typescript
const DEFAULT_PREFIX: "sk_"
```

#### `i18nRegistered`

Marker indicating that the i18n locale module has been wired up.

```typescript
const i18nRegistered: true
```

#### `MASKED_TAIL_LENGTH`

Number of trailing plaintext characters to surface in the masked display.

```typescript
const MASKED_TAIL_LENGTH: 4
```

#### `PLAINTEXT_BYTES`

Number of random bytes that back each plaintext token (256 bits).

```typescript
const PLAINTEXT_BYTES: 32
```

#### `resource`

API key resource definition with JSON schema for validation.

```typescript
const resource: types.Resource
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-bond` ^1.0.0
- `@molecule/api-database` ^1.0.0
- `@molecule/api-i18n` ^1.0.0
- `@molecule/api-locales-resource-api-key` ^1.0.0
- `@molecule/api-resource` ^1.0.0

### Runtime Dependencies

- `@molecule/api-bond`
- `@molecule/api-database`
- `@molecule/api-i18n`
- `@molecule/api-locales-resource-api-key`
- `@molecule/api-resource`

- **Migration required.** The `setup/api_keys.sql` migration file ships with
  this package and must be applied to the target database before use.
- **No routes ship — you own the HTTP surface AND the ownership checks.** The
  service functions are deliberately auth-agnostic: `rotateApiKey(id)` and
  `revokeApiKey(id)` act on any id. Every endpoint you expose must
  authenticate AND verify the key's `user_id` matches the caller before
  acting — exposing them keyed by `:id` alone is an IDOR.
- **Never send `hashed_token` to a client** — return `masked` for display. The
  plaintext exists exactly once, in the `createApiKey`/`rotateApiKey` result;
  surface it immediately or it is unrecoverable.
- **Scopes are stored, not enforced.** `verifyApiKey()` only proves the token
  is valid, unexpired, and unrevoked — YOUR auth middleware must check
  `verified.scopes` against the scope each route requires.
- Call `recordApiKeyUse(verified.id)` after a successful authentication if you
  want `last_used_at` accuracy — it is not automatic.

## E2E Tests

Integration checklist — drive the real UI (live preview, no mocks), adapt
each item to this app's actual screens/flows, and check every box off one
by one. A box you can't check is an integration bug to fix — not a skip:
- [ ] Creating a key surfaces the full plaintext token EXACTLY ONCE at
  creation (the `plaintext` returned by `createApiKey`) and never again.
  Reload the list and open the key's detail view: both show only `masked`
  (e.g. `sk_…ABCD`) plus metadata (name, scopes, created/last-used/expiry),
  never the full token. Confirm the raw key is unrecoverable — the DB stores
  `hashed_token` (a SHA-256 hash), so no view, endpoint, or API response can
  hand the plaintext back.
- [ ] Authenticating a real request with the plaintext works (`verifyApiKey`
  accepts it) and, after a successful call, the key's `last_used_at` updates
  in the UI — the app must call `recordApiKeyUse` on success, it is not
  automatic. An unknown or garbage token is rejected.
- [ ] Scopes are ENFORCED, not merely stored: a key limited to one scope is
  refused on an out-of-scope action while an in-scope action succeeds.
  `verifyApiKey` only proves the token is valid — your route/middleware MUST
  check `scopes` against what the route requires; a route that skips that
  check is the integration bug.
- [ ] An EXPIRED key (`expires_at` in the past) and a REVOKED key are each
  rejected with 401 immediately. Revoke a key while it is in active use and
  confirm the very next request bearing it fails mid-session — no grace
  window, no cached pass.
- [ ] Authorization holds both ways. A user manages only THEIR OWN keys:
  guessing another user's key `id` in the view/rotate/revoke endpoints is
  refused (no IDOR — `rotateApiKey`/`revokeApiKey` act on ANY id, so the
  route MUST match the key's `user_id` to the caller). And a valid key
  authenticates only as its owner — it can never be used to act as another
  user.
- [ ] Creating a key requires the user's OWN authenticated session: an
  unauthenticated caller cannot mint a key, and every created key is owned
  by the session that created it.

## Translations

Translation strings are provided by `@molecule/api-locales-resource-api-key`.
