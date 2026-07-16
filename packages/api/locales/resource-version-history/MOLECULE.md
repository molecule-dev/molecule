# @molecule/api-locales-resource-version-history

Version-history resource locale bond for molecule.dev.

Provides type-safe translations for `@molecule/api-resource-version-history`'s
error keys. Wire by importing the resource package's `i18n.ts` (which calls
`registerLocaleModule` on this package).

## Purpose

Provides translations for the `@molecule/api-resource-version-history` package which has 12 translation keys.

## Languages

79 languages supported: af, am, ar, az, be, bg, bn, bs, ca, cs, cy, da, de, el, en, es, et, eu, fa, fi, fil, fr, ga, gl, gu, ha, he, hi, hr, hu, hy, id, ig, is, it, ja, ka, kk, km, kn, ko, ky, lo, lt, lv, mk, ml, mn, mr, ms, mt, my, nb, ne, nl, pa, pl, pt, ro, ru, si, sk, sl, sq, sr, sv, sw, ta, te, th, tr, uk, ur, uz, vi, yo, zh, zh-TW, zu.

## Quick Start

```typescript
import { af, am, ar } from '@molecule/api-locales-resource-version-history'
import type { VersionHistoryTranslationKey, VersionHistoryTranslations } from '@molecule/api-locales-resource-version-history'
```

## Registration

In an mlcl-scaffolded app, installed locale bonds are registered automatically by the app's i18n setup at startup — installing this package is normally all you need. To register manually (or in a custom app), pass the whole module to `registerLocaleModule` from `@molecule/api-i18n` at startup:

```typescript
import { registerLocaleModule } from '@molecule/api-i18n'
import * as locales from '@molecule/api-locales-resource-version-history'

registerLocaleModule(locales)
```

## Editing translations

`en.ts` is the canonical key set — every other language file mirrors its keys. To change or add strings, edit the locale files in this package (add new keys to `en.ts` first) or merge overrides at runtime with `addTranslations(locale, map)`. Never hand-write translations inline in feature code: features call `t(key, values, { defaultValue })` and THIS bond supplies the translations — inline strings bypass every other language.

## Translation Keys

| Key | English |
|-----|---------|
| `versionHistory.error.countFailed` | Failed to count versions |
| `versionHistory.error.createFailed` | Failed to create version |
| `versionHistory.error.diffFailed` | Failed to diff versions |
| `versionHistory.error.diffNotFound` | One or both versions not found, or they belong to different resources |
| `versionHistory.error.invalidVersion` | Version number must be a positive integer |
| `versionHistory.error.listFailed` | Failed to list versions |
| `versionHistory.error.missingId` | Version ID is required |
| `versionHistory.error.missingResource` | Resource type and ID are required |
| `versionHistory.error.notFound` | Version not found |
| `versionHistory.error.readFailed` | Failed to read version |
| `versionHistory.error.restoreFailed` | Failed to restore version |
| `versionHistory.error.validationFailed` | Validation failed |

## Metadata

- **Type:** locales
- **Category:** i18n
- **Stack:** api
- **Translates:** `@molecule/api-resource-version-history`
