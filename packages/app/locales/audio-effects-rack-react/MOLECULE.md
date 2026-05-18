# @molecule/app-locales-audio-effects-rack-react

Translations for the `@molecule/app-audio-effects-rack` package in 79 languages.

## Purpose

Provides translations for the `@molecule/app-audio-effects-rack-react` package, which has 5 translation keys.

## Languages

79 languages supported: af, am, ar, az, be, bg, bn, bs, ca, cs, cy, da, de, el, en, es, et, eu, fa, fi, fil, fr, ga, gl, gu, ha, he, hi, hr, hu, hy, id, ig, is, it, ja, ka, kk, km, kn, ko, ky, lo, lt, lv, mk, ml, mn, mr, ms, mt, my, nb, ne, nl, pa, pl, pt, ro, ru, si, sk, sl, sq, sr, sv, sw, ta, te, th, tr, uk, ur, uz, vi, yo, zh, zh-TW, zu.

## Quick Start

```typescript
import * as audio_effects_rack_react from '@molecule/app-locales-audio-effects-rack-react'
import type { AudioEffectsRackTranslationKey, AudioEffectsRackTranslations } from '@molecule/app-locales-audio-effects-rack-react'
```

Pass to `setupI18nDefault` via the `packageLocales` option to register
all langs at app startup:

```typescript
setupI18nDefault({
  enUi: en,
  lazyLoadUi,
  packageLocales: [audio_effects_rack_react, /* ...other bonds */],
})
```

## Translation Keys

| Key | English |
|-----|---------|
| `audioEffectsRack.aria.rack` | Audio effects rack |
| `audioEffectsRack.button.add` | Add effect |
| `audioEffectsRack.button.addPlaceholder` | Add effect… |
| `audioEffectsRack.button.bypass` | Bypass |
| `audioEffectsRack.aria.dragHandle` | Drag to reorder |
