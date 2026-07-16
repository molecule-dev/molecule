# @molecule/app-locales-file-card

File-card translations in 79 languages.

Companion locale bond for `@molecule/app-file-card-react`. English is the
base; non-English files are stubs that ship the English defaults until
translated, so the keys remain type-safe and missing locales never hard-fail.

## Purpose

Provides translations for the `@molecule/app-file-card-react` package which has 22 translation keys.

## Languages

79 languages supported: af, am, ar, az, be, bg, bn, bs, ca, cs, cy, da, de, el, en, es, et, eu, fa, fi, fil, fr, ga, gl, gu, ha, he, hi, hr, hu, hy, id, ig, is, it, ja, ka, kk, km, kn, ko, ky, lo, lt, lv, mk, ml, mn, mr, ms, mt, my, nb, ne, nl, pa, pl, pt, ro, ru, si, sk, sl, sq, sr, sv, sw, ta, te, th, tr, uk, ur, uz, vi, yo, zh, zh-TW, zu.

## Quick Start

```typescript
import { af, am, ar } from '@molecule/app-locales-file-card'
import type { FileCardTranslationKey, FileCardTranslations } from '@molecule/app-locales-file-card'
```

## Registration

In an mlcl-scaffolded app, installed locale bonds are registered automatically by the app's i18n setup at startup — installing this package is normally all you need. To register manually (or in a custom app), pass the whole module to `registerLocaleModule` from `@molecule/app-i18n` at startup:

```typescript
import { registerLocaleModule } from '@molecule/app-i18n'
import * as locales from '@molecule/app-locales-file-card'

registerLocaleModule(locales)
```

## Editing translations

`en.ts` is the canonical key set — every other language file mirrors its keys. To change or add strings, edit the locale files in this package (add new keys to `en.ts` first) or merge overrides at runtime with `addTranslations(locale, map)`. Never hand-write translations inline in feature code: features call `t(key, values, { defaultValue })` and THIS bond supplies the translations — inline strings bypass every other language.

## Translation Keys

| Key | English |
|-----|---------|
| `file-card.kind.image` | Image file |
| `file-card.kind.video` | Video file |
| `file-card.kind.audio` | Audio file |
| `file-card.kind.document` | Document |
| `file-card.kind.archive` | Archive |
| `file-card.kind.code` | Code file |
| `file-card.kind.folder` | Folder |
| `file-card.kind.other` | File |
| `file-card.aria.root` | {{name}}, {{kind}} |
| `file-card.aria.size` | Size {{size}} |
| `file-card.aria.modified` | Modified {{when}} |
| `file-card.modified.just-now` | just now |
| `file-card.modified.minute-one` | 1 min ago |
| `file-card.modified.minute-other` | {{count}} min ago |
| `file-card.modified.hour-one` | 1 hr ago |
| `file-card.modified.hour-other` | {{count}} hr ago |
| `file-card.modified.day-one` | yesterday |
| `file-card.modified.day-other` | {{count}} days ago |
| `file-card.modified.week-one` | 1 wk ago |
| `file-card.modified.week-other` | {{count}} wk ago |
| `file-card.modified.month-one` | 1 mo ago |
| `file-card.modified.month-other` | {{count}} mo ago |

## Metadata

- **Type:** locales
- **Category:** i18n
- **Stack:** app
- **Translates:** `@molecule/app-file-card-react`
