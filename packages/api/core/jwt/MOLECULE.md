# @molecule/api-jwt

JWT interface for molecule.dev.

Provides an abstract JWT interface that can be backed by any JWT library.
Use `setProvider` to provide a concrete implementation
such as `@molecule/api-jwt-jsonwebtoken`.

## Type
`core`

## Installation
```bash
npm install @molecule/api-jwt
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

#### `sign(object, options, options, options, privateKey)`

Signs a payload into a JWT string using the bonded provider. Uses the
configured algorithm, expiry, and private key as defaults.

```typescript
function sign(object: JSONObject, { algorithm = JWT_ALGORITHM, expiresIn = JWT_EXPIRES_TIME, ...rest }?: JwtSignOptions, privateKey?: string | Buffer<ArrayBufferLike>): string
```

- `object` — The JSON payload to sign.
- `options` — Signing options; `algorithm` defaults to `JWT_ALGORITHM`, `expiresIn` defaults to `JWT_EXPIRES_TIME`.
- `options` — .algorithm - The signing algorithm (e.g. `RS256`, `HS256`).
- `options` — .expiresIn - Token lifetime in seconds.
- `privateKey` — The private key for signing; defaults to `JWT_PRIVATE_KEY`.

**Returns:** The signed JWT string.

#### `verify(token, options, options, publicKey)`

Verifies a JWT string and returns the decoded payload. Uses the configured
algorithm and public key as defaults.

```typescript
function verify(token: string, { algorithms = [JWT_ALGORITHM], ...rest }?: JwtVerifyOptions, publicKey?: string | Buffer<ArrayBufferLike>): string | JwtPayload
```

- `token` — The JWT string to verify.
- `options` — Verification options; `algorithms` defaults to `[JWT_ALGORITHM]`.
- `options` — .algorithms - The allowed signing algorithms for verification.
- `publicKey` — The public key for verification; defaults to `JWT_PUBLIC_KEY`.

**Returns:** The decoded payload string or object.

#### `writeKeys(outputPath)`

Writes a freshly generated RSA key pair to disk as PEM files. Creates
the output directory if it does not exist.

```typescript
function writeKeys(outputPath?: string): void
```

- `outputPath` — Directory to write the PEM files into; defaults to `.keys/{NODE_ENV}/`.

### Constants

#### `JWT_ALGORITHM`

The signing algorithm used for JWT operations. Read from the `JWT_ALGORITHM`
environment variable, defaulting to `RS256`.

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

```typescript
const JWT_PRIVATE_KEY: string | NonSharedBuffer
```

#### `JWT_PUBLIC_KEY`

The RSA public key for verifying JWTs. Read from the `JWT_PUBLIC_KEY`
environment variable, or loaded from the PEM file on disk.

```typescript
const JWT_PUBLIC_KEY: string | NonSharedBuffer
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
| jsonwebtoken | `@molecule/api-jwt-jsonwebtoken` |

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-bond` ^1.0.0
