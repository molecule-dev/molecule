# @molecule/api-travel-amadeus

Amadeus travel trip-planning provider for molecule.dev.

Implements the `TravelProvider` interface against the Amadeus
Self-Service flight, hotel and activities APIs. Defaults to the
test sandbox (`https://test.api.amadeus.com`); set
`AMADEUS_USE_PRODUCTION=true` to route to production.

Reuses the same `AMADEUS_CLIENT_ID` / `AMADEUS_CLIENT_SECRET`
credentials as `@molecule/api-flights-amadeus` and
`@molecule/api-hotels-amadeus` — Amadeus issues a single
client-credentials pair per account that grants access to all of
its Self-Service products.

Cars are intentionally returned as an empty array: Amadeus does not
expose a public car-rental API as of v22.

## Quick Start

```typescript
import { setProvider } from '@molecule/api-travel'
import { provider } from '@molecule/api-travel-amadeus'

setProvider(provider)
```

## Type
`provider`

## Installation
```bash
npm install @molecule/api-travel-amadeus
```

## API

### Interfaces

#### `AmadeusTravelConfig`

Configuration options for the Amadeus travel trip-planning provider.

The bond reuses the SAME OAuth2 client-credentials flow as
`@molecule/api-flights-amadeus` and `@molecule/api-hotels-amadeus`:
a single `AMADEUS_CLIENT_ID` / `AMADEUS_CLIENT_SECRET` pair grants
access to flights, hotels, points-of-interest (used for activities)
and any other Self-Service product on the same account. There is no
cross-bond shared cache — each provider instance mints its own token
— but credentials are interchangeable.

```typescript
interface AmadeusTravelConfig {
  /**
   * OAuth2 client ID, sent as the `client_id` form field when minting
   * a fresh access token.
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
   * environment variable. The secret is NEVER included in any error
   * message — token-mint failures redact it before bubbling up.
   */
  clientSecret?: string

  /**
   * When `true`, routes requests to the production endpoint
   * (`https://api.amadeus.com`). When `false` or omitted, uses the
   * Self-Service test sandbox (`https://test.api.amadeus.com`).
   */
  useProduction?: boolean

  /**
   * Base URL override. Takes precedence over {@link useProduction}.
   */
  baseUrl?: string

  /**
   * Request timeout in milliseconds for both the token-mint call and
   * the data-API calls. Defaults to `15000`.
   */
  timeout?: number

  /**
   * Number of seconds to subtract from the upstream `expires_in`
   * value before treating a cached token as stale. Defaults to `30`.
   */
  tokenSkewSeconds?: number
}
```

### Classes

#### `AmadeusTravelMissingCredentialsError`

Error thrown by the Amadeus travel provider when no client
credentials are configured.

Never includes any credential value in its message or properties.

#### `AmadeusTravelTokenMintError`

Error thrown by the Amadeus travel provider when the OAuth2
token-mint call fails. The `client_secret` NEVER appears in this
error's message or properties.

#### `AmadeusTravelUpstreamError`

Error thrown by the Amadeus travel provider for any non-OK upstream
data-API response. Never includes the OAuth secret.

### Functions

#### `createProvider(config)`

Creates an Amadeus travel trip-planning provider.

```typescript
function createProvider(config?: AmadeusTravelConfig): TravelProvider
```

- `config` — Provider configuration. Credentials may be supplied

**Returns:** A {@link TravelProvider} backed by Amadeus.

### Constants

#### `MISSING_CREDENTIALS`

Stable error code emitted by the Amadeus travel provider when neither
`clientId` nor `clientSecret` (nor their env-var fallbacks) are
configured.

```typescript
const MISSING_CREDENTIALS: "MISSING_CREDENTIALS"
```

#### `provider`

The default provider implementation, lazily initialized on first
use.

Reads `AMADEUS_CLIENT_ID`, `AMADEUS_CLIENT_SECRET`,
`AMADEUS_USE_PRODUCTION`, and `AMADEUS_BASE_URL` from environment
variables. Use {@link createProvider} directly if you need to supply
configuration programmatically.

```typescript
const provider: TravelProvider
```

#### `TOKEN_MINT_FAILED`

Stable error code emitted by the Amadeus travel provider when the
OAuth2 token-mint call fails.

```typescript
const TOKEN_MINT_FAILED: "TOKEN_MINT_FAILED"
```

#### `UPSTREAM_ERROR`

Stable error code emitted by the Amadeus travel provider for any
non-OK upstream HTTP response (including HTTP 429).

```typescript
const UPSTREAM_ERROR: "UPSTREAM_ERROR"
```

## Core Interface
Implements `@molecule/api-travel` interface.

## Bond Wiring

Setup function to register this provider with the core interface:

```typescript
import { setProvider } from '@molecule/api-travel'
import { provider } from '@molecule/api-travel-amadeus'

export function setupTravelAmadeus(): void {
  setProvider(provider)
}
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-travel` ^1.0.0

### Environment Variables

- `AMADEUS_CLIENT_ID` *(required)*
- `AMADEUS_CLIENT_SECRET` *(required)*
