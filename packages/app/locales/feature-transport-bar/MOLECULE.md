# @molecule/app-locales-feature-transport-bar

Companion locale bond for `@molecule/app-feature-transport-bar-react`.

Provides 79-language translations for the transport-bar UI strings
(play / pause / stop / record / skip / loop button aria labels).

## Purpose

Provides translations for the `@molecule/app-feature-transport-bar-react` package which has 10 translation keys.

## Languages

79 languages supported: af, am, ar, az, be, bg, bn, bs, ca, cs, cy, da, de, el, en, es, et, eu, fa, fi, fil, fr, ga, gl, gu, ha, he, hi, hr, hu, hy, id, ig, is, it, ja, ka, kk, km, kn, ko, ky, lo, lt, lv, mk, ml, mn, mr, ms, mt, my, nb, ne, nl, pa, pl, pt, ro, ru, si, sk, sl, sq, sr, sv, sw, ta, te, th, tr, uk, ur, uz, vi, yo, zh, zh-TW, zu.

## Quick Start

```typescript
import { af, am, ar } from '@molecule/app-locales-feature-transport-bar'
import type { TransportBarTranslationKey, TransportBarTranslations } from '@molecule/app-locales-feature-transport-bar'
```

## Registration

In an mlcl-scaffolded app, installed locale bonds are registered automatically by the app's i18n setup at startup — installing this package is normally all you need. To register manually (or in a custom app), pass the whole module to `registerLocaleModule` from `@molecule/app-i18n` at startup:

```typescript
import { registerLocaleModule } from '@molecule/app-i18n'
import * as locales from '@molecule/app-locales-feature-transport-bar'

registerLocaleModule(locales)
```

## Editing translations

`en.ts` is the canonical key set — every other language file mirrors its keys. To change or add strings, edit the locale files in this package (add new keys to `en.ts` first) or merge overrides at runtime with `addTranslations(locale, map)`. Never hand-write translations inline in feature code: features call `t(key, values, { defaultValue })` and THIS bond supplies the translations — inline strings bypass every other language.

## Translation Keys

| Key | English |
|-----|---------|
| `transportBar.aria.region` | Playback transport controls |
| `transportBar.aria.skipBack` | Skip backward |
| `transportBar.aria.skipForward` | Skip forward |
| `transportBar.aria.play` | Play |
| `transportBar.aria.pause` | Pause |
| `transportBar.aria.stop` | Stop |
| `transportBar.aria.record` | Record |
| `transportBar.aria.stopRecording` | Stop recording |
| `transportBar.aria.loopOn` | Disable loop |
| `transportBar.aria.loopOff` | Enable loop |

## Metadata

- **Type:** locales
- **Category:** i18n
- **Stack:** app
- **Translates:** `@molecule/app-feature-transport-bar-react`
