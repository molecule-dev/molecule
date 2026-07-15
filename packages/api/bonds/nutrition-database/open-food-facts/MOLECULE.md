# @molecule/api-nutrition-database-open-food-facts

Open Food Facts nutrition-database provider.

Implements the `NutritionDatabaseProvider` interface against the
public Open Food Facts API at `https://world.openfoodfacts.org`. The
endpoint is keyless and free for any use; Open Food Facts asks
callers to identify themselves via a polite `User-Agent` header so
abusive traffic can be reached before being blocked. Set
`OPEN_FOOD_FACTS_USER_AGENT` to override the default identifier.

## Quick Start

```typescript
import { setProvider } from '@molecule/api-nutrition-database'
import { provider } from '@molecule/api-nutrition-database-open-food-facts'

setProvider(provider)
```

## Type
`provider`

## Installation
```bash
npm install @molecule/api-nutrition-database-open-food-facts @molecule/api-nutrition-database
```

## API

### Interfaces

#### `OpenFoodFactsConfig`

Configuration options for the Open Food Facts nutrition-database
provider.

The Open Food Facts public API
(`https://world.openfoodfacts.org`) is keyless and free for any use,
so all fields are optional. Open Food Facts ASKS callers to identify
themselves via a polite `User-Agent` of the form
`<app-name>/<version> (<contact-email-or-url>)` so abusive traffic can
be contacted before being blocked. Wire {@link userAgent} (or the
`OPEN_FOOD_FACTS_USER_AGENT` environment variable) when shipping to
production.

```typescript
interface OpenFoodFactsConfig {
  /**
   * Base URL override. Defaults to `'https://world.openfoodfacts.org'`.
   *
   * Country-specific instances exist (e.g. `'https://us.openfoodfacts.org'`)
   * but they share the same product database — the `world` host is the
   * canonical entry point.
   */
  baseUrl?: string

  /**
   * Polite `User-Agent` header sent on every request. Open Food Facts
   * asks callers to identify themselves so abusive traffic can be
   * contacted before being blocked.
   *
   * Defaults to a generic, brand-neutral `OpenFoodFactsClient/1.0` when
   * omitted. Open Food Facts asks callers to identify their own app, so
   * production deployments SHOULD override this (via `OPEN_FOOD_FACTS_USER_AGENT`)
   * with the form `<app-name>/<version> (<contact-email-or-url>)`.
   */
  userAgent?: string

  /**
   * Request timeout in milliseconds. Defaults to `10000`.
   */
  timeout?: number
}
```

### Classes

#### `OpenFoodFactsRateLimitedError`

Error thrown by the Open Food Facts provider when the upstream API
rejects a request with HTTP 429 (Too Many Requests).

### Functions

#### `createProvider(config)`

Creates an Open Food Facts nutrition-database provider.

```typescript
function createProvider(config?: OpenFoodFactsConfig): NutritionDatabaseProvider
```

- `config` — Provider configuration. All fields are optional.

**Returns:** A {@link NutritionDatabaseProvider} backed by the Open Food
 *   Facts API.

### Constants

#### `provider`

The provider implementation, lazily initialized on first use.

Reads `OPEN_FOOD_FACTS_BASE_URL` and `OPEN_FOOD_FACTS_USER_AGENT` from
environment variables. The Open Food Facts public API requires no key;
production deployments should set `OPEN_FOOD_FACTS_USER_AGENT` to a
polite identifier of the form
`<app-name>/<version> (<contact-email-or-url>)`.

```typescript
const provider: NutritionDatabaseProvider
```

#### `RATE_LIMITED`

Stable error code emitted by the Open Food Facts provider when the
upstream API returns HTTP 429 (Too Many Requests).

Catch on this constant rather than parsing error messages — the message
text is for humans only.

```typescript
const RATE_LIMITED: "RATE_LIMITED"
```

## Core Interface
Implements `@molecule/api-nutrition-database` interface.

## Bond Wiring

Setup function to register this provider with the core interface:

```typescript
import { setProvider } from '@molecule/api-nutrition-database'
import { provider } from '@molecule/api-nutrition-database-open-food-facts'

export function setupNutritionDatabaseOpenFoodFacts(): void {
  setProvider(provider)
}
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-nutrition-database` ^1.0.0

### Runtime Dependencies

- `@molecule/api-nutrition-database`
