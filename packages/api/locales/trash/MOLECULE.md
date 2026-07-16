# @molecule/api-locales-trash

Trash locale bond for molecule.dev.

Provides type-safe translations for `@molecule/api-trash`'s error keys.
Wire by importing the resource package's `i18n.ts` (which calls
`registerLocaleModule` on this package).

## Purpose

Provides translations for the `@molecule/api-trash` package which has 12 translation keys.

## Languages

79 languages supported: af, am, ar, az, be, bg, bn, bs, ca, cs, cy, da, de, el, en, es, et, eu, fa, fi, fil, fr, ga, gl, gu, ha, he, hi, hr, hu, hy, id, ig, is, it, ja, ka, kk, km, kn, ko, ky, lo, lt, lv, mk, ml, mn, mr, ms, mt, my, nb, ne, nl, pa, pl, pt, ro, ru, si, sk, sl, sq, sr, sv, sw, ta, te, th, tr, uk, ur, uz, vi, yo, zh, zh-TW, zu.

## Quick Start

```typescript
import { af, am, ar } from '@molecule/api-locales-trash'
import type { TrashTranslationKey, TrashTranslations } from '@molecule/api-locales-trash'
```

## Registration

In an mlcl-scaffolded app, installed locale bonds are registered automatically by the app's i18n setup at startup — installing this package is normally all you need. To register manually (or in a custom app), pass the whole module to `registerLocaleModule` from `@molecule/api-i18n` at startup:

```typescript
import { registerLocaleModule } from '@molecule/api-i18n'
import * as locales from '@molecule/api-locales-trash'

registerLocaleModule(locales)
```

## Editing translations

`en.ts` is the canonical key set — every other language file mirrors its keys. To change or add strings, edit the locale files in this package (add new keys to `en.ts` first) or merge overrides at runtime with `addTranslations(locale, map)`. Never hand-write translations inline in feature code: features call `t(key, values, { defaultValue })` and THIS bond supplies the translations — inline strings bypass every other language.

## Translation Keys

| Key | English |
|-----|---------|
| `trash.error.alreadyResolved` | Trashed item has already been restored or purged |
| `trash.error.countFailed` | Failed to count trashed items |
| `trash.error.listFailed` | Failed to list trashed items |
| `trash.error.missingId` | Trash ID is required |
| `trash.error.missingResource` | Resource type and ID are required |
| `trash.error.notFound` | Trashed item not found |
| `trash.error.noRestoreHandler` | No restore handler is registered for this resource type |
| `trash.error.purgeFailed` | Failed to purge trashed item |
| `trash.error.readFailed` | Failed to read trashed item |
| `trash.error.restoreFailed` | Failed to restore trashed item |
| `trash.error.trashFailed` | Failed to trash item |
| `trash.error.validationFailed` | Validation failed |

## Metadata

- **Type:** locales
- **Category:** i18n
- **Stack:** api
- **Translates:** `@molecule/api-trash`
