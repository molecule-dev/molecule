# @molecule/api-locales-payments-google

Translations for @molecule/api-payments-google in 79 languages

## Purpose

Provides translations for the `@molecule/api-payments-google` package which has 4 translation keys.

## Languages

79 languages supported: af, am, ar, az, be, bg, bn, bs, ca, cs, cy, da, de, el, en, es, et, eu, fa, fi, fil, fr, ga, gl, gu, ha, he, hi, hr, hu, hy, id, ig, is, it, ja, ka, kk, km, kn, ko, ky, lo, lt, lv, mk, ml, mn, mr, ms, mt, my, nb, ne, nl, pa, pl, pt, ro, ru, si, sk, sl, sq, sr, sv, sw, ta, te, th, tr, uk, ur, uz, vi, yo, zh, zh-TW, zu.

## Quick Start

```typescript
import { af, am, ar } from '@molecule/api-locales-payments-google'
import type { PaymentsGoogleTranslationKey, PaymentsGoogleTranslations } from '@molecule/api-locales-payments-google'
```

## Registration

In an mlcl-scaffolded app, installed locale bonds are registered automatically by the app's i18n setup at startup — installing this package is normally all you need. To register manually (or in a custom app), pass the whole module to `registerLocaleModule` from `@molecule/api-i18n` at startup:

```typescript
import { registerLocaleModule } from '@molecule/api-i18n'
import * as locales from '@molecule/api-locales-payments-google'

registerLocaleModule(locales)
```

## Editing translations

`en.ts` is the canonical key set — every other language file mirrors its keys. To change or add strings, edit the locale files in this package (add new keys to `en.ts` first) or merge overrides at runtime with `addTranslations(locale, map)`. Never hand-write translations inline in feature code: features call `t(key, values, { defaultValue })` and THIS bond supplies the translations — inline strings bypass every other language.

## Translation Keys

| Key | English |
|-----|---------|
| `payments.google.warn.missingPackageName` | Missing Google Play package name (process.env.GOOGLE_PLAY_PACKAGE_NAME). |
| `payments.google.warn.missingServiceKey` | Missing Google API service key object (process.env.GOOGLE_API_SERVICE_KEY_OBJECT). |
| `payments.google.error.serviceKeyNotConfigured` | Google API service key object not configured |
| `payments.google.error.parseServiceKey` | Error parsing Google API service key object: |

## Metadata

- **Type:** locales
- **Category:** i18n
- **Stack:** api
- **Translates:** `@molecule/api-payments-google`
