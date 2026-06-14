/**
 * Open Food Facts nutrition-database provider.
 *
 * Implements the `NutritionDatabaseProvider` interface against the
 * public Open Food Facts API at `https://world.openfoodfacts.org`. The
 * endpoint is keyless and free for any use; Open Food Facts asks
 * callers to identify themselves via a polite `User-Agent` header so
 * abusive traffic can be reached before being blocked. Set
 * `OPEN_FOOD_FACTS_USER_AGENT` to override the default identifier.
 *
 * @example
 * ```typescript
 * import { setProvider } from '@molecule/api-nutrition-database'
 * import { provider } from '@molecule/api-nutrition-database-open-food-facts'
 *
 * setProvider(provider)
 * ```
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'
