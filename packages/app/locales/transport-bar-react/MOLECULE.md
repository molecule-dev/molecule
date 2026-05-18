# @molecule/app-locales-transport-bar-react

Translations for the `@molecule/app-transport-bar` package in 79 languages.

## Purpose

Provides translations for the `@molecule/app-transport-bar-react` package, which has 8 translation keys.

## Languages

79 languages supported: af, am, ar, az, be, bg, bn, bs, ca, cs, cy, da, de, el, en, es, et, eu, fa, fi, fil, fr, ga, gl, gu, ha, he, hi, hr, hu, hy, id, ig, is, it, ja, ka, kk, km, kn, ko, ky, lo, lt, lv, mk, ml, mn, mr, ms, mt, my, nb, ne, nl, pa, pl, pt, ro, ru, si, sk, sl, sq, sr, sv, sw, ta, te, th, tr, uk, ur, uz, vi, yo, zh, zh-TW, zu.

## Quick Start

```typescript
import * as transport_bar_react from '@molecule/app-locales-transport-bar-react'
import type { TransportBarTranslationKey, TransportBarTranslations } from '@molecule/app-locales-transport-bar-react'
```

Pass to `setupI18nDefault` via the `packageLocales` option to register
all langs at app startup:

```typescript
setupI18nDefault({
  enUi: en,
  lazyLoadUi,
  packageLocales: [transport_bar_react, /* ...other bonds */],
})
```

## Translation Keys

| Key | English |
|-----|---------|
| `transportBar.aria.region` | Playback transport controls |
| `transportBar.aria.skipForward` | Skip forward |
| `transportBar.aria.play` | Play |
| `transportBar.aria.pause` | Pause |
| `transportBar.aria.stop` | Stop |
| `transportBar.aria.record` | Record |
| `transportBar.aria.stopRecording` | Stop recording |
| `transportBar.aria.loopOff` | Enable loop |
