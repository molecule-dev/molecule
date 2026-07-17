# @molecule/api-jwt

JWT interface for molecule.dev.

Provides an abstract JWT interface that can be backed by any JWT library.
Use `setProvider` to provide a concrete implementation
such as `@molecule/api-jwt-jsonwebtoken`.

## Quick Start

```ts
import { sign, verify, decode } from '@molecule/api-jwt'

const token = sign({ userId }, { expiresIn: '15m' }) // server-side; expiry set

try {
  const claims = verify(token) as JwtPayload // signature CHECKED — safe to trust
  grantAccess(claims.userId)
} catch {
  res.status(401).json({ error: 'Invalid or expired token.' })
}

decode(token) // NOT verified — never use its output for an auth decision
```

## Type
`core`

## Installation
```bash
npm install @molecule/api-jwt @molecule/api-bond
```

## API

### Interfaces

#### `JwtDecodeOptions`

Options for decoding a JWT (without verification).

```typescript
interface JwtDecodeOptions {
  complete?: boolean
  json?: boolean
}
```

#### `JwtPayload`

Decoded JWT payload.

```typescript
interface JwtPayload {
  [key: string]: unknown
  iss?: string
  sub?: string
  aud?: string | string[]
  exp?: number
  nbf?: number
  iat?: number
  jti?: string
}
```

#### `JwtProvider`

JWT provider interface that all JWT bond packages must implement.

Provides `sign`, `verify`, and `decode` operations. Key management
and algorithm configuration are handled by the core package.

```typescript
interface JwtProvider {
  sign(payload: JSONObject, options?: JwtSignOptions, privateKey?: string | Buffer): string

  verify(
    token: string,
    options?: JwtVerifyOptions,
    publicKey?: string | Buffer,
  ): string | JwtPayload

  decode(token: string, options?: JwtDecodeOptions): string | JwtPayload | null
}
```

#### `JwtSignOptions`

Options for signing a JWT.

```typescript
interface JwtSignOptions {
  algorithm?: JwtAlgorithm
  expiresIn?: number | string
  notBefore?: number | string
  audience?: string | string[]
  issuer?: string
  subject?: string
  jwtid?: string
  keyid?: string
  header?: Record<string, unknown>
}
```

#### `JwtVerifyOptions`

Options for verifying a JWT.

Note: security-hardened bonds (e.g. `@molecule/api-jwt-jsonwebtoken`)
REFUSE to honor `ignoreExpiration`/`ignoreNotBefore` — an expired token
always fails verification regardless of these flags. To tolerate clock
skew or slow flows, use `clockTolerance` (seconds) instead.

```typescript
interface JwtVerifyOptions {
  algorithms?: JwtAlgorithm[]
  audience?: string | string[]
  issuer?: string | string[]
  subject?: string
  clockTolerance?: number
  maxAge?: string | number
  complete?: boolean
  ignoreExpiration?: boolean
  ignoreNotBefore?: boolean
}
```

### Types

#### `JSONObject`

A plain JSON object whose values are `JSONValue`s. Used as the payload
type for JWT signing operations.

```typescript
type JSONObject = { [key: string]: JSONValue }
```

#### `JSONValue`

Recursive JSON value type representing any valid JSON primitive, array, or object.

```typescript
type JSONValue =
  | string
  | number
  | boolean
  | null
  | JSONValue[]
  | { [key: string]: JSONValue }
```

#### `JwtAlgorithm`

Supported JWT signing algorithms.

```typescript
type JwtAlgorithm =
  | 'RS256'
  | 'RS384'
  | 'RS512'
  | 'HS256'
  | 'HS384'
  | 'HS512'
  | 'ES256'
  | 'ES384'
  | 'ES512'
  | 'PS256'
  | 'PS384'
  | 'PS512'
```

### Functions

#### `decode(token, options)`

Decodes a JWT string without verifying its signature. Useful for inspecting
token contents when verification is handled elsewhere.

```typescript
function decode(token: string, options?: JwtDecodeOptions): string | JwtPayload | null
```

- `token` — The JWT string to decode.
- `options` — Decode options such as `complete` for full header+payload output.

**Returns:** The decoded payload, or `null` if the token cannot be decoded.

#### `generateKeyPairSync()`

Generates an RSA-2048 key pair in PEM format for JWT signing and verification.

```typescript
function generateKeyPairSync(): { publicKey: string; privateKey: string; }
```

**Returns:** An object containing `publicKey` and `privateKey` as PEM strings.

#### `getProvider()`

Retrieves the bonded JWT provider, throwing if none is configured.

```typescript
function getProvider(): JwtProvider
```

**Returns:** The bonded JWT provider.

#### `hasProvider()`

Checks whether a JWT provider is currently bonded.

```typescript
function hasProvider(): boolean
```

**Returns:** `true` if a JWT provider is bonded.

#### `setProvider(provider)`

Registers a JWT provider as the active singleton. Called by bond
packages during application startup.

```typescript
function setProvider(provider: JwtProvider): void
```

- `provider` — The JWT provider implementation to bond.

#### `sign(object, options, privateKey)`

Signs a payload into a JWT string using the bonded provider. Uses the
configured algorithm, expiry, and private key as defaults.

```typescript
function sign(object: JSONObject, { algorithm = JWT_ALGORITHM, expiresIn = JWT_EXPIRES_TIME, ...rest }?: JwtSignOptions, privateKey?: string | Buffer<ArrayBufferLike>): string
```

- `object` — The JSON payload to sign.
- `options` — Signing options; `algorithm` defaults to `JWT_ALGORITHM`, `expiresIn` defaults to `JWT_EXPIRES_TIME`.
- `options.algorithm` — The signing algorithm (e.g. `RS256`, `HS256`).
- `options.expiresIn` — Token lifetime in seconds.
- `privateKey` — The private key for signing; defaults to `JWT_PRIVATE_KEY`.

**Returns:** The signed JWT string.

#### `verify(token, options, publicKey)`

Verifies a JWT string and returns the decoded payload. Uses the configured
algorithm and public key as defaults.

```typescript
function verify(token: string, { algorithms = [JWT_ALGORITHM], ...rest }?: JwtVerifyOptions, publicKey?: string | Buffer<ArrayBufferLike>): string | JwtPayload
```

- `token` — The JWT string to verify.
- `options` — Verification options; `algorithms` defaults to `[JWT_ALGORITHM]`.
- `options.algorithms` — The allowed signing algorithms for verification.
- `publicKey` — The public key for verification; defaults to `JWT_PUBLIC_KEY`.

**Returns:** The decoded payload string or object.

#### `writeKeys(outputPath)`

Writes a freshly generated RSA key pair to disk as PEM files. Creates
the output directory if it does not exist.

```typescript
function writeKeys(outputPath?: string): void
```

- `outputPath` — Directory to write the PEM files into; defaults to `{JWT_KEYS_DIR}/{NODE_ENV}/`.

### Constants

#### `JWT_ALGORITHM`

The signing algorithm used for JWT operations. Read from the `JWT_ALGORITHM`
environment variable, defaulting to `RS256`. An unrecognized value logs an
actionable warning at module load and falls back to `RS256` rather than
failing every `sign()`/`verify()` call later with an unexplained
"invalid algorithm" error.

```typescript
const JWT_ALGORITHM: JwtAlgorithm
```

#### `JWT_EXPIRES_TIME`

Token lifetime in seconds. Read from the `JWT_EXPIRES_TIME` environment
variable, defaulting to 604800 (1 week).

```typescript
const JWT_EXPIRES_TIME: number
```

#### `JWT_PRIVATE_KEY`

The RSA private key for signing JWTs. Read from the `JWT_PRIVATE_KEY`
environment variable, or loaded from the PEM file on disk.

Throws at startup if neither source provides a key — running with an
empty secret would allow anyone to forge valid JWTs.

```typescript
const JWT_PRIVATE_KEY: string | Buffer<ArrayBufferLike>
```

#### `JWT_PUBLIC_KEY`

The RSA public key for verifying JWTs. Read from the `JWT_PUBLIC_KEY`
environment variable; when only `JWT_PRIVATE_KEY` is set, the matching
public key is DERIVED from it (a disk fallback could not match an
env-provided private key and would make every signed token fail
verification); otherwise loaded from the PEM file on disk.

Throws at startup if no source provides a key.

```typescript
const JWT_PUBLIC_KEY: string | Buffer<ArrayBufferLike>
```

#### `JWT_REFRESH_TIME`

Refresh window in seconds — tokens are refreshed if they will expire within
this period. Read from the `JWT_REFRESH_TIME` environment variable,
defaulting to 3600 (1 hour).

```typescript
const JWT_REFRESH_TIME: number
```

## Available Providers

| Provider | Package |
|----------|---------|
| JWT signing keys | `@molecule/api-jwt-jsonwebtoken` |

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-bond` ^1.0.0

### Runtime Dependencies

- `@molecule/api-bond`

**{@link verify} is the ONLY way to trust a token — {@link decode} does NOT check the
signature.** Never make an auth decision from `decode()`: an attacker can forge any
payload that `decode()` will happily return. Use `verify()` (it throws — catch it) for
anything security-relevant; `decode()` is only for reading a token you do NOT trust.

- The signing key (private key / secret) is SERVER-SIDE only — never ship it to the
  browser. Only an asymmetric PUBLIC key may be published.
- A JWT payload is READABLE by anyone (base64, not encrypted) — never put a password,
  secret, or sensitive PII in it.
- Always set + honor expiry ({@link JWT_EXPIRES_TIME}); a non-expiring token can't be
  revoked.
- In a molecule app auth is ALREADY wired: the global `verifyMiddleware` verifies the JWT
  and populates `res.locals.session`, so a handler calls `getUserId(res)` — do NOT call
  `verify()`/`sign()` by hand for the session (see the `auth` skill). Use these directly
  only for a CUSTOM token, e.g. a signed email/reset link.
- **Re-signing decoded claims (refresh flows): strip `exp`/`iat` first.** `sign()`
  always sets `expiresIn` (default {@link JWT_EXPIRES_TIME}), and the underlying library
  throws (`Bad "options.expiresIn" option the payload already has an "exp" property`)
  when the payload still carries the old `exp` — so `const { exp, iat, ...claims } =
  verify(oldToken) as JwtPayload; sign(claims)` is the correct refresh shape.
- Set `JWT_PRIVATE_KEY` and `JWT_PUBLIC_KEY` together (or neither). If only the private
  key is set, the matching public key is DERIVED from it automatically; setting only the
  public key is for verify-only deployments.
- When neither key env var is set, a key pair is auto-generated on disk at
  `{JWT_KEYS_DIR}/{NODE_ENV}/` — default `JWT_KEYS_DIR`: `process.cwd() + '/.keys'`, a
  stable app-level directory (NOT inside `node_modules`, so `npm ci`/reinstall never
  wipes it). Set `JWT_KEYS_DIR` to relocate it (e.g. a persistent volume in production).
  A pre-existing pair at the legacy `node_modules`-relative location is migrated forward
  automatically (with a logged warning) instead of being silently regenerated.
- `JWT_ALGORITHM` (default `RS256`) is validated at module load against the
  {@link JwtAlgorithm} union; an unrecognized value (e.g. a typo like `rs256`) logs an
  actionable warning and falls back to `RS256` instead of failing every `sign()`/`verify()`
  call later with an opaque "invalid algorithm" error.
