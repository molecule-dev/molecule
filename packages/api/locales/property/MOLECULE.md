# @molecule/api-locales-property

Translations for @molecule/api-resource-property in 79 languages.

## Languages

79 languages supported: af, am, ar, az, be, bg, bn, bs, ca, cs, cy, da, de, el, en, es, et, eu, fa, fi, fil, fr, ga, gl, gu, ha, he, hi, hr, hu, hy, id, ig, is, it, ja, ka, kk, km, kn, ko, ky, lo, lt, lv, mk, ml, mn, mr, ms, mt, my, nb, ne, nl, pa, pl, pt, ro, ru, si, sk, sl, sq, sr, sv, sw, ta, te, th, tr, uk, ur, uz, vi, yo, zh, zh-TW, zu.

## Quick Start

```typescript
import { af, am, ar } from '@molecule/api-locales-property'
import type { PropertyTranslationKey, PropertyTranslations } from '@molecule/api-locales-property'
```

## Registration

In an mlcl-scaffolded app, installed locale bonds are registered automatically by the app's i18n setup at startup — installing this package is normally all you need. To register manually (or in a custom app), pass the whole module to `registerLocaleModule` from `@molecule/api-i18n` at startup:

```typescript
import { registerLocaleModule } from '@molecule/api-i18n'
import * as locales from '@molecule/api-locales-property'

registerLocaleModule(locales)
```

## Editing translations

`en.ts` is the canonical key set — every other language file mirrors its keys. To change or add strings, edit the locale files in this package (add new keys to `en.ts` first) or merge overrides at runtime with `addTranslations(locale, map)`. Never hand-write translations inline in feature code: features call `t(key, values, { defaultValue })` and THIS bond supplies the translations — inline strings bypass every other language.

## Translation Keys

| Key | English |
|-----|---------|
| `property.error.unauthorized` | Unauthorized |
| `property.error.forbidden` | You do not have access to this property |
| `property.error.nameRequired` | Property name is required |
| `property.error.invalidName` | Property name is invalid |
| `property.error.addressRequired` | Address line 1, city, and country code are required |
| `property.error.createFailed` | Failed to create property |
| `property.error.notFound` | Property not found |
| `property.error.readFailed` | Failed to read property |
| `property.error.listFailed` | Failed to list properties |
| `property.error.updateFailed` | Failed to update property |
| `property.error.deleteFailed` | Failed to delete property |
| `property.error.listUnitsFailed` | Failed to list property units |
| `property.error.unitNameRequired` | Unit name is required |
| `property.error.createUnitFailed` | Failed to create property unit |
| `property.error.listPhotosFailed` | Failed to list property photos |
| `property.error.photoUrlRequired` | Photo URL is required |
| `property.error.createPhotoFailed` | Failed to create property photo |
| `property.error.listAmenitiesFailed` | Failed to list property amenities |
| `property.error.amenityFieldsRequired` | Amenity code and label are required |
| `property.error.amenityExists` | Amenity with this code already exists for this property |
| `property.error.createAmenityFailed` | Failed to create property amenity |

## Metadata

- **Type:** locales
- **Category:** i18n
- **Stack:** api
