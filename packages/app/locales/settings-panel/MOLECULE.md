# @molecule/app-locales-settings-panel

Translations for @molecule/app-settings-panel-react in 79 languages

## Purpose

Provides translations for the `@molecule/app-settings-panel-react` package which has 15 translation keys.

## Languages

79 languages supported: af, am, ar, az, be, bg, bn, bs, ca, cs, cy, da, de, el, en, es, et, eu, fa, fi, fil, fr, ga, gl, gu, ha, he, hi, hr, hu, hy, id, ig, is, it, ja, ka, kk, km, kn, ko, ky, lo, lt, lv, mk, ml, mn, mr, ms, mt, my, nb, ne, nl, pa, pl, pt, ro, ru, si, sk, sl, sq, sr, sv, sw, ta, te, th, tr, uk, ur, uz, vi, yo, zh, zh-TW, zu.

## Quick Start

```typescript
import { af, am, ar } from '@molecule/app-locales-settings-panel'
import type { SettingsPanelTranslationKey, SettingsPanelTranslations } from '@molecule/app-locales-settings-panel'
```

## Registration

In an mlcl-scaffolded app, installed locale bonds are registered automatically by the app's i18n setup at startup — installing this package is normally all you need. To register manually (or in a custom app), pass the whole module to `registerLocaleModule` from `@molecule/app-i18n` at startup:

```typescript
import { registerLocaleModule } from '@molecule/app-i18n'
import * as locales from '@molecule/app-locales-settings-panel'

registerLocaleModule(locales)
```

## Editing translations

`en.ts` is the canonical key set — every other language file mirrors its keys. To change or add strings, edit the locale files in this package (add new keys to `en.ts` first) or merge overrides at runtime with `addTranslations(locale, map)`. Never hand-write translations inline in feature code: features call `t(key, values, { defaultValue })` and THIS bond supplies the translations — inline strings bypass every other language.

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
| `settings.plan` | Plan:  |
| `settings.upgrade` | Upgrade |
| `settings.billing.cancel` | Cancel |
| `settings.billing.upgradeTitle` | Upgrade your plan |
| `settings.billing.noTiers` | No paid plans configured. |
| `settings.billing.subscribe` | Subscribe |

## Metadata

- **Type:** locales
- **Category:** i18n
- **Stack:** app
- **Translates:** `@molecule/app-settings-panel-react`
