# @molecule/api-nutrition-database

Nutrition + barcode lookup core interface

## Type
`core`

## Bond

- Bond category: `nutrition-database`
- Bond shape: singleton — `bond('nutrition-database', provider)`
- Implemented by provider bond packages (e.g.
  `@molecule/api-nutrition-database-open-food-facts`).

## Public API

```ts
import {
  setProvider,
  hasProvider,
  searchFood,
  getFoodByBarcode,
  getFood,
} from '@molecule/api-nutrition-database'
```

- `searchFood(query, { limit?, page? })` — free-text search for foods /
  products. Returns normalized `FoodNutrition[]`.
- `getFoodByBarcode(barcode)` — look up a product by GTIN/EAN/UPC barcode.
  Returns the matching `FoodNutrition`, or `null`.
- `getFood(id)` — look up a food by provider-specific id. Returns the
  matching `FoodNutrition`, or `null`. Some providers (e.g. Open Food
  Facts) use the barcode as their id and alias this to
  `getFoodByBarcode`.

Every record carries a per-100g/per-100ml panel (`nutrition`) and an
optional per-serving panel (`perServing`) describing the as-printed
serving size. Energy is reported as kilocalories ("Calories"); mass-based
fields are in grams; sodium is in milligrams. Fields the upstream API
does not supply are `null` (not `0`).

## Injection Notes

### Requirements
- A bonded `@molecule/api-nutrition-database-*` provider (Open Food
  Facts, USDA, Nutritionix, etc.). Convenience functions throw a
  translated `nutritionDatabase.error.noProvider` error when none is
  bonded.

### Post-Injection Steps
- Run `npm install` to install dependencies
- Run `npm run build` to compile

### Known Limitations
- Free-tier providers (e.g. Open Food Facts) do not enforce hard
  rate-limits but request a polite `User-Agent` header identifying the
  caller. Providers wire this through their config; see the per-provider
  README for the exact env var.
- Coverage varies by region. Open Food Facts is strongest for European
  packaged goods; USDA for raw US ingredients; Nutritionix for restaurant
  / fast-food entries. Pick the provider that best matches the app's
  primary audience or chain multiple providers via a custom adapter.
