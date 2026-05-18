# @molecule/app-locales-map-drawing

Translations for the `@molecule/app-map-drawing` package in 79 languages.

## Purpose

Provides translations for the `@molecule/app-map-drawing-react` package, which has 8 translation keys.

## Languages

79 languages supported: af, am, ar, az, be, bg, bn, bs, ca, cs, cy, da, de, el, en, es, et, eu, fa, fi, fil, fr, ga, gl, gu, ha, he, hi, hr, hu, hy, id, ig, is, it, ja, ka, kk, km, kn, ko, ky, lo, lt, lv, mk, ml, mn, mr, ms, mt, my, nb, ne, nl, pa, pl, pt, ro, ru, si, sk, sl, sq, sr, sv, sw, ta, te, th, tr, uk, ur, uz, vi, yo, zh, zh-TW, zu.

## Quick Start

```typescript
import * as map_drawing_react from '@molecule/app-locales-map-drawing'
import type { MapDrawingTranslationKey, MapDrawingTranslations } from '@molecule/app-locales-map-drawing'
```

Pass to `setupI18nDefault` via the `packageLocales` option to register
all langs at app startup:

```typescript
setupI18nDefault({
  enUi: en,
  lazyLoadUi,
  packageLocales: [map_drawing_react, /* ...other bonds */],
})
```

## Translation Keys

| Key | English |
|-----|---------|
| `mapDrawing.surface.aria` | Map drawing surface |
| `mapDrawing.tool.polygon` | Polygon |
| `mapDrawing.tool.circle` | Circle |
| `mapDrawing.tool.pin` | Pin |
| `mapDrawing.tool.line` | Line |
| `mapDrawing.tool.select` | Select |
| `mapDrawing.tool.delete` | Delete |
| `mapDrawing.toolbar.aria` | Map drawing tools |
