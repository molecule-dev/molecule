# @molecule/app-locales-solid-ui

Translations for the `@molecule/app-solid-ui` package in 79 languages.

## Purpose

Provides translations for the `@molecule/app-solid-ui` package, which has 16 translation keys.

## Languages

79 languages supported: af, am, ar, az, be, bg, bn, bs, ca, cs, cy, da, de, el, en, es, et, eu, fa, fi, fil, fr, ga, gl, gu, ha, he, hi, hr, hu, hy, id, ig, is, it, ja, ka, kk, km, kn, ko, ky, lo, lt, lv, mk, ml, mn, mr, ms, mt, my, nb, ne, nl, pa, pl, pt, ro, ru, si, sk, sl, sq, sr, sv, sw, ta, te, th, tr, uk, ur, uz, vi, yo, zh, zh-TW, zu.

## Quick Start

```typescript
import * as solid_ui from '@molecule/app-locales-solid-ui'
import type { SolidUiTranslationKey, SolidUiTranslations } from '@molecule/app-locales-solid-ui'
```

Pass to `setupI18nDefault` via the `packageLocales` option to register
all langs at app startup:

```typescript
setupI18nDefault({
  enUi: en,
  lazyLoadUi,
  packageLocales: [solid_ui, /* ...other bonds */],
})
```

## Translation Keys

| Key | English |
|-----|---------|
| `solid.error.useAccordionOutsideProvider` | Accordion components must be used within an Accordion |
| `ui.alert.dismiss` | Dismiss |
| `ui.avatar.alt` | Avatar |
| `ui.input.clear` | Clear |
| `ui.modal.close` | Close |
| `ui.pagination.nav` | Pagination |
| `ui.pagination.first` | Go to first page |
| `ui.pagination.previous` | Go to previous page |
| `ui.pagination.goToPage` | Go to page {{page}} |
| `ui.pagination.last` | Go to last page |
| `ui.progress.label` | Progress |
| `ui.radioGroup.label` | Radio group |
| `ui.spinner.loading` | Loading |
| `ui.table.empty` | No data available |
| `ui.toast.close` | Close |
| `solid.error.useToastOutsideProvider` | useToast must be used within a ToastProvider |
