# @molecule/app-locales-piano-roll

Translations for the `@molecule/app-piano-roll` package in 79 languages.

## Purpose

Provides translations for the `@molecule/app-piano-roll-react` package, which has 5 translation keys.

## Languages

79 languages supported: af, am, ar, az, be, bg, bn, bs, ca, cs, cy, da, de, el, en, es, et, eu, fa, fi, fil, fr, ga, gl, gu, ha, he, hi, hr, hu, hy, id, ig, is, it, ja, ka, kk, km, kn, ko, ky, lo, lt, lv, mk, ml, mn, mr, ms, mt, my, nb, ne, nl, pa, pl, pt, ro, ru, si, sk, sl, sq, sr, sv, sw, ta, te, th, tr, uk, ur, uz, vi, yo, zh, zh-TW, zu.

## Quick Start

```typescript
import * as piano_roll_react from '@molecule/app-locales-piano-roll'
import type { PianoRollTranslationKey, PianoRollTranslations } from '@molecule/app-locales-piano-roll'
```

Pass to `setupI18nDefault` via the `packageLocales` option to register
all langs at app startup:

```typescript
setupI18nDefault({
  enUi: en,
  lazyLoadUi,
  packageLocales: [piano_roll_react, /* ...other bonds */],
})
```

## Translation Keys

| Key | English |
|-----|---------|
| `pianoRoll.aria.roll` | Piano roll |
| `pianoRoll.aria.keys` | Piano keys |
| `pianoRoll.aria.grid` | Note grid |
| `pianoRoll.aria.resize` | Resize note |
| `pianoRoll.aria.note` | Note {{pitch}} starting at beat {{startBeat}} for {{durationBeats}} beats |
