# @molecule/app-locales-thread-tree

Translations for the `@molecule/app-thread-tree` package in 79 languages.

## Purpose

Provides translations for the `@molecule/app-thread-tree-react` package, which has 6 translation keys.

## Languages

79 languages supported: af, am, ar, az, be, bg, bn, bs, ca, cs, cy, da, de, el, en, es, et, eu, fa, fi, fil, fr, ga, gl, gu, ha, he, hi, hr, hu, hy, id, ig, is, it, ja, ka, kk, km, kn, ko, ky, lo, lt, lv, mk, ml, mn, mr, ms, mt, my, nb, ne, nl, pa, pl, pt, ro, ru, si, sk, sl, sq, sr, sv, sw, ta, te, th, tr, uk, ur, uz, vi, yo, zh, zh-TW, zu.

## Quick Start

```typescript
import * as thread_tree_react from '@molecule/app-locales-thread-tree'
import type { ThreadTreeTranslationKey, ThreadTreeTranslations } from '@molecule/app-locales-thread-tree'
```

Pass to `setupI18nDefault` via the `packageLocales` option to register
all langs at app startup:

```typescript
setupI18nDefault({
  enUi: en,
  lazyLoadUi,
  packageLocales: [thread_tree_react, /* ...other bonds */],
})
```

## Translation Keys

| Key | English |
|-----|---------|
| `threadTree.expand` | Expand {{count}} replies |
| `threadTree.expandSymbol` | [+] |
| `threadTree.collapseSymbol` | [−] |
| `threadTree.score` | {{count}} points |
| `threadTree.upvote` | Upvote |
| `threadTree.reply` | Reply |
