/**
 * Nutrition-database provider bond accessor and convenience functions.
 *
 * Bond packages (e.g. `@molecule/api-nutrition-database-open-food-facts`)
 * call {@link setProvider} during application startup. Application code
 * uses the convenience functions ({@link searchFood},
 * {@link getFoodByBarcode}, {@link getFood}) which delegate to the bonded
 * provider via `@molecule/api-bond`.
 *
 * @module
 */

import { bond, expectBond, isBonded, require as bondRequire } from '@molecule/api-bond'
import { t } from '@molecule/api-i18n'

import type {
  Barcode,
  FoodId,
  FoodNutrition,
  NutritionDatabaseProvider,
  SearchFoodOptions,
} from './types.js'

const BOND_TYPE = 'nutrition-database'
expectBond(BOND_TYPE)

/**
 * Registers a nutrition-database provider as the active singleton.
 *
 * Called by bond packages
 * (e.g. `@molecule/api-nutrition-database-open-food-facts`) during
 * application startup.
 *
 * @param provider - The nutrition-database provider implementation to bond.
 */
export const setProvider = (provider: NutritionDatabaseProvider): void => {
  bond(BOND_TYPE, provider)
}

/**
 * Retrieves the bonded nutrition-database provider, throwing if none is
 * configured.
 *
 * @returns The bonded nutrition-database provider.
 * @throws {Error} If no nutrition-database provider has been bonded.
 */
export const getProvider = (): NutritionDatabaseProvider => {
  try {
    return bondRequire<NutritionDatabaseProvider>(BOND_TYPE)
  } catch (error) {
    throw new Error(
      t('nutritionDatabase.error.noProvider', undefined, {
        defaultValue: 'Nutrition-database provider not configured. Call setProvider() first.',
      }),
      { cause: error },
    )
  }
}

/**
 * Checks whether a nutrition-database provider is currently bonded.
 *
 * @returns `true` if a nutrition-database provider is bonded.
 */
export const hasProvider = (): boolean => {
  return isBonded(BOND_TYPE)
}

/**
 * Free-text search for foods / products via the bonded provider.
 *
 * @param query - Free-text query (product name, brand, ingredient).
 * @param options - Pagination and result-size options.
 * @returns Array of normalized food records, ordered by upstream relevance.
 * @throws {Error} If no nutrition-database provider has been bonded.
 */
export const searchFood = async (
  query: string,
  options?: SearchFoodOptions,
): Promise<FoodNutrition[]> => {
  return getProvider().searchFood(query, options)
}

/**
 * Look up a food / product by GTIN/EAN/UPC barcode via the bonded provider.
 *
 * @param barcode - Product barcode in canonical decimal-string form.
 * @returns The matching food record, or `null` when no record exists.
 * @throws {Error} If no nutrition-database provider has been bonded.
 */
export const getFoodByBarcode = async (barcode: Barcode): Promise<FoodNutrition | null> => {
  return getProvider().getFoodByBarcode(barcode)
}

/**
 * Look up a food / product by provider-specific id via the bonded provider.
 *
 * @param id - Provider-specific identifier previously returned by
 *   {@link searchFood} or {@link getFoodByBarcode}.
 * @returns The matching food record, or `null` when no record exists.
 * @throws {Error} If no nutrition-database provider has been bonded.
 */
export const getFood = async (id: FoodId): Promise<FoodNutrition | null> => {
  return getProvider().getFood(id)
}
