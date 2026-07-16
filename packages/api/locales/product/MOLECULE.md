# @molecule/api-locales-product

Product resource translations for 79 languages

## Languages

79 languages supported: af, am, ar, az, be, bg, bn, bs, ca, cs, cy, da, de, el, en, es, et, eu, fa, fi, fil, fr, ga, gl, gu, ha, he, hi, hr, hu, hy, id, ig, is, it, ja, ka, kk, km, kn, ko, ky, lo, lt, lv, mk, ml, mn, mr, ms, mt, my, nb, ne, nl, pa, pl, pt, ro, ru, si, sk, sl, sq, sr, sv, sw, ta, te, th, tr, uk, ur, uz, vi, yo, zh, zh-TW, zu.

## Quick Start

```typescript
import { af, am, ar } from '@molecule/api-locales-product'
import type { ProductTranslationKey, ProductTranslations } from '@molecule/api-locales-product'
```

## Registration

In an mlcl-scaffolded app, installed locale bonds are registered automatically by the app's i18n setup at startup — installing this package is normally all you need. To register manually (or in a custom app), pass the whole module to `registerLocaleModule` from `@molecule/api-i18n` at startup:

```typescript
import { registerLocaleModule } from '@molecule/api-i18n'
import * as locales from '@molecule/api-locales-product'

registerLocaleModule(locales)
```

## Editing translations

`en.ts` is the canonical key set — every other language file mirrors its keys. To change or add strings, edit the locale files in this package (add new keys to `en.ts` first) or merge overrides at runtime with `addTranslations(locale, map)`. Never hand-write translations inline in feature code: features call `t(key, values, { defaultValue })` and THIS bond supplies the translations — inline strings bypass every other language.

## Translation Keys

| Key | English |
|-----|---------|
| `product.error.nameRequired` | Product name is required |
| `product.error.invalidName` | Product name is invalid |
| `product.error.invalidPrice` | A valid price is required |
| `product.error.createFailed` | Failed to create product |
| `product.error.notFound` | Product not found |
| `product.error.forbidden` | Access denied |
| `product.error.readFailed` | Failed to read product |
| `product.error.listFailed` | Failed to list products |
| `product.error.updateFailed` | Failed to update product |
| `product.error.deleteFailed` | Failed to delete product |
| `product.error.listVariantsFailed` | Failed to list product variants |
| `product.error.variantNameRequired` | Variant name is required |
| `product.error.createVariantFailed` | Failed to create product variant |

## Metadata

- **Type:** locales
- **Category:** i18n
- **Stack:** api
