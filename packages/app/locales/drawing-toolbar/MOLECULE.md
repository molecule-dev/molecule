# @molecule/app-locales-drawing-toolbar

Translations for the `@molecule/app-drawing-toolbar` package in 79 languages.

## Purpose

Provides translations for the `@molecule/app-drawing-toolbar-react` package, which has 1 translation keys.

## Languages

79 languages supported: af, am, ar, az, be, bg, bn, bs, ca, cs, cy, da, de, el, en, es, et, eu, fa, fi, fil, fr, ga, gl, gu, ha, he, hi, hr, hu, hy, id, ig, is, it, ja, ka, kk, km, kn, ko, ky, lo, lt, lv, mk, ml, mn, mr, ms, mt, my, nb, ne, nl, pa, pl, pt, ro, ru, si, sk, sl, sq, sr, sv, sw, ta, te, th, tr, uk, ur, uz, vi, yo, zh, zh-TW, zu.

## Quick Start

```typescript
import * as drawing_toolbar_react from '@molecule/app-locales-drawing-toolbar'
import type { DrawingToolbarTranslationKey, DrawingToolbarTranslations } from '@molecule/app-locales-drawing-toolbar'
```

Pass to `setupI18nDefault` via the `packageLocales` option to register
all langs at app startup:

```typescript
setupI18nDefault({
  enUi: en,
  lazyLoadUi,
  packageLocales: [drawing_toolbar_react, /* ...other bonds */],
})
```

## Translation Keys

| Key | English |
|-----|---------|
| `drawingToolbar.label` | Drawing tools |
