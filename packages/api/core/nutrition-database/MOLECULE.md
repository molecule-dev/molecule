# @molecule/api-nutrition-database

Provider-agnostic nutrition-database interface for molecule.dev.

Defines the {@link NutritionDatabaseProvider} interface for food /
product nutrition lookups (free-text search + barcode lookup + id
lookup). Bond packages (Open Food Facts, USDA FoodData Central,
Nutritionix, etc.) implement this interface. Application code uses the
convenience functions (`searchFood`, `getFoodByBarcode`, `getFood`)
which delegate to the bonded provider.

## Quick Start

```typescript
import { setProvider, searchFood, getFoodByBarcode } from '@molecule/api-nutrition-database'
import { provider as openFoodFacts } from '@molecule/api-nutrition-database-open-food-facts'

setProvider(openFoodFacts)
const results = await searchFood('granola bar', { limit: 10 })
const lookup = await getFoodByBarcode('3017620422003')
```

## Type
`core`

## Installation
```bash
npm install @molecule/api-nutrition-database @molecule/api-bond @molecule/api-i18n
```

## API

### Interfaces

#### `FoodNutrition`

Normalized food record returned by every nutrition-database provider.

Always carries a per-100g/per-100ml panel ({@link nutrition}) so totals
can be computed from any quantity. {@link perServing} (when present)
describes the as-printed per-serving panel.

```typescript
interface FoodNutrition {
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
```

#### `NutritionDatabaseProvider`

Nutrition-database provider interface.

All nutrition-database providers (Open Food Facts, USDA, Nutritionix,
etc.) implement this interface. The interface is deliberately minimal
so providers with very different upstream APIs can satisfy it
identically — only free-text search, barcode lookup, and id lookup are
required. Implementations whose ids ARE barcodes (e.g. Open Food Facts)
may simply alias {@link getFood} to {@link getFoodByBarcode}.

```typescript
interface NutritionDatabaseProvider {
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
```

#### `NutritionFacts`

A normalized set of nutrient values for a fixed reference quantity.

Every provider returns the same field set so application code never
branches on which provider supplied the data. Fields the upstream API
does not provide are `null` rather than missing or `0` — `null` means
"unknown", `0` means "measured zero".

Energy values are reported as kilocalories ("Calories" in US food
labelling) — this matches the US FDA Nutrition Facts panel and the
majority of consumer-facing nutrition apps. Mass-based fields are in
grams unless otherwise noted.

```typescript
interface NutritionFacts {
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
```

#### `SearchFoodOptions`

Options accepted by {@link NutritionDatabaseProvider.searchFood}.

```typescript
interface SearchFoodOptions {
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
```

#### `ServingSize`

Per-serving size description, when the upstream label exposes one.

Many products describe both a "per 100g/100ml" panel and a "per
serving" panel. {@link FoodNutrition} surfaces both — `per100` for the
normalized comparable basis, `perServing` for the user-facing
label-as-printed.

```typescript
interface ServingSize {
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
```

### Types

#### `Barcode`

GTIN/EAN/UPC barcode in canonical decimal-string form.

Conventionally between 8 and 14 digits with no separators. Implementations
SHOULD accept the value verbatim; callers SHOULD strip whitespace before
passing it in.

```typescript
type Barcode = string
```

#### `FoodId`

Provider-specific food identifier.

Some providers (Open Food Facts) use the product barcode as the id;
others (USDA, Nutritionix) use opaque numeric or string identifiers.
Treat as an opaque string and only feed values previously returned by
the same provider back into {@link NutritionDatabaseProvider.getFood}.

```typescript
type FoodId = string
```

### Functions

#### `getFood(id)`

Look up a food / product by provider-specific id via the bonded provider.

```typescript
function getFood(id: string): Promise<FoodNutrition | null>
```

- `id` — Provider-specific identifier previously returned by

**Returns:** The matching food record, or `null` when no record exists.

#### `getFoodByBarcode(barcode)`

Look up a food / product by GTIN/EAN/UPC barcode via the bonded provider.

```typescript
function getFoodByBarcode(barcode: string): Promise<FoodNutrition | null>
```

- `barcode` — Product barcode in canonical decimal-string form.

**Returns:** The matching food record, or `null` when no record exists.

#### `getProvider()`

Retrieves the bonded nutrition-database provider, throwing if none is
configured.

```typescript
function getProvider(): NutritionDatabaseProvider
```

**Returns:** The bonded nutrition-database provider.

#### `hasProvider()`

Checks whether a nutrition-database provider is currently bonded.

```typescript
function hasProvider(): boolean
```

**Returns:** `true` if a nutrition-database provider is bonded.

#### `searchFood(query, options)`

Free-text search for foods / products via the bonded provider.

```typescript
function searchFood(query: string, options?: SearchFoodOptions): Promise<FoodNutrition[]>
```

- `query` — Free-text query (product name, brand, ingredient).
- `options` — Pagination and result-size options.

**Returns:** Array of normalized food records, ordered by upstream relevance.

#### `setProvider(provider)`

Registers a nutrition-database provider as the active singleton.

Called by bond packages
(e.g. `@molecule/api-nutrition-database-open-food-facts`) during
application startup.

```typescript
function setProvider(provider: NutritionDatabaseProvider): void
```

- `provider` — The nutrition-database provider implementation to bond.

## Available Providers

| Provider | Package |
|----------|---------|
| Open Food Facts | `@molecule/api-nutrition-database-open-food-facts` |

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-bond` ^1.0.0
- `@molecule/api-i18n` ^1.0.0

### Runtime Dependencies

- `@molecule/api-bond`
- `@molecule/api-i18n`
