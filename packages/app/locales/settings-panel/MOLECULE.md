# @molecule/app-locales-settings-panel

Translations for the `@molecule/app-settings-panel` package in 79 languages.

## Purpose

Provides translations for the `@molecule/app-settings-panel-react` package, which has 15 translation keys.

## Languages

79 languages supported: af, am, ar, az, be, bg, bn, bs, ca, cs, cy, da, de, el, en, es, et, eu, fa, fi, fil, fr, ga, gl, gu, ha, he, hi, hr, hu, hy, id, ig, is, it, ja, ka, kk, km, kn, ko, ky, lo, lt, lv, mk, ml, mn, mr, ms, mt, my, nb, ne, nl, pa, pl, pt, ro, ru, si, sk, sl, sq, sr, sv, sw, ta, te, th, tr, uk, ur, uz, vi, yo, zh, zh-TW, zu.

## Quick Start

```typescript
import * as settings_panel_react from '@molecule/app-locales-settings-panel'
import type { SettingsPanelTranslationKey, SettingsPanelTranslations } from '@molecule/app-locales-settings-panel'
```

Pass to `setupI18nDefault` via the `packageLocales` option to register
all langs at app startup:

```typescript
setupI18nDefault({
  enUi: en,
  lazyLoadUi,
  packageLocales: [settings_panel_react, /* ...other bonds */],
})
```

## Translation Keys

| Key | English |
|-----|---------|
| `settings.appearance` | Appearance |
| `settings.darkMode` | Dark mode |
| `theme.toggle` | Toggle theme |
| `settings.logOut` | Sign out |
| `settings.deleteAccount` | Delete account |
| `settings.billing.checkoutFailed` | Could not start checkout. |
| `settings.billing.cancelConfirm` | Cancel your subscription? |
| `settings.billing.cancelFailed` | Could not cancel. |
| `settings.billing` | Billing |
| `settings.plan` | Plan |
| `settings.upgrade` | Upgrade |
| `settings.billing.cancel` | Cancel |
| `settings.billing.upgradeTitle` | Upgrade your plan |
| `settings.billing.noTiers` | No paid plans configured. |
| `settings.billing.subscribe` | Subscribe |
