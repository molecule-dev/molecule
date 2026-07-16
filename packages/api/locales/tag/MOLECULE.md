# @molecule/api-locales-tag

Tag resource translations for 79 languages

## Languages

79 languages supported: af, am, ar, az, be, bg, bn, bs, ca, cs, cy, da, de, el, en, es, et, eu, fa, fi, fil, fr, ga, gl, gu, ha, he, hi, hr, hu, hy, id, ig, is, it, ja, ka, kk, km, kn, ko, ky, lo, lt, lv, mk, ml, mn, mr, ms, mt, my, nb, ne, nl, pa, pl, pt, ro, ru, si, sk, sl, sq, sr, sv, sw, ta, te, th, tr, uk, ur, uz, vi, yo, zh, zh-TW, zu.

## Quick Start

```typescript
import { af, am, ar } from '@molecule/api-locales-tag'
import type { TagTranslationKey, TagTranslations } from '@molecule/api-locales-tag'
```

## Registration

In an mlcl-scaffolded app, installed locale bonds are registered automatically by the app's i18n setup at startup — installing this package is normally all you need. To register manually (or in a custom app), pass the whole module to `registerLocaleModule` from `@molecule/api-i18n` at startup:

```typescript
import { registerLocaleModule } from '@molecule/api-i18n'
import * as locales from '@molecule/api-locales-tag'

registerLocaleModule(locales)
```

## Editing translations

`en.ts` is the canonical key set — every other language file mirrors its keys. To change or add strings, edit the locale files in this package (add new keys to `en.ts` first) or merge overrides at runtime with `addTranslations(locale, map)`. Never hand-write translations inline in feature code: features call `t(key, values, { defaultValue })` and THIS bond supplies the translations — inline strings bypass every other language.

## Translation Keys

| Key | English |
|-----|---------|
| `tag.error.nameRequired` | Tag name is required |
| `tag.error.invalidName` | Tag name is invalid |
| `tag.error.createFailed` | Failed to create tag |
| `tag.error.notFound` | Tag not found |
| `tag.error.forbidden` | Forbidden |
| `tag.error.readFailed` | Failed to read tag |
| `tag.error.listFailed` | Failed to list tags |
| `tag.error.updateFailed` | Failed to update tag |
| `tag.error.deleteFailed` | Failed to delete tag |
| `tag.error.popularFailed` | Failed to fetch popular tags |
| `tag.error.tagIdRequired` | tagId is required |
| `tag.error.addFailed` | Failed to add tag to resource |
| `tag.error.associationNotFound` | Tag association not found |
| `tag.error.removeFailed` | Failed to remove tag from resource |
| `tag.error.getBySlugFailed` | Failed to get resources by tag |

## Metadata

- **Type:** locales
- **Category:** i18n
- **Stack:** api
