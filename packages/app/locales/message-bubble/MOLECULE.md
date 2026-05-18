# @molecule/app-locales-message-bubble

Translations for the `@molecule/app-message-bubble` package in 79 languages.

## Purpose

Provides translations for the `@molecule/app-message-bubble-react` package, which has 2 translation keys.

## Languages

79 languages supported: af, am, ar, az, be, bg, bn, bs, ca, cs, cy, da, de, el, en, es, et, eu, fa, fi, fil, fr, ga, gl, gu, ha, he, hi, hr, hu, hy, id, ig, is, it, ja, ka, kk, km, kn, ko, ky, lo, lt, lv, mk, ml, mn, mr, ms, mt, my, nb, ne, nl, pa, pl, pt, ro, ru, si, sk, sl, sq, sr, sv, sw, ta, te, th, tr, uk, ur, uz, vi, yo, zh, zh-TW, zu.

## Quick Start

```typescript
import * as message_bubble_react from '@molecule/app-locales-message-bubble'
import type { MessageBubbleTranslationKey, MessageBubbleTranslations } from '@molecule/app-locales-message-bubble'
```

Pass to `setupI18nDefault` via the `packageLocales` option to register
all langs at app startup:

```typescript
setupI18nDefault({
  enUi: en,
  lazyLoadUi,
  packageLocales: [message_bubble_react, /* ...other bonds */],
})
```

## Translation Keys

| Key | English |
|-----|---------|
| `composer.placeholder` | Write a message… |
| `composer.send` | Send |
