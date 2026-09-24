/**
 * Provider-agnostic nutrition-database interface for molecule.dev.
 *
 * Defines the {@link NutritionDatabaseProvider} interface for food /
 * product nutrition lookups (free-text search + barcode lookup + id
 * lookup). Bond packages (Open Food Facts, USDA FoodData Central,
 * Nutritionix, etc.) implement this interface. Application code uses the
 * convenience functions (`searchFood`, `getFoodByBarcode`, `getFood`)
 * which delegate to the bonded provider.
 *
 * @example
 * ```typescript
 * import { getFoodByBarcode, searchFood, setProvider } from '@molecule/api-nutrition-database'
 * import { createProvider } from '@molecule/api-nutrition-database-open-food-facts'
 *
 * // Startup (server only): Open Food Facts is keyless; identify your app politely.
 * setProvider(
 *   createProvider({ userAgent: process.env.OPEN_FOOD_FACTS_USER_AGENT ?? 'MyApp/1.0' }),
 * )
 *
 * const results = await searchFood('nutella', { limit: 10, page: 1 }) // FoodNutrition[]
 * const food = await getFoodByBarcode('3017620422003') // null when not found
 *
 * // Scale an arbitrary portion from the per-100 g/ml panel; null = unknown, NOT zero.
 * const grams = 30
 * const kcal =
 *   food && food.nutrition.calories !== null
 *     ? (food.nutrition.calories * grams) / food.nutrition.referenceQuantity
 *     : null // render "—", and leave it out of totals
 * ```
 *
 * @remarks
 * - **Server-only.** Call it from your API and return the normalized
 *   `FoodNutrition` to the client; the browser guard throws if bundled client-side.
 * - **`nutrition` is per 100 g/ml** (`referenceQuantity`/`referenceUnit`);
 *   `perServing` is the label's serving and is often `null`. Scale portions from
 *   `nutrition`, never by multiplying `perServing`.
 * - **Every nutrient is `number | null`** — `null` means unknown. Never coerce
 *   it to `0` or sum it into a total. `sodium` is in MILLIGRAMS; the other
 *   macros are grams, `calories` is kcal.
 * - Not-found is `null` (barcode/id) or `[]` (search), not an error; upstream
 *   HTTP failures (including rate limiting) DO throw — catch and surface them.
 *
 * @e2e
 * Integration checklist — drive the real UI (live preview, no mocks), adapt
 * each item to this app's actual screens/flows, and check every box off one
 * by one. A box you can't check is an integration bug to fix — not a skip:
 * - [ ] Searching a known food (e.g. `searchFood('banana')`) returns the REAL
 *   matching item, and the UI renders plausible nutrition facts — calories and
 *   macros (protein/fat/carbs) in sane ranges for that food, never 0, null, or
 *   NaN where the food obviously has them. Never mock the provider.
 * - [ ] Different foods return different, plausible records — search two
 *   distinct foods (e.g. "banana" vs "cheddar cheese") and confirm their
 *   calories/macros actually differ; you are not re-rendering one cached row.
 * - [ ] Barcode lookup: `getFoodByBarcode()` for a known barcode
 *   (e.g. '3017620422003') resolves to the RIGHT product (matching name /
 *   brand) in the UI — not a near-miss or a substituted item.
 * - [ ] Not-found is honest: an unknown search term returns an empty result
 *   and an unknown barcode returns `null`; the UI shows a clear "not found"
 *   state, never a wrong/substituted item and never a crash.
 * - [ ] Portion scaling is mathematically correct: the app computes an
 *   arbitrary serving by scaling the per-100g/ml `nutrition` panel (NOT
 *   `perServing`), so 2x the grams renders exactly 2x the calories and every
 *   macro. Change the serving size in the UI and verify the numbers scale
 *   linearly — the math is right, not merely non-zero.
 * - [ ] CORRECTNESS — `null` (nutrient unknown) is never shown or summed as
 *   `0` (measured zero). A food missing a nutrient renders "—"/unknown, and
 *   that item is excluded from (or flagged in) any diet total — presenting
 *   null as 0 silently understates the total. A logged meal/day total equals
 *   the sum of its items' scaled macros; re-add the numbers by hand and they
 *   match.
 * - [ ] A provider / upstream failure surfaces as a visible error in the UI
 *   (not a blank panel or a silently-zeroed row), and the provider API key
 *   stays server-side: search/lookup go through the app's API, and the key
 *   never appears in the client bundle or a browser network request (this
 *   package is SERVER-ONLY — see the browser guard).
 *
 * @module
 */

// Type exports
export * from './browser-guard.js'
export * from './types.js'

// Provider exports
export * from './provider.js'
