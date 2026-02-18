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
   * Verifies a TOTP token against a secret.
   */
  verify(params: TwoFactorVerifyParams): Promise<boolean>
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
function verify(params: TwoFactorVerifyParams): Promise<boolean>
```

- `params` — The verification parameters containing the secret and token.

**Returns:** `true` if the token is valid for the given secret.

## Available Providers

| Provider | Package |
|----------|---------|
| otplib | `@molecule/api-two-factor-otplib` |

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-bond` ^1.0.0
