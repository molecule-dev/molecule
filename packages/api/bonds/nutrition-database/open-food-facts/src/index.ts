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
 * import { getFoodByBarcode, searchFood, setProvider } from '@molecule/api-nutrition-database'
 * import { createProvider } from '@molecule/api-nutrition-database-open-food-facts'
 *
 * // Startup: no API key. Identify your app politely (Open Food Facts asks for it).
 * setProvider(
 *   createProvider({
 *     userAgent: process.env.OPEN_FOOD_FACTS_USER_AGENT ?? 'AcmeFit/1.0 (support@acme.example)',
 *     timeout: 10_000, // milliseconds
 *   }),
 * )
 *
 * const results = await searchFood('greek yogurt', { limit: 10, page: 1 })
 * const food = await getFoodByBarcode('3017620422003') // null when the barcode is unknown
 * if (food) {
 *   // Per-100 g (or ml) panel; sodium is in MILLIGRAMS, missing values are null (not 0).
 *   console.log(food.name, food.brand, food.nutrition.calories, food.nutrition.sodium)
 * }
 * console.log(results.map((item) => item.name))
 * ```
 *
 * @remarks
 * - **Bond with the core's `setProvider(...)`** (singleton) and call the core's
 *   `searchFood` / `getFoodByBarcode` / `getFood` — `getFood(id)` is the same
 *   lookup, because Open Food Facts ids ARE barcodes.
 * - **Unknown barcode → `null`, not a throw.** HTTP 429 throws
 *   `OpenFoodFactsRateLimitedError` (`code === RATE_LIMITED`,
 *   `retryAfterSeconds` in SECONDS or `null`); other non-2xx statuses throw.
 * - `food.nutrition` is always the per-100 g / per-100 ml panel
 *   (`referenceUnit` says which); `perServing` is `null` when upstream has no
 *   serving data. Values are crowd-sourced — any nutrient can be `null`.
 * - The ready-made `provider` export reads `OPEN_FOOD_FACTS_USER_AGENT` and
 *   `OPEN_FOOD_FACTS_BASE_URL` on first use; `timeout` is milliseconds
 *   (default 10000).
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './types.js'
