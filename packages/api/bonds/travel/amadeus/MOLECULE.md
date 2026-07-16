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

Hotels require a check-out date: `searchTripOptions` prices hotels only
when `returnDate` is supplied — a one-way search (where `includeHotels`
defaults to true) resolves with `hotels: []` rather than throwing. Hotel
pricing is also best-effort per batch: individual batch failures are
swallowed and partial hotel results returned, so a short/empty hotels
array is not necessarily an upstream outage.

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
npm install @molecule/api-travel-amadeus @molecule/api-secrets @molecule/api-travel
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

#### `travelAmadeusSecretDefinitions`

Secret definitions required by the Amadeus travel bond.

```typescript
const travelAmadeusSecretDefinitions: SecretDefinition[]
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
- `@molecule/api-secrets` ^1.0.0
- `@molecule/api-travel` ^1.0.0

### Environment Variables

- `AMADEUS_CLIENT_ID` *(required)* — Amadeus API key
  - Setup: Create an app in Amadeus for Developers (Self-Service) and copy the API Key.
  - Get it here: [https://developers.amadeus.com/my-apps](https://developers.amadeus.com/my-apps)
- `AMADEUS_CLIENT_SECRET` *(required)* — Amadeus API secret
  - Setup: Copy the API Secret from your Amadeus app page.
  - Get it here: [https://developers.amadeus.com/my-apps](https://developers.amadeus.com/my-apps)

### Runtime Dependencies

- `@molecule/api-secrets`
- `@molecule/api-travel`

## E2E Tests

Integration checklist — drive the real UI (live preview, no mocks), adapt
each item to this app's actual trip-planning / results screens, and check
every box off one by one. A box you can't check is an integration bug to
fix — not a skip:
- [ ] A real trip search (`searchTripOptions` with a real `origin` ->
  `destination`, a `departureDate` weeks out, and `returnDate` for a round
  trip — e.g. JFK -> PAR) returns REAL results rendered in the UI: each
  opted-in vertical (`includeFlights` / `includeHotels` / `includeCars` /
  `includeActivities`) shows populated `flights` / `hotels` / `cars` /
  `activities`, each an actual offer — never an empty list, a stuck spinner,
  or a placeholder row presented as a successful search.
- [ ] Results match the query: each `FlightOffer`'s first
  `segments[].departure.airport` is the searched `origin` and its last
  `arrival.airport` the `destination`, on the requested dates; each
  `HotelOffer` is at the destination with `checkInDate` / `checkOutDate`
  equal to the searched departure / return dates — not random routes,
  cities, or dates.
- [ ] Each vertical is opt-in and additive: toggling `includeFlights`,
  `includeHotels`, `includeCars`, or `includeActivities` adds ONLY that
  section, and a vertical not requested (or one the provider can't serve,
  e.g. cars) comes back as an EMPTY array — rendered as "none", never as a
  failed or blank search. `maxResultsPerCategory` actually caps how many
  offers each section shows. Any separate activities / cars screen calls
  `searchActivities` / `searchCars` and renders its own `ActivityOffer[]` /
  `CarOffer[]`.
- [ ] Every offer's `price.total` shows its ISO 4217 `price.currency`
  (formatted with it — never a hardcoded `$`) and is sane: a flight total
  is the grand total for ALL `travelers`, a hotel total covers the whole
  stay, a car total the whole rental — positive and the right order of
  magnitude.
- [ ] An impossible or invalid search — a bad IATA code, a past
  `departureDate`, a `returnDate` before it, or a route with no
  availability — shows a clear per-section "no results" / "invalid" state,
  not a crash and not a blank list presented as a successful search.
- [ ] A provider outage or rate-limit (HTTP 429) surfaces as a graceful,
  retryable error in the UI — not a hung spinner or a silent empty list.
- [ ] This contract is search ONLY (there is no book / reserve call).
  Booking goes OUT-OF-BAND to the vendor (an `ActivityOffer.bookingUrl` or
  the app's own checkout) — verify the app RECORDS the SELECTED offer (its
  priced total + itinerary), since opaque `OfferId`s are short-lived and
  can't be replayed later.
- [ ] The provider API key stays server-side: every search runs through the
  API bond (the package is SERVER-ONLY), no key or upstream credential
  reaches the browser, and the endpoint validates origin / destination /
  dates instead of forwarding arbitrary caller input upstream (an open
  proxy would leak quota or enable SSRF).
