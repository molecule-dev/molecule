/**
 * Open Food Facts implementation of {@link NutritionDatabaseProvider}.
 *
 * Wraps the public Open Food Facts API at
 * `https://world.openfoodfacts.org`. The endpoint is keyless and free
 * for any use; Open Food Facts asks callers to send a polite
 * `User-Agent` identifying the app + a contact URL or email so abusive
 * traffic can be reached before being blocked.
 *
 * Open Food Facts uses the product barcode as its canonical id, so
 * {@link NutritionDatabaseProvider.getFood} aliases
 * {@link NutritionDatabaseProvider.getFoodByBarcode}.
 *
 * @module
 */

import type {
  Barcode,
  FoodId,
  FoodNutrition,
  NutritionDatabaseProvider,
  NutritionFacts,
  SearchFoodOptions,
  ServingSize,
} from '@molecule/api-nutrition-database'

import type { OpenFoodFactsConfig } from './types.js'
import { OpenFoodFactsRateLimitedError } from './types.js'

/** Default Open Food Facts API base URL. */
const DEFAULT_BASE_URL = 'https://world.openfoodfacts.org'

/**
 * Default polite, brand-neutral User-Agent string. Open Food Facts asks
 * callers to identify their own app + a contact, so production deployments
 * SHOULD override this via `config.userAgent` / `OPEN_FOOD_FACTS_USER_AGENT`.
 */
const DEFAULT_USER_AGENT = 'OpenFoodFactsClient/1.0'

/** Default request timeout, in milliseconds. */
const DEFAULT_TIMEOUT = 10_000

/** Default page size used by {@link NutritionDatabaseProvider.searchFood}. */
const DEFAULT_SEARCH_LIMIT = 20

/** Default page used by {@link NutritionDatabaseProvider.searchFood}. */
const DEFAULT_SEARCH_PAGE = 1

/** Source identifier stamped onto every record. */
const SOURCE = 'open-food-facts'

/**
 * Open Food Facts product `nutriments` block. Only fields the provider
 * maps are typed; many more are returned upstream.
 *
 * Open Food Facts reports per-100g (or per-100ml for liquids) values
 * under bare keys (e.g. `energy-kcal_100g`, `proteins_100g`) and
 * per-serving values under `_serving` keys. Energy is reported in
 * kilocalories under `energy-kcal_*` and (separately) in kilojoules
 * under `energy_*` — this provider only consumes `energy-kcal_*`.
 *
 * Sodium is reported in grams under `sodium_*`; this provider converts
 * to milligrams. When sodium is missing but salt is present, salt is
 * converted via the standard `sodium = salt / 2.5` ratio.
 */
interface OffNutriments {
  'energy-kcal_100g'?: number
  'energy-kcal_serving'?: number
  proteins_100g?: number
  proteins_serving?: number
  fat_100g?: number
  fat_serving?: number
  'saturated-fat_100g'?: number
  'saturated-fat_serving'?: number
  carbohydrates_100g?: number
  carbohydrates_serving?: number
  sugars_100g?: number
  sugars_serving?: number
  fiber_100g?: number
  fiber_serving?: number
  sodium_100g?: number
  sodium_serving?: number
  salt_100g?: number
  salt_serving?: number
}

/**
 * Open Food Facts product record. Only the fields the provider maps are
 * typed; the upstream response includes hundreds of others.
 */
interface OffProduct {
  code?: string
  _id?: string
  product_name?: string
  product_name_en?: string
  brands?: string
  image_front_url?: string
  image_url?: string
  ingredients_text?: string
  ingredients_text_en?: string
  serving_size?: string
  serving_quantity?: string | number
  product_quantity_unit?: string
  quantity?: string
  nutriments?: OffNutriments
}

/**
 * `/api/v2/product/:barcode.json` response shape.
 */
interface OffProductResponse {
  status?: number
  status_verbose?: string
  code?: string
  product?: OffProduct
}

/**
 * `/cgi/search.pl` response shape.
 */
interface OffSearchResponse {
  count?: number
  page?: number
  page_size?: number
  products?: OffProduct[]
}

/**
 * Internal HTTP error raised by {@link fetchJson} for non-OK statuses
 * other than 429 (rate-limit, which raises
 * {@link OpenFoodFactsRateLimitedError}).
 */
class OpenFoodFactsHttpError extends Error {
  public readonly status: number

  public constructor(status: number) {
    super(`Open Food Facts API request failed with status ${String(status)}`)
    this.name = 'OpenFoodFactsHttpError'
    this.status = status
  }
}

/**
 * Parses a `Retry-After` header value into a number of seconds.
 *
 * @param value - Raw header value (`null` when absent).
 * @returns Number of seconds to wait, or `null` if the header is absent
 *   or unparseable.
 */
const parseRetryAfter = (value: string | null): number | null => {
  if (value == null) {
    return null
  }
  const trimmed = value.trim()
  if (trimmed.length === 0) {
    return null
  }
  const asInt = Number(trimmed)
  if (Number.isFinite(asInt) && asInt >= 0) {
    return Math.floor(asInt)
  }
  const asDate = Date.parse(trimmed)
  if (Number.isFinite(asDate)) {
    const deltaMs = asDate - Date.now()
    if (deltaMs > 0) {
      return Math.ceil(deltaMs / 1000)
    }
    return 0
  }
  return null
}

/**
 * Performs a GET request against Open Food Facts and parses the JSON
 * response.
 *
 * Sends the configured (or default) `User-Agent` per Open Food Facts API
 * etiquette. Maps HTTP 429 responses onto
 * {@link OpenFoodFactsRateLimitedError}; other non-OK statuses raise
 * {@link OpenFoodFactsHttpError}.
 *
 * @template T - Expected JSON response shape.
 * @param url - Fully-constructed request URL including query params.
 * @param config - Provider configuration (used for User-Agent + timeout).
 * @returns Parsed JSON body cast to `T`.
 * @throws {OpenFoodFactsRateLimitedError} On HTTP 429.
 * @throws {OpenFoodFactsHttpError} On any other non-OK status.
 */
const fetchJson = async <T>(url: string, config: OpenFoodFactsConfig): Promise<T> => {
  const timeout = config.timeout ?? DEFAULT_TIMEOUT
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'User-Agent': config.userAgent ?? DEFAULT_USER_AGENT,
  }
  try {
    const response = await fetch(url, { signal: controller.signal, headers })
    if (response.status === 429) {
      const retryAfter = parseRetryAfter(response.headers.get('retry-after'))
      throw new OpenFoodFactsRateLimitedError(
        'Open Food Facts API rate limit exceeded (HTTP 429)',
        retryAfter,
      )
    }
    if (!response.ok) {
      throw new OpenFoodFactsHttpError(response.status)
    }
    return (await response.json()) as T
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Detects whether a product is liquid (so per-100ml panels should use
 * the `'ml'` unit) by inspecting the upstream `product_quantity_unit`
 * and free-text `quantity` fields.
 *
 * @param product - Open Food Facts product record.
 * @returns `'ml'` when the product is a liquid, `'g'` otherwise.
 */
const detectReferenceUnit = (product: OffProduct): 'g' | 'ml' => {
  const unit = product.product_quantity_unit?.toLowerCase()
  if (unit === 'ml' || unit === 'l') {
    return 'ml'
  }
  const qty = product.quantity?.toLowerCase() ?? ''
  if (/\b(ml|cl|dl|l|liter|litre)\b/.test(qty)) {
    return 'ml'
  }
  return 'g'
}

/**
 * Coerces an upstream value into a non-negative finite number, or
 * returns `null` when it cannot be coerced.
 *
 * @param value - Raw upstream value.
 * @returns The coerced number, or `null`.
 */
const numberOrNull = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }
  if (typeof value === 'string') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) {
      return parsed
    }
  }
  return null
}

/**
 * Builds a {@link NutritionFacts} record from the relevant
 * Open Food Facts `nutriments` keys.
 *
 * Sodium is normalized to milligrams. When the upstream record has no
 * direct sodium value but does carry a salt value, salt is converted
 * via the standard `sodium = salt / 2.5` ratio.
 *
 * @param nutriments - Open Food Facts nutriments block.
 * @param suffix - `'100g'` for the per-100g panel, `'serving'` for the
 *   per-serving panel.
 * @param referenceQuantity - Reference quantity the panel describes
 *   (`100` for per-100g/per-100ml, the upstream serving size for
 *   per-serving).
 * @param referenceUnit - Unit the {@link referenceQuantity} is expressed
 *   in.
 * @returns A normalized {@link NutritionFacts} record.
 */
const buildNutritionFacts = (
  nutriments: OffNutriments,
  suffix: '100g' | 'serving',
  referenceQuantity: number,
  referenceUnit: 'g' | 'ml',
): NutritionFacts => {
  const energyKey = `energy-kcal_${suffix}` as 'energy-kcal_100g' | 'energy-kcal_serving'
  const proteinKey = `proteins_${suffix}` as 'proteins_100g' | 'proteins_serving'
  const fatKey = `fat_${suffix}` as 'fat_100g' | 'fat_serving'
  const satKey = `saturated-fat_${suffix}` as 'saturated-fat_100g' | 'saturated-fat_serving'
  const carbsKey = `carbohydrates_${suffix}` as 'carbohydrates_100g' | 'carbohydrates_serving'
  const sugarKey = `sugars_${suffix}` as 'sugars_100g' | 'sugars_serving'
  const fiberKey = `fiber_${suffix}` as 'fiber_100g' | 'fiber_serving'
  const sodiumKey = `sodium_${suffix}` as 'sodium_100g' | 'sodium_serving'
  const saltKey = `salt_${suffix}` as 'salt_100g' | 'salt_serving'

  const sodiumGrams = numberOrNull(nutriments[sodiumKey])
  const saltGrams = numberOrNull(nutriments[saltKey])
  let sodiumMg: number | null = null
  if (sodiumGrams !== null) {
    sodiumMg = sodiumGrams * 1000
  } else if (saltGrams !== null) {
    sodiumMg = (saltGrams / 2.5) * 1000
  }

  return {
    referenceQuantity,
    referenceUnit,
    calories: numberOrNull(nutriments[energyKey]),
    protein: numberOrNull(nutriments[proteinKey]),
    fat: numberOrNull(nutriments[fatKey]),
    saturatedFat: numberOrNull(nutriments[satKey]),
    carbs: numberOrNull(nutriments[carbsKey]),
    sugar: numberOrNull(nutriments[sugarKey]),
    fiber: numberOrNull(nutriments[fiberKey]),
    sodium: sodiumMg,
  }
}

/**
 * Returns the best display name for a product, falling back from the
 * generic `product_name` to the English-localized variant.
 *
 * @param product - Open Food Facts product record.
 * @returns The display name, or the empty string when none is supplied.
 */
const pickName = (product: OffProduct): string => {
  if (product.product_name && product.product_name.trim().length > 0) {
    return product.product_name
  }
  if (product.product_name_en && product.product_name_en.trim().length > 0) {
    return product.product_name_en
  }
  return ''
}

/**
 * Returns the best ingredients text, falling back from the generic
 * `ingredients_text` to the English-localized variant.
 *
 * @param product - Open Food Facts product record.
 * @returns The ingredients text, or the empty string when none is
 *   supplied.
 */
const pickIngredients = (product: OffProduct): string => {
  if (product.ingredients_text && product.ingredients_text.trim().length > 0) {
    return product.ingredients_text
  }
  if (product.ingredients_text_en && product.ingredients_text_en.trim().length > 0) {
    return product.ingredients_text_en
  }
  return ''
}

/**
 * Returns the best front-of-pack image URL.
 *
 * @param product - Open Food Facts product record.
 * @returns The image URL, or `null` when none is supplied.
 */
const pickImageUrl = (product: OffProduct): string | null => {
  if (product.image_front_url && product.image_front_url.length > 0) {
    return product.image_front_url
  }
  if (product.image_url && product.image_url.length > 0) {
    return product.image_url
  }
  return null
}

/**
 * Builds the per-serving panel, when the upstream record has serving
 * data.
 *
 * @param product - Open Food Facts product record.
 * @param referenceUnit - Reference unit detected for the product.
 * @returns The per-serving panel, or `null` when no serving size is
 *   available.
 */
const buildPerServing = (
  product: OffProduct,
  referenceUnit: 'g' | 'ml',
): (NutritionFacts & { serving: ServingSize }) | null => {
  const nutriments = product.nutriments
  if (!nutriments) {
    return null
  }
  const servingQuantity = numberOrNull(product.serving_quantity)
  if (servingQuantity === null || servingQuantity <= 0) {
    return null
  }
  const facts = buildNutritionFacts(nutriments, 'serving', servingQuantity, referenceUnit)
  // If every per-serving value is null, the upstream record didn't supply
  // a real per-serving panel — treat as absent rather than an empty panel.
  const hasAnyValue =
    facts.calories !== null ||
    facts.protein !== null ||
    facts.fat !== null ||
    facts.saturatedFat !== null ||
    facts.carbs !== null ||
    facts.sugar !== null ||
    facts.fiber !== null ||
    facts.sodium !== null
  if (!hasAnyValue) {
    return null
  }
  const serving: ServingSize = {
    quantity: servingQuantity,
    unit: referenceUnit,
    label: product.serving_size?.trim() ?? '',
  }
  return { ...facts, serving }
}

/**
 * Maps a raw Open Food Facts product record onto the normalized
 * {@link FoodNutrition} shape.
 *
 * @param product - Open Food Facts product record.
 * @returns The normalized record.
 */
const mapProduct = (product: OffProduct): FoodNutrition => {
  const referenceUnit = detectReferenceUnit(product)
  const nutriments = product.nutriments ?? {}
  const id = product.code ?? product._id ?? ''
  const barcode = product.code ?? null
  const brand = product.brands?.split(',')[0]?.trim() ?? null
  return {
    id,
    name: pickName(product),
    brand: brand && brand.length > 0 ? brand : null,
    barcode: barcode && barcode.length > 0 ? barcode : null,
    nutrition: buildNutritionFacts(nutriments, '100g', 100, referenceUnit),
    perServing: buildPerServing(product, referenceUnit),
    imageUrl: pickImageUrl(product),
    ingredientsText: pickIngredients(product),
    source: SOURCE,
  }
}

/**
 * Builds the `/cgi/search.pl` URL.
 *
 * @param baseUrl - Base API URL.
 * @param query - Free-text query.
 * @param options - Pagination and result-size options.
 * @returns Fully-constructed request URL.
 */
const buildSearchUrl = (baseUrl: string, query: string, options: SearchFoodOptions): string => {
  const params = new URLSearchParams({
    search_terms: query,
    json: '1',
    page_size: String(options.limit ?? DEFAULT_SEARCH_LIMIT),
    page: String(options.page ?? DEFAULT_SEARCH_PAGE),
    fields: [
      'code',
      '_id',
      'product_name',
      'product_name_en',
      'brands',
      'image_front_url',
      'image_url',
      'ingredients_text',
      'ingredients_text_en',
      'serving_size',
      'serving_quantity',
      'product_quantity_unit',
      'quantity',
      'nutriments',
    ].join(','),
  })
  return `${baseUrl}/cgi/search.pl?${params.toString()}`
}

/**
 * Builds the `/api/v2/product/:barcode.json` URL.
 *
 * @param baseUrl - Base API URL.
 * @param barcode - Product barcode.
 * @returns Fully-constructed request URL.
 */
const buildProductUrl = (baseUrl: string, barcode: Barcode): string =>
  `${baseUrl}/api/v2/product/${encodeURIComponent(barcode)}.json`

/**
 * Creates an Open Food Facts nutrition-database provider.
 *
 * @param config - Provider configuration. All fields are optional.
 * @returns A {@link NutritionDatabaseProvider} backed by the Open Food
 *   Facts API.
 */
export const createProvider = (config: OpenFoodFactsConfig = {}): NutritionDatabaseProvider => {
  const baseUrl = config.baseUrl ?? DEFAULT_BASE_URL

  const lookup = async (barcode: Barcode): Promise<FoodNutrition | null> => {
    const url = buildProductUrl(baseUrl, barcode)
    const data = await fetchJson<OffProductResponse>(url, config)
    if (data.status !== 1 || !data.product) {
      return null
    }
    return mapProduct(data.product)
  }

  return {
    async searchFood(query: string, options: SearchFoodOptions = {}): Promise<FoodNutrition[]> {
      const url = buildSearchUrl(baseUrl, query, options)
      const data = await fetchJson<OffSearchResponse>(url, config)
      const products = data.products ?? []
      return products.map(mapProduct)
    },

    getFoodByBarcode(barcode: Barcode): Promise<FoodNutrition | null> {
      return lookup(barcode)
    },

    getFood(id: FoodId): Promise<FoodNutrition | null> {
      // Open Food Facts ids ARE barcodes — defer to the same lookup.
      return lookup(id)
    },
  }
}

/** Lazily-initialized default provider instance. */
let _provider: NutritionDatabaseProvider | null = null

/**
 * The provider implementation, lazily initialized on first use.
 *
 * Reads `OPEN_FOOD_FACTS_BASE_URL` and `OPEN_FOOD_FACTS_USER_AGENT` from
 * environment variables. The Open Food Facts public API requires no key;
 * production deployments should set `OPEN_FOOD_FACTS_USER_AGENT` to a
 * polite identifier of the form
 * `<app-name>/<version> (<contact-email-or-url>)`.
 */
export const provider: NutritionDatabaseProvider = new Proxy({} as NutritionDatabaseProvider, {
  get(_, prop, receiver) {
    if (!_provider) {
      _provider = createProvider({
        ...(process.env['OPEN_FOOD_FACTS_BASE_URL']
          ? { baseUrl: process.env['OPEN_FOOD_FACTS_BASE_URL'] }
          : {}),
        ...(process.env['OPEN_FOOD_FACTS_USER_AGENT']
          ? { userAgent: process.env['OPEN_FOOD_FACTS_USER_AGENT'] }
          : {}),
      })
    }
    return Reflect.get(_provider, prop, receiver)
  },
})
