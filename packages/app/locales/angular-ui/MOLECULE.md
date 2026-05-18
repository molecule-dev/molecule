# @molecule/app-locales-angular-ui

Translations for the `@molecule/app-angular-ui` package in 79 languages.

## Purpose

Provides translations for the `@molecule/app-angular-ui` package, which has 5 translation keys.

## Languages

79 languages supported: af, am, ar, az, be, bg, bn, bs, ca, cs, cy, da, de, el, en, es, et, eu, fa, fi, fil, fr, ga, gl, gu, ha, he, hi, hr, hu, hy, id, ig, is, it, ja, ka, kk, km, kn, ko, ky, lo, lt, lv, mk, ml, mn, mr, ms, mt, my, nb, ne, nl, pa, pl, pt, ro, ru, si, sk, sl, sq, sr, sv, sw, ta, te, th, tr, uk, ur, uz, vi, yo, zh, zh-TW, zu.

## Quick Start

```typescript
import * as angular_ui from '@molecule/app-locales-angular-ui'
import type { AngularUiTranslationKey, AngularUiTranslations } from '@molecule/app-locales-angular-ui'
```

Pass to `setupI18nDefault` via the `packageLocales` option to register
all langs at app startup:

```typescript
setupI18nDefault({
  enUi: en,
  lazyLoadUi,
  packageLocales: [angular_ui, /* ...other bonds */],
})
```

## Translation Keys

| Key | English |
|-----|---------|
| `ui.alert.dismiss` | Dismiss |
| `ui.input.clear` | Clear |
| `ui.modal.close` | Close |
| `ui.spinner.loading` | Loading |
| `ui.toast.close` | Close |
