# @molecule/app-locales-audio-recorder-react

Translations for the `@molecule/app-audio-recorder` package in 79 languages.

## Purpose

Provides translations for the `@molecule/app-audio-recorder-react` package, which has 12 translation keys.

## Languages

79 languages supported: af, am, ar, az, be, bg, bn, bs, ca, cs, cy, da, de, el, en, es, et, eu, fa, fi, fil, fr, ga, gl, gu, ha, he, hi, hr, hu, hy, id, ig, is, it, ja, ka, kk, km, kn, ko, ky, lo, lt, lv, mk, ml, mn, mr, ms, mt, my, nb, ne, nl, pa, pl, pt, ro, ru, si, sk, sl, sq, sr, sv, sw, ta, te, th, tr, uk, ur, uz, vi, yo, zh, zh-TW, zu.

## Quick Start

```typescript
import * as audio_recorder_react from '@molecule/app-locales-audio-recorder-react'
import type { AudioRecorderTranslationKey, AudioRecorderTranslations } from '@molecule/app-locales-audio-recorder-react'
```

Pass to `setupI18nDefault` via the `packageLocales` option to register
all langs at app startup:

```typescript
setupI18nDefault({
  enUi: en,
  lazyLoadUi,
  packageLocales: [audio_recorder_react, /* ...other bonds */],
})
```

## Translation Keys

| Key | English |
|-----|---------|
| `audioRecorder.unsupported` | Audio recording is not supported in this browser |
| `audioRecorder.error` | Recording failed. Please try again. |
| `audioRecorder.permissionDenied` | Microphone permission denied. Allow access and try again. |
| `audioRecorder.pause` | Pause |
| `audioRecorder.resume` | Resume |
| `audioRecorder.stop` | Stop |
| `audioRecorder.elapsed` | Elapsed {{time}} |
| `audioRecorder.statusPaused` | Paused |
| `audioRecorder.statusProcessed` | Recorded |
| `audioRecorder.statusError` | Error |
| `audioRecorder.statusIdle` | Ready to record |
| `audioRecorder.group` | Audio recorder |
