# @molecule/api-resource-device-auth-token

Per-device long-lived bearer tokens — hashed at rest, scoped,
revocable, with last-used tracking. Distinct from human user session
tokens.

Apps depend on this package directly and read/write through the
abstract `DataStore` from `@molecule/api-database`. Mirrors
`@molecule/api-resource-api-key` but oriented at device entities for
headless device authentication (IoT fleets, smart home hubs,
monitoring agents).

## Quick Start

```typescript
import { issueToken, verifyToken, recordTokenUse } from '@molecule/api-resource-device-auth-token'

// Issue a new token. The plaintext is returned exactly ONCE.
const { token, plaintext } = await issueToken({
  device_id: device.id,
  scopes: ['telemetry:write'],
})

// Later — incoming request bearing the plaintext token:
const verified = await verifyToken(plaintext)
if (verified) await recordTokenUse(verified.id, request.ip)
```

## Type
`resource`

## Installation
```bash
npm install @molecule/api-resource-device-auth-token @molecule/api-database @molecule/api-resource
```

## API

### Interfaces

#### `DeviceAuthToken`

A persisted device auth token record. The plaintext token is never
stored — only its SHA-256 hash. The plaintext is returned exactly
once at issue/rotation time.

```typescript
interface DeviceAuthToken {
  /** Primary key (UUID). */
  id: string
  /** ID of the device that owns this token. */
  device_id: string
  /** SHA-256 hash of the plaintext token (hex). */
  hashed_token: string
  /** Display string safe to surface in UIs (e.g. `dvt_…ABCD`). */
  masked: string
  /** Permission scopes granted to this token. */
  scopes: string[]
  /** Last time the token was successfully used to authenticate, or null. */
  last_used_at: Date | null
  /** Last IP address that used this token, or null. */
  last_used_ip: string | null
  /** Optional expiration timestamp. Null means never expires. */
  expires_at: Date | null
  /** Creation timestamp. */
  created_at: Date
  /** When the token was revoked, or null if still active. */
  revoked_at: Date | null
  /** Hash algorithm version — used for future migration paths. */
  version: DeviceAuthTokenHashVersion
}
```

#### `IssueTokenInput`

Input shape for {@link issueToken}.

```typescript
interface IssueTokenInput {
  /** ID of the device to own the new token. */
  device_id: string
  /** Permission scopes for the token. Defaults to an empty array. */
  scopes?: string[]
  /** Optional expiration time. Null/undefined means never expires. */
  expires_at?: Date
  /**
   * Optional token prefix for masked display (e.g. `'dvt_live_'`).
   * Defaults to `'dvt_'`.
   */
  prefix?: string
}
```

#### `IssueTokenResult`

Result of {@link issueToken} / {@link rotateToken}. The plaintext
token is returned exactly ONCE in this object — callers must persist
or display it immediately, because it cannot be recovered later.

```typescript
interface IssueTokenResult {
  /** The freshly persisted device auth token record. */
  token: DeviceAuthToken
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

#### `DeviceAuthTokenHashVersion`

The hash algorithm version stored on each row. Allows future
migration from SHA-256 to a stronger algorithm without breaking
verification of existing tokens.

```typescript
type DeviceAuthTokenHashVersion = 1
```

### Functions

#### `constantTimeEqual(a, b)`

Constant-time compare of two strings of arbitrary length.

Uses Node's `crypto.timingSafeEqual` — when the lengths differ,
falsifies after a same-shape compare so the runtime does not leak
length information to an attacker.

```typescript
function constantTimeEqual(a: string, b: string): boolean
```

- `a` — First string.
- `b` — Second string.

**Returns:** True iff `a` and `b` are byte-identical.

#### `generatePlaintextToken(prefix)`

Generate a cryptographically random plaintext device token.

The returned string has the form `<prefix><base64url>`, where
`<base64url>` is {@link PLAINTEXT_BYTES} random bytes encoded
url-safely. Callers must treat the result as a secret — it is the
only chance to surface the plaintext to a device.

```typescript
function generatePlaintextToken(prefix?: string): string
```

- `prefix` — Optional token prefix (e.g. `'dvt_live_'`). Defaults to {@link DEFAULT_PREFIX}.

**Returns:** The newly generated plaintext token.

#### `hashPlaintextToken(plaintext)`

SHA-256-hash a plaintext token. Deterministic for a given input.

```typescript
function hashPlaintextToken(plaintext: string): string
```

- `plaintext` — The plaintext token to hash.

**Returns:** Hex-encoded SHA-256 digest.

#### `issueToken(input)`

Issue a new device auth token. Generates a fresh plaintext, hashes it
with SHA-256, persists the row, and returns BOTH the persisted record
and the plaintext.

The plaintext is returned exactly once — callers MUST surface it
immediately to the device (or store it in their own provisioning
vault). It cannot be recovered after this call returns.

```typescript
function issueToken(input: IssueTokenInput): Promise<IssueTokenResult>
```

- `input` — Issuance parameters.

**Returns:** The persisted {@link DeviceAuthToken} plus its plaintext token.

#### `listTokens(deviceId)`

List all auth tokens for a given device, newest first.

```typescript
function listTokens(deviceId: string): Promise<DeviceAuthToken[]>
```

- `deviceId` — ID of the device to enumerate tokens for.

**Returns:** Array of {@link DeviceAuthToken} rows. Empty if none exist.

#### `maskPlaintextToken(plaintext, prefix)`

Build a UI-safe display string of the form `<prefix>…<last4>`.

The middle of the token is replaced with an ellipsis; only the
configured prefix and last {@link MASKED_TAIL_LENGTH} characters
are kept.

```typescript
function maskPlaintextToken(plaintext: string, prefix?: string): string
```

- `plaintext` — The plaintext token.
- `prefix` — Optional prefix override. When omitted, the function infers it

**Returns:** The masked display string.

#### `recordTokenUse(tokenId, ip)`

Record that a device auth token was just used to authenticate. Sets
`last_used_at` to the current time and (optionally) updates
`last_used_ip`.

```typescript
function recordTokenUse(tokenId: string, ip?: string): Promise<void>
```

- `tokenId` — ID of the token that was used.
- `ip` — Optional IP address to record.

#### `revokeToken(tokenId)`

Revoke a device auth token. Sets `revoked_at` to the current time.
Subsequent calls to {@link verifyToken} with the matching plaintext
will return `null`.

```typescript
function revokeToken(tokenId: string): Promise<void>
```

- `tokenId` — ID of the token to revoke.

#### `rotateToken(tokenId)`

Rotate an existing device auth token. Revokes the old row and issues
a fresh token (new plaintext, new hash, new masked) that inherits the
original token's `device_id`, `scopes`, and `expires_at`.

The freshly generated plaintext is returned exactly once.

```typescript
function rotateToken(tokenId: string): Promise<IssueTokenResult>
```

- `tokenId` — ID of the existing token to rotate.

**Returns:** The new {@link DeviceAuthToken} plus its plaintext token.

#### `verifyToken(plaintext)`

Verify a plaintext device auth token. Hashes the input, looks up the
row by hash, then constant-time-compares the stored hash against the
recomputed hash before performing any short-circuit return.

Returns `null` if the token is not found, has been revoked, or is
past its expiration.

```typescript
function verifyToken(plaintext: string): Promise<DeviceAuthToken | null>
```

- `plaintext` — The plaintext token to verify.

**Returns:** The matching {@link DeviceAuthToken}, or `null` if no valid match exists.

### Constants

#### `DEFAULT_PREFIX`

Default token prefix when one isn't supplied.

```typescript
const DEFAULT_PREFIX: "dvt_"
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

Device auth token resource definition with JSON schema for validation.

```typescript
const resource: types.Resource
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-database` ^1.0.0
- `@molecule/api-resource` ^1.0.0

### Runtime Dependencies

- `@molecule/api-database`
- `@molecule/api-resource`

- **Migration required.** The `src/__setup__/device_auth_tokens.sql` migration
  file ships with this package and must be applied to the target database
  before use.
- **No routes ship — you own the HTTP surface AND the ownership checks.**
  `rotateToken(id)`, `revokeToken(id)`, and `listTokens(deviceId)` are
  auth-agnostic: any endpoint exposing them must authenticate the caller and
  verify the target device belongs to them (via your device/fleet ownership
  model) before acting — id-only exposure is an IDOR.
- **Never send `hashed_token` to a client** — return `masked`. The plaintext
  exists exactly once, in the `issueToken`/`rotateToken` result.
- **Scopes are stored, not enforced.** `verifyToken()` only proves the token is
  valid, unexpired, and unrevoked; your middleware must check
  `verified.scopes` per route. Call `recordTokenUse(verified.id, ip)` after
  successful auth if you want `last_used_at`/`last_used_ip` accuracy.

## E2E Tests

Integration checklist — SECURITY-critical (session/token management). Drive
the real UI (live preview, no mocks), adapt each item to this app's actual
screens/flows, and check every box off one by one. A box you can't check is a
security bug to fix — not a skip:
- [ ] Logging in / provisioning a device issues a token and the raw plaintext
  is handed to the client EXACTLY ONCE (the `issueToken` result). Inspect the
  persisted row: it stores `hashed_token` (SHA-256 hex) + `masked` only —
  never the plaintext. Confirm the raw token is unrecoverable from anything
  the server stores or later returns.
- [ ] The user's "active sessions/devices" list shows each active token with
  its metadata — `masked`, `last_used_at` / `last_used_ip`, `created_at` — and
  a used token updates `last_used_at` (call `recordTokenUse` after auth). The
  `hashed_token` never appears in any response.
- [ ] Revoking a session invalidates it IMMEDIATELY: after `revokeToken`, the
  very next request bearing that token is rejected (401) — `verifyToken`
  returns null the instant `revoked_at` is set, with no grace window.
- [ ] Expiry is enforced: a token past `expires_at` is rejected (401) even
  though it was never revoked; a null-`expires_at` token keeps working.
- [ ] Rotation: `rotateToken` issues a fresh token (new plaintext/hash/masked,
  same device + scopes + expiry) AND revokes the old one. Replaying the
  rotated-out token afterward is rejected (401 — it is now revoked); only the
  new plaintext authenticates.
- [ ] AUTHORIZATION — a caller sees and revokes only THEIR OWN sessions:
  guessing another user's token id to view or revoke it is rejected. No routes
  ship, so your endpoint MUST authenticate the caller and check device/fleet
  ownership before `listTokens` / `revokeToken` / `rotateToken` (id-only
  exposure is an IDOR). A verified token authenticates ONLY as its owner.
- [ ] "Log out all other devices" revokes every session EXCEPT the current
  one: afterward every other token is rejected (401) while the current token
  still works.
