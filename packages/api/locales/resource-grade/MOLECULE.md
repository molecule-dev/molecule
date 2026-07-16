# @molecule/api-locales-resource-grade

Translations for @molecule/api-resource-grade in 79 languages.

## Purpose

Provides translations for the `@molecule/api-resource-grade` package which has 15 translation keys.

## Languages

79 languages supported: af, am, ar, az, be, bg, bn, bs, ca, cs, cy, da, de, el, en, es, et, eu, fa, fi, fil, fr, ga, gl, gu, ha, he, hi, hr, hu, hy, id, ig, is, it, ja, ka, kk, km, kn, ko, ky, lo, lt, lv, mk, ml, mn, mr, ms, mt, my, nb, ne, nl, pa, pl, pt, ro, ru, si, sk, sl, sq, sr, sv, sw, ta, te, th, tr, uk, ur, uz, vi, yo, zh, zh-TW, zu.

## Quick Start

```typescript
import { af, am, ar } from '@molecule/api-locales-resource-grade'
import type { GradeTranslationKey, GradeTranslations } from '@molecule/api-locales-resource-grade'
```

## Registration

In an mlcl-scaffolded app, installed locale bonds are registered automatically by the app's i18n setup at startup — installing this package is normally all you need. To register manually (or in a custom app), pass the whole module to `registerLocaleModule` from `@molecule/api-i18n` at startup:

```typescript
import { registerLocaleModule } from '@molecule/api-i18n'
import * as locales from '@molecule/api-locales-resource-grade'

registerLocaleModule(locales)
```

## Editing translations

`en.ts` is the canonical key set — every other language file mirrors its keys. To change or add strings, edit the locale files in this package (add new keys to `en.ts` first) or merge overrides at runtime with `addTranslations(locale, map)`. Never hand-write translations inline in feature code: features call `t(key, values, { defaultValue })` and THIS bond supplies the translations — inline strings bypass every other language.

## Translation Keys

| Key | English |
|-----|---------|
| `grade.error.foreignKeysRequired` | enrollmentId, assignmentId, userId, and courseId are required |
| `grade.error.scoreNumeric` | scorePoints and maxPoints must be numbers |
| `grade.error.maxPointsPositive` | maxPoints must be greater than zero |
| `grade.error.scoreOutOfRange` | scorePoints must be between 0 and maxPoints |
| `grade.error.createFailed` | Failed to post grade |
| `grade.error.notFound` | Grade not found |
| `grade.error.forbidden` | Access denied |
| `grade.error.readFailed` | Failed to read grade |
| `grade.error.listFailed` | Failed to list grades |
| `grade.error.updateFailed` | Failed to update grade |
| `grade.error.deleteFailed` | Failed to delete grade |
| `grade.error.noGrades` | No grades found |
| `grade.error.courseAverageFailed` | Failed to compute course average |
| `grade.error.gpaFailed` | Failed to compute GPA |
| `grade.error.transcriptFailed` | Failed to build transcript |

## Metadata

- **Type:** locales
- **Category:** i18n
- **Stack:** api
- **Translates:** `@molecule/api-resource-grade`
