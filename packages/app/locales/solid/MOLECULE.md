# @molecule/app-locales-solid

Translations for @molecule/app-solid in 79 languages

## Purpose

Provides translations for the `@molecule/app-solid` package which has 10 translation keys.

## Languages

79 languages supported: af, am, ar, az, be, bg, bn, bs, ca, cs, cy, da, de, el, en, es, et, eu, fa, fi, fil, fr, ga, gl, gu, ha, he, hi, hr, hu, hy, id, ig, is, it, ja, ka, kk, km, kn, ko, ky, lo, lt, lv, mk, ml, mn, mr, ms, mt, my, nb, ne, nl, pa, pl, pt, ro, ru, si, sk, sl, sq, sr, sv, sw, ta, te, th, tr, uk, ur, uz, vi, yo, zh, zh-TW, zu.

## Quick Start

```typescript
import { af, am, ar } from '@molecule/app-locales-solid'
import type { SolidTranslationKey, SolidTranslations } from '@molecule/app-locales-solid'
```

## Registration

In an mlcl-scaffolded app, installed locale bonds are registered automatically by the app's i18n setup at startup — installing this package is normally all you need. To register manually (or in a custom app), pass the whole module to `registerLocaleModule` from `@molecule/app-i18n` at startup:

```typescript
import { registerLocaleModule } from '@molecule/app-i18n'
import * as locales from '@molecule/app-locales-solid'

registerLocaleModule(locales)
```

## Editing translations

`en.ts` is the canonical key set — every other language file mirrors its keys. To change or add strings, edit the locale files in this package (add new keys to `en.ts` first) or merge overrides at runtime with `addTranslations(locale, map)`. Never hand-write translations inline in feature code: features call `t(key, values, { defaultValue })` and THIS bond supplies the translations — inline strings bypass every other language.

## Translation Keys

| Key | English |
|-----|---------|
| `solid.error.stateOutsideProvider` | getStateProvider must be used within a MoleculeProvider with state configured |
| `solid.error.authOutsideProvider` | getAuthClient must be used within a MoleculeProvider with auth configured |
| `solid.error.themeOutsideProvider` | getThemeProvider must be used within a MoleculeProvider with theme configured |
| `solid.error.routerOutsideProvider` | getRouter must be used within a MoleculeProvider with router configured |
| `solid.error.i18nOutsideProvider` | getI18nProvider must be used within a MoleculeProvider with i18n configured |
| `solid.error.httpOutsideProvider` | getHttpClient must be used within a MoleculeProvider with http configured |
| `solid.error.storageOutsideProvider` | getStorageProvider must be used within a MoleculeProvider with storage configured |
| `solid.error.loggerOutsideProvider` | getLoggerProvider must be used within a MoleculeProvider with logger configured |
| `solid.error.useAccordionOutsideProvider` | Accordion components must be used within an Accordion |
| `solid.error.useToastOutsideProvider` | useToast must be used within a ToastProvider |

## Metadata

- **Type:** locales
- **Category:** i18n
- **Stack:** app
- **Translates:** `@molecule/app-solid`
