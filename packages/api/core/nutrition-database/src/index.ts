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
 * import { setProvider, searchFood, getFoodByBarcode } from '@molecule/api-nutrition-database'
 * import { provider as openFoodFacts } from '@molecule/api-nutrition-database-open-food-facts'
 *
 * setProvider(openFoodFacts)
 * const results = await searchFood('granola bar', { limit: 10 })
 * const lookup = await getFoodByBarcode('3017620422003')
 * ```
 *
 * @module
 */

// Type exports
export * from './types.js'

// Provider exports
export * from './provider.js'
