/**
 * Type definitions for the nutrition-database core interface.
 *
 * Defines the canonical, provider-agnostic shapes used by every
 * nutrition-database provider (Open Food Facts, USDA FoodData Central,
 * Nutritionix, etc.). Provider responses are normalized so application
 * code can swap providers with no behavioural change.
 *
 * @module
 */

/**
 * Provider-specific food identifier.
 *
 * Some providers (Open Food Facts) use the product barcode as the id;
 * others (USDA, Nutritionix) use opaque numeric or string identifiers.
 * Treat as an opaque string and only feed values previously returned by
 * the same provider back into {@link NutritionDatabaseProvider.getFood}.
 */
export type FoodId = string

/**
 * GTIN/EAN/UPC barcode in canonical decimal-string form.
 *
 * Conventionally between 8 and 14 digits with no separators. Implementations
 * SHOULD accept the value verbatim; callers SHOULD strip whitespace before
 * passing it in.
 */
export type Barcode = string

/**
 * A normalized set of nutrient values for a fixed reference quantity.
 *
 * Every provider returns the same field set so application code never
 * branches on which provider supplied the data. Fields the upstream API
 * does not provide are `null` rather than missing or `0` — `null` means
 * "unknown", `0` means "measured zero".
 *
 * Energy values are reported as kilocalories ("Calories" in US food
 * labelling) — this matches the US FDA Nutrition Facts panel and the
 * majority of consumer-facing nutrition apps. Mass-based fields are in
 * grams unless otherwise noted.
 */
export interface NutritionFacts {
  /**
   * Reference quantity these nutrient values describe (e.g. `100` g for
   * "per 100g" panels, `30` g for a typical serving). Always positive.
   */
  referenceQuantity: number

  /**
   * Unit the {@link referenceQuantity} is expressed in.
   *
   * `'g'` for solids, `'ml'` for liquids. Provider responses that mix
   * units within a single product (rare) are normalized to the dominant
   * unit on the product label.
   */
  referenceUnit: 'g' | 'ml'

  /**
   * Energy in kilocalories ("Calories") for {@link referenceQuantity}.
   * `null` if the provider did not supply this value.
   */
  calories: number | null

  /**
   * Protein in grams for {@link referenceQuantity}.
   * `null` if the provider did not supply this value.
   */
  protein: number | null

  /**
   * Total fat in grams for {@link referenceQuantity}.
   * `null` if the provider did not supply this value.
   */
  fat: number | null

  /**
   * Saturated fat in grams for {@link referenceQuantity}.
   * `null` if the provider did not supply this value.
   */
  saturatedFat: number | null

  /**
   * Total carbohydrates in grams for {@link referenceQuantity}.
   * `null` if the provider did not supply this value.
   */
  carbs: number | null

  /**
   * Sugars (a sub-component of carbohydrates) in grams for
   * {@link referenceQuantity}.
   * `null` if the provider did not supply this value.
   */
  sugar: number | null

  /**
   * Dietary fiber in grams for {@link referenceQuantity}.
   * `null` if the provider did not supply this value.
   */
  fiber: number | null

  /**
   * Sodium in milligrams for {@link referenceQuantity}.
   * `null` if the provider did not supply this value.
   *
   * Some upstream APIs report sodium in grams or report salt instead
   * (salt = sodium × 2.5). Providers MUST normalize to milligrams of
   * sodium before returning.
   */
  sodium: number | null
}

/**
 * Per-serving size description, when the upstream label exposes one.
 *
 * Many products describe both a "per 100g/100ml" panel and a "per
 * serving" panel. {@link FoodNutrition} surfaces both — `per100` for the
 * normalized comparable basis, `perServing` for the user-facing
 * label-as-printed.
 */
export interface ServingSize {
  /**
   * Quantity of one serving (e.g. `30` for a 30g serving).
   */
  quantity: number

  /**
   * Unit the {@link quantity} is expressed in (`'g'` or `'ml'`).
   */
  unit: 'g' | 'ml'

  /**
   * Free-text serving description as printed on the label
   * (e.g. `'1 cup (240ml)'`, `'2 cookies (30g)'`). May be the empty
   * string when the upstream API does not supply free-text.
   */
  label: string
}

/**
 * Normalized food record returned by every nutrition-database provider.
 *
 * Always carries a per-100g/per-100ml panel ({@link nutrition}) so totals
 * can be computed from any quantity. {@link perServing} (when present)
 * describes the as-printed per-serving panel.
 */
export interface FoodNutrition {
  /**
   * Provider-specific identifier suitable for {@link NutritionDatabaseProvider.getFood}.
   */
  id: FoodId

  /**
   * Display name of the food / product. The empty string when the
   * upstream record has no name.
   */
  name: string

  /**
   * Brand name, when supplied by the upstream record. `null` for
   * generic / unbranded entries.
   */
  brand: string | null

  /**
   * Product barcode (GTIN/EAN/UPC) when the upstream record has one.
   * `null` for generic foods (e.g. raw ingredients in USDA).
   */
  barcode: Barcode | null

  /**
   * Per-100g (solids) or per-100ml (liquids) nutrition panel.
   *
   * This is the canonical comparable basis — application code that needs
   * to compute totals for an arbitrary serving size MUST scale these
   * values rather than scaling {@link perServing}.
   */
  nutrition: NutritionFacts

  /**
   * Per-serving nutrition panel, when the upstream label supplies a
   * serving size. `null` for records with only a per-100g panel.
   */
  perServing: (NutritionFacts & { serving: ServingSize }) | null

  /**
   * Stable URL of an image of the product / food, when supplied. `null`
   * otherwise. Providers SHOULD prefer a front-of-pack image.
   */
  imageUrl: string | null

  /**
   * Free-text ingredient list as printed on the label (e.g.
   * `'water, sugar, milk solids, ...'`). The empty string when not
   * supplied by the upstream record.
   */
  ingredientsText: string

  /**
   * Identifier of the upstream provider that produced this record
   * (e.g. `'open-food-facts'`, `'usda'`). Useful for telemetry and
   * cache-key namespacing.
   */
  source: string
}

/**
 * Options accepted by {@link NutritionDatabaseProvider.searchFood}.
 */
export interface SearchFoodOptions {
  /**
   * Maximum number of rows to return. Implementations MAY clamp to
   * whatever upper bound their upstream API enforces.
   */
  limit?: number

  /**
   * Page number (1-indexed) when paginating. Implementations that do
   * not paginate MAY ignore this.
   */
  page?: number
}

/**
 * Nutrition-database provider interface.
 *
 * All nutrition-database providers (Open Food Facts, USDA, Nutritionix,
 * etc.) implement this interface. The interface is deliberately minimal
 * so providers with very different upstream APIs can satisfy it
 * identically — only free-text search, barcode lookup, and id lookup are
 * required. Implementations whose ids ARE barcodes (e.g. Open Food Facts)
 * may simply alias {@link getFood} to {@link getFoodByBarcode}.
 */
export interface NutritionDatabaseProvider {
  /**
   * Free-text search for foods / products.
   *
   * @param query - Free-text query (product name, brand, ingredient).
   * @param options - Pagination and result-size options.
   * @returns Array of normalized food records, ordered by upstream
   *   relevance. May be empty when no records match.
   */
  searchFood(query: string, options?: SearchFoodOptions): Promise<FoodNutrition[]>

  /**
   * Look up a food / product by GTIN/EAN/UPC barcode.
   *
   * @param barcode - Product barcode in canonical decimal-string form.
   * @returns The matching food record, or `null` when the upstream
   *   database has no entry for the barcode.
   */
  getFoodByBarcode(barcode: Barcode): Promise<FoodNutrition | null>

  /**
   * Look up a food / product by provider-specific id.
   *
   * @param id - Provider-specific identifier previously returned by
   *   {@link searchFood} or {@link getFoodByBarcode}.
   * @returns The matching food record, or `null` when no record exists.
   */
  getFood(id: FoodId): Promise<FoodNutrition | null>
}
