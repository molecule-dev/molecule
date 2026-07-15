# @molecule/api-hotels-amadeus

Amadeus hotels provider for molecule.dev.

Implements the `HotelsProvider` interface against the Amadeus
Self-Service hotels APIs. Provides hotel search (city or geo),
priced offer lookup (`/v3/shopping/hotel-offers`), and a booking
stub that explicitly surfaces "use the hosted checkout flow"
(Amadeus's direct hotel-booking endpoint requires PCI-compliant
card capture and is not safely callable from a generic bond).

Authentication uses Amadeus's OAuth2 client-credentials flow, with
the same `AMADEUS_CLIENT_ID` / `AMADEUS_CLIENT_SECRET` env vars
shared with `@molecule/api-flights-amadeus`. The bond mints and
caches tokens per-provider-instance.

The OAuth secret NEVER appears in error messages. URLs do not carry
authentication in the query string — the bearer token is sent via
the `Authorization` header — so URL-redaction is unnecessary.

## Quick Start

```typescript
import { setProvider } from '@molecule/api-hotels'
import { provider } from '@molecule/api-hotels-amadeus'

setProvider(provider)
```

## Type
`provider`

## Installation
```bash
npm install @molecule/api-hotels-amadeus @molecule/api-hotels @molecule/api-secrets
```

## API

### Interfaces

#### `AmadeusHotelsConfig`

Configuration options for the Amadeus hotels provider.

Amadeus exposes a single OAuth2 client-credentials flow that is shared
across all of its product APIs (flights, hotels, points-of-interest,
etc.). The same `AMADEUS_CLIENT_ID` / `AMADEUS_CLIENT_SECRET` env vars
therefore drive both `@molecule/api-flights-amadeus` and
`@molecule/api-hotels-amadeus`. Token caching is per-provider-instance
— there is no cross-bond shared cache, but the OAuth pattern is
identical so credentials work interchangeably.

```typescript
interface AmadeusHotelsConfig {
  /**
   * OAuth2 client ID, sent as the `client_id` form field when minting a
   * fresh access token.
   *
   * If omitted, the provider falls back to the `AMADEUS_CLIENT_ID`
   * environment variable. Requests fail with a sanitized error if
   * neither is set.
   */
  clientId?: string

  /**
   * OAuth2 client secret, sent as the `client_secret` form field when
   * minting a fresh access token.
   *
   * If omitted, the provider falls back to the `AMADEUS_CLIENT_SECRET`
   * environment variable. The secret is NEVER included in error
   * messages — token-mint failures redact it before bubbling up.
   */
  clientSecret?: string

  /**
   * Base URL override. Defaults to the Amadeus production host
   * `'https://api.amadeus.com'`. Pass `'https://test.api.amadeus.com'`
   * for the free sandbox tier, or any proxy URL for self-hosted setups.
   */
  baseUrl?: string

  /**
   * Request timeout in milliseconds for both the token-mint call and the
   * data-API calls. Defaults to `10000`.
   */
  timeout?: number

  /**
   * Number of seconds to subtract from the upstream `expires_in` value
   * before treating a cached token as stale. Defaults to `30`. Lower
   * values reduce wasted token mints; higher values reduce the chance
   * of using a token that expires mid-request.
   */
  tokenSkewSeconds?: number
}
```

### Functions

#### `createProvider(config)`

Creates an Amadeus hotels provider.

```typescript
function createProvider(config?: AmadeusHotelsConfig): HotelsProvider
```

- `config` — Provider configuration. Credentials may be supplied

**Returns:** A {@link HotelsProvider} backed by Amadeus.

#### `sanitizeErrorMessage(message)`

Returns a sanitized copy of an error message body. Currently a no-op
passthrough for the common "errors[].detail" shape — exposed for
symmetry with the flights bond and to keep the redaction surface
documented in one place.

```typescript
function sanitizeErrorMessage(message: string): string
```

- `message` — A free-form upstream error message.

**Returns:** The same message, with any future-redacted patterns scrubbed.

### Constants

#### `BOOKING_NOT_SUPPORTED`

Error code raised when {@link HotelsProvider.bookHotel} is called.
Amadeus's hotel-booking endpoint requires PCI-compliant card capture
and is not safely callable from a generic backend bond — callers
should use Amadeus's hosted checkout / "price the offer" flow
instead.

```typescript
const BOOKING_NOT_SUPPORTED: "BOOKING_NOT_SUPPORTED"
```

#### `hotelsAmadeusSecretDefinitions`

Secret definitions required by the Amadeus hotels bond.

```typescript
const hotelsAmadeusSecretDefinitions: SecretDefinition[]
```

#### `MISSING_CREDENTIALS`

Error code raised when a hotels-provider call is attempted with no
`AMADEUS_CLIENT_ID` and/or `AMADEUS_CLIENT_SECRET` configured (neither
via the config object nor via environment variables). Surfaced via
`Error.cause` so callers can distinguish it from upstream errors.

```typescript
const MISSING_CREDENTIALS: "MISSING_CREDENTIALS"
```

#### `provider`

The default provider implementation, lazily initialized on first use.

Reads `AMADEUS_CLIENT_ID`, `AMADEUS_CLIENT_SECRET`, and (optional)
`AMADEUS_BASE_URL` from environment variables. Use {@link createProvider}
directly if you need to supply configuration programmatically.

```typescript
const provider: HotelsProvider
```

#### `TOKEN_MINT_FAILED`

Error code raised when the OAuth2 token-mint call fails (e.g. invalid
credentials, network error, non-2xx status). The error message NEVER
includes the raw `client_secret`.

```typescript
const TOKEN_MINT_FAILED: "TOKEN_MINT_FAILED"
```

#### `UPSTREAM_ERROR`

Error code raised when an Amadeus hotels data API call fails (e.g. a
non-2xx HTTP status, a structured `errors[]` body, etc.).

```typescript
const UPSTREAM_ERROR: "UPSTREAM_ERROR"
```

## Core Interface
Implements `@molecule/api-hotels` interface.

## Bond Wiring

Setup function to register this provider with the core interface:

```typescript
import { setProvider } from '@molecule/api-hotels'
import { provider } from '@molecule/api-hotels-amadeus'

export function setupHotelsAmadeus(): void {
  setProvider(provider)
}
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-hotels` ^1.0.0
- `@molecule/api-secrets` ^1.0.0

### Environment Variables

- `AMADEUS_CLIENT_ID` *(required)* — Amadeus API key
  - Setup: Create an app in Amadeus for Developers (Self-Service) and copy the API Key.
  - Get it here: [https://developers.amadeus.com/my-apps](https://developers.amadeus.com/my-apps)
- `AMADEUS_CLIENT_SECRET` *(required)* — Amadeus API secret
  - Setup: Copy the API Secret from your Amadeus app page.
  - Get it here: [https://developers.amadeus.com/my-apps](https://developers.amadeus.com/my-apps)

### Runtime Dependencies

- `@molecule/api-hotels`
- `@molecule/api-secrets`
