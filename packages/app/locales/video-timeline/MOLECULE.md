# @molecule/app-locales-video-timeline

Translations for the `@molecule/app-video-timeline` package in 79 languages.

## Purpose

Provides translations for the `@molecule/app-video-timeline-react` package, which has 8 translation keys.

## Languages

79 languages supported: af, am, ar, az, be, bg, bn, bs, ca, cs, cy, da, de, el, en, es, et, eu, fa, fi, fil, fr, ga, gl, gu, ha, he, hi, hr, hu, hy, id, ig, is, it, ja, ka, kk, km, kn, ko, ky, lo, lt, lv, mk, ml, mn, mr, ms, mt, my, nb, ne, nl, pa, pl, pt, ro, ru, si, sk, sl, sq, sr, sv, sw, ta, te, th, tr, uk, ur, uz, vi, yo, zh, zh-TW, zu.

## Quick Start

```typescript
import * as video_timeline_react from '@molecule/app-locales-video-timeline'
import type { VideoTimelineTranslationKey, VideoTimelineTranslations } from '@molecule/app-locales-video-timeline'
```

Pass to `setupI18nDefault` via the `packageLocales` option to register
all langs at app startup:

```typescript
setupI18nDefault({
  enUi: en,
  lazyLoadUi,
  packageLocales: [video_timeline_react, /* ...other bonds */],
})
```

## Translation Keys

| Key | English |
|-----|---------|
| `videoTimeline.aria.ruler` | Time ruler |
| `videoTimeline.aria.playhead` | Playhead at {{time}}s |
| `videoTimeline.zoom.in` | Zoom in |
| `videoTimeline.zoom.out` | Zoom out |
| `videoTimeline.aria.mode` | Edit mode |
| `videoTimeline.aria.root` | Video timeline |
| `videoTimeline.mode.${mode}` | − |
| `videoTimeline.zoom.in.icon` | + |
