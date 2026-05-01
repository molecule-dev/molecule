# @molecule/api-nutrition-database-open-food-facts

Open Food Facts nutrition-database provider

## Type
`provider`

## Implements
`@molecule/api-nutrition-database`

## Bond shape

```ts
import { setProvider } from '@molecule/api-nutrition-database'
import { provider } from '@molecule/api-nutrition-database-open-food-facts'

setProvider(provider)
```

## Configuration

The Open Food Facts public API at `https://world.openfoodfacts.org` is
keyless and free for any use. Open Food Facts asks callers to identify
themselves via a polite `User-Agent` header so abusive traffic can be
reached before being blocked. Wire either an environment variable or the
config option:

| Env var | Config field | Default |
| --- | --- | --- |
| `OPEN_FOOD_FACTS_USER_AGENT` | `userAgent` | `molecule.dev/1.0 (https://molecule.dev)` |
| `OPEN_FOOD_FACTS_BASE_URL` | `baseUrl` | `https://world.openfoodfacts.org` |

Production deployments should set `OPEN_FOOD_FACTS_USER_AGENT` to a
contact identifier of the form
`<app-name>/<version> (<contact-email-or-url>)`.

## Endpoints used

- `GET /cgi/search.pl?search_terms=<q>&json=1&page_size=<n>&page=<p>` —
  free-text search.
- `GET /api/v2/product/:barcode.json` — barcode + id lookup.

Open Food Facts uses the product barcode as the canonical id, so
`getFood(id)` aliases `getFoodByBarcode(id)`.

## Notes

- Coverage is strongest for European packaged goods. US/Asian coverage
  is meaningful but uneven — chain a Nutritionix or USDA provider for
  better hit-rates outside Europe.
- Sodium is normalized to milligrams. When the upstream record has only
  a salt value, salt is converted via the standard
  `sodium = salt / 2.5` ratio.
- Rate-limit responses (HTTP 429) raise `OpenFoodFactsRateLimitedError`
  exposing the parsed `Retry-After` value.
