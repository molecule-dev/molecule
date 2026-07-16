# @molecule/app-locales-feature-barcode-scanner

Translations for @molecule/app-feature-barcode-scanner-react in 79 languages

## Purpose

Provides translations for the `@molecule/app-feature-barcode-scanner-react` package which has 9 translation keys.

## Languages

79 languages supported: af, am, ar, az, be, bg, bn, bs, ca, cs, cy, da, de, el, en, es, et, eu, fa, fi, fil, fr, ga, gl, gu, ha, he, hi, hr, hu, hy, id, ig, is, it, ja, ka, kk, km, kn, ko, ky, lo, lt, lv, mk, ml, mn, mr, ms, mt, my, nb, ne, nl, pa, pl, pt, ro, ru, si, sk, sl, sq, sr, sv, sw, ta, te, th, tr, uk, ur, uz, vi, yo, zh, zh-TW, zu.

## Quick Start

```typescript
import { af, am, ar } from '@molecule/app-locales-feature-barcode-scanner'
import type { BarcodeScannerTranslationKey, BarcodeScannerTranslations } from '@molecule/app-locales-feature-barcode-scanner'
```

## Registration

In an mlcl-scaffolded app, installed locale bonds are registered automatically by the app's i18n setup at startup — installing this package is normally all you need. To register manually (or in a custom app), pass the whole module to `registerLocaleModule` from `@molecule/app-i18n` at startup:

```typescript
import { registerLocaleModule } from '@molecule/app-i18n'
import * as locales from '@molecule/app-locales-feature-barcode-scanner'

registerLocaleModule(locales)
```

## Editing translations

`en.ts` is the canonical key set — every other language file mirrors its keys. To change or add strings, edit the locale files in this package (add new keys to `en.ts` first) or merge overrides at runtime with `addTranslations(locale, map)`. Never hand-write translations inline in feature code: features call `t(key, values, { defaultValue })` and THIS bond supplies the translations — inline strings bypass every other language.

## Translation Keys

| Key | English |
|-----|---------|
| `barcodeScanner.aria.region` | Barcode scanner camera view |
| `barcodeScanner.error.permission_denied` | Camera permission denied |
| `barcodeScanner.error.no_camera` | No camera found |
| `barcodeScanner.error.unsupported` | Camera not supported in this browser |
| `barcodeScanner.error.detector_failure` | Barcode detector failed |
| `barcodeScanner.error.fallback_unavailable` | Barcode scanner library could not be loaded |
| `barcodeScanner.status.starting` | Starting camera… |
| `barcodeScanner.status.scanning` | Scanning… |
| `barcodeScanner.status.stopped` | Scan complete |

## Metadata

- **Type:** locales
- **Category:** i18n
- **Stack:** app
- **Translates:** `@molecule/app-feature-barcode-scanner-react`
