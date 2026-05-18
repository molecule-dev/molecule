# @molecule/app-locales-graph-view

Translations for the `@molecule/app-graph-view` package in 79 languages.

## Purpose

Provides translations for the `@molecule/app-graph-view-react` package, which has 2 translation keys.

## Languages

79 languages supported: af, am, ar, az, be, bg, bn, bs, ca, cs, cy, da, de, el, en, es, et, eu, fa, fi, fil, fr, ga, gl, gu, ha, he, hi, hr, hu, hy, id, ig, is, it, ja, ka, kk, km, kn, ko, ky, lo, lt, lv, mk, ml, mn, mr, ms, mt, my, nb, ne, nl, pa, pl, pt, ro, ru, si, sk, sl, sq, sr, sv, sw, ta, te, th, tr, uk, ur, uz, vi, yo, zh, zh-TW, zu.

## Quick Start

```typescript
import * as graph_view_react from '@molecule/app-locales-graph-view'
import type { GraphViewTranslationKey, GraphViewTranslations } from '@molecule/app-locales-graph-view'
```

Pass to `setupI18nDefault` via the `packageLocales` option to register
all langs at app startup:

```typescript
setupI18nDefault({
  enUi: en,
  lazyLoadUi,
  packageLocales: [graph_view_react, /* ...other bonds */],
})
```

## Translation Keys

| Key | English |
|-----|---------|
| `graphView.aria.canvas` | Graph view |
| `graphView.empty` | No nodes to display |
