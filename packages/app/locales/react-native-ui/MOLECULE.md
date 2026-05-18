# @molecule/app-locales-react-native-ui

Translations for the `@molecule/app-react-native-ui` package in 79 languages.

## Purpose

Provides translations for the `@molecule/app-react-native-ui` package, which has 30 translation keys.

## Languages

79 languages supported: af, am, ar, az, be, bg, bn, bs, ca, cs, cy, da, de, el, en, es, et, eu, fa, fi, fil, fr, ga, gl, gu, ha, he, hi, hr, hu, hy, id, ig, is, it, ja, ka, kk, km, kn, ko, ky, lo, lt, lv, mk, ml, mn, mr, ms, mt, my, nb, ne, nl, pa, pl, pt, ro, ru, si, sk, sl, sq, sr, sv, sw, ta, te, th, tr, uk, ur, uz, vi, yo, zh, zh-TW, zu.

## Quick Start

```typescript
import * as react_native_ui from '@molecule/app-locales-react-native-ui'
import type { ReactNativeUiTranslationKey, ReactNativeUiTranslations } from '@molecule/app-locales-react-native-ui'
```

Pass to `setupI18nDefault` via the `packageLocales` option to register
all langs at app startup:

```typescript
setupI18nDefault({
  enUi: en,
  lazyLoadUi,
  packageLocales: [react_native_ui, /* ...other bonds */],
})
```

## Translation Keys

| Key | English |
|-----|---------|
| `ui.icon.chevronUp` | ▲ |
| `ui.icon.chevronDown` | ▼ |
| `ui.alert.dismiss` | Dismiss |
| `ui.icon.close` | ✕ |
| `ui.avatar.alt` | Avatar |
| `ui.avatar.fallback` | ? |
| `ui.icon.check` | ✓ |
| `ui.icon.minus` | − |
| `ui.input.clear` | × |
| `ui.modal.close` | Close |
| `ui.pagination.nav` | Pagination |
| `ui.pagination.first` | First |
| `ui.icon.chevronsLeft` | « |
| `ui.pagination.previous` | Previous |
| `ui.icon.chevronLeft` | ‹ |
| `ui.icon.ellipsis` | … |
| `ui.pagination.goToPage` | Next |
| `ui.icon.chevronRight` | › |
| `ui.pagination.last` | Last |
| `ui.icon.chevronsRight` | » |
| `ui.progress.value` | {{value}}% |
| `ui.radioGroup.label` | Radio group |
| `ui.select.placeholder` | Select… |
| `ui.select.title` | Select |
| `ui.spinner.loading` | Loading |
| `ui.icon.sortAsc` | ↑ |
| `ui.icon.sortDesc` | ↓ |
| `ui.table.empty` | No data |
| `ui.toast.dismiss` | Dismiss |
| `ui.toast.error.noProvider` | useToast must be used within a ToastProvider |
