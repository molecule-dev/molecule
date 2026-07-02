# @molecule/api-two-factor

Two-factor authentication interface for molecule.dev.

Provides an abstract two-factor authentication interface that can be
backed by any TOTP library. Use `setProvider` to provide a concrete
implementation such as `@molecule/api-two-factor-otplib`.

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
