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

**Returns:** A {@link NutritionDatabaseProvider} backed by the Open Food Facts API.

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

## E2E Tests

Integration checklist — drive the real UI (live preview, no mocks), adapt
each item to this app's actual screens/flows, and check every box off one
by one. A box you can't check is an integration bug to fix — not a skip:
- [ ] Searching a known food (e.g. `searchFood('banana')`) returns the REAL
  matching item, and the UI renders plausible nutrition facts — calories and
  macros (protein/fat/carbs) in sane ranges for that food, never 0, null, or
  NaN where the food obviously has them. Never mock the provider.
- [ ] Different foods return different, plausible records — search two
  distinct foods (e.g. "banana" vs "cheddar cheese") and confirm their
  calories/macros actually differ; you are not re-rendering one cached row.
- [ ] Barcode lookup: `getFoodByBarcode()` for a known barcode
  (e.g. '3017620422003') resolves to the RIGHT product (matching name /
  brand) in the UI — not a near-miss or a substituted item.
- [ ] Not-found is honest: an unknown search term returns an empty result
  and an unknown barcode returns `null`; the UI shows a clear "not found"
  state, never a wrong/substituted item and never a crash.
- [ ] Portion scaling is mathematically correct: the app computes an
  arbitrary serving by scaling the per-100g/ml `nutrition` panel (NOT
  `perServing`), so 2x the grams renders exactly 2x the calories and every
  macro. Change the serving size in the UI and verify the numbers scale
  linearly — the math is right, not merely non-zero.
- [ ] CORRECTNESS — `null` (nutrient unknown) is never shown or summed as
  `0` (measured zero). A food missing a nutrient renders "—"/unknown, and
  that item is excluded from (or flagged in) any diet total — presenting
  null as 0 silently understates the total. A logged meal/day total equals
  the sum of its items' scaled macros; re-add the numbers by hand and they
  match.
- [ ] A provider / upstream failure surfaces as a visible error in the UI
  (not a blank panel or a silently-zeroed row), and the provider API key
  stays server-side: search/lookup go through the app's API, and the key
  never appears in the client bundle or a browser network request (this
  package is SERVER-ONLY — see the browser guard).
