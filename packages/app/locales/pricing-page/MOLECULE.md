# @molecule/app-locales-pricing-page

Translations for @molecule/app-pricing-page-react in 79 languages

## Purpose

Provides translations for the `@molecule/app-pricing-page-react` package which has 13 translation keys.

## Languages

79 languages supported: af, am, ar, az, be, bg, bn, bs, ca, cs, cy, da, de, el, en, es, et, eu, fa, fi, fil, fr, ga, gl, gu, ha, he, hi, hr, hu, hy, id, ig, is, it, ja, ka, kk, km, kn, ko, ky, lo, lt, lv, mk, ml, mn, mr, ms, mt, my, nb, ne, nl, pa, pl, pt, ro, ru, si, sk, sl, sq, sr, sv, sw, ta, te, th, tr, uk, ur, uz, vi, yo, zh, zh-TW, zu.

## Quick Start

```typescript
import { af, am, ar } from '@molecule/app-locales-pricing-page'
import type { PricingPageTranslationKey, PricingPageTranslations } from '@molecule/app-locales-pricing-page'
```

## Registration

In an mlcl-scaffolded app, installed locale bonds are registered automatically by the app's i18n setup at startup — installing this package is normally all you need. To register manually (or in a custom app), pass the whole module to `registerLocaleModule` from `@molecule/app-i18n` at startup:

```typescript
import { registerLocaleModule } from '@molecule/app-i18n'
import * as locales from '@molecule/app-locales-pricing-page'

registerLocaleModule(locales)
```

## Editing translations

`en.ts` is the canonical key set — every other language file mirrors its keys. To change or add strings, edit the locale files in this package (add new keys to `en.ts` first) or merge overrides at runtime with `addTranslations(locale, map)`. Never hand-write translations inline in feature code: features call `t(key, values, { defaultValue })` and THIS bond supplies the translations — inline strings bypass every other language.

## Translation Keys

| Key | English |
|-----|---------|
| `pricingPage.heading` | Choose your plan |
| `pricingPage.loading` | Loading plans… |
| `pricingPage.error` | Could not load pricing. Try again later. |
| `pricingPage.checkoutError` | Could not start checkout. Please try again. |
| `pricingPage.perSeat` | per seat |
| `pricingPage.upgradeCta` | Upgrade to {{tierName}} |
| `pricingPage.currentCta` | Current plan |
| `pricingPage.periodToggle.label` | Billing period |
| `pricingPage.periodToggle.monthly` | Monthly |
| `pricingPage.periodToggle.yearly` | Yearly |
| `pricingPage.planUpdated.heading` | Your plan has been updated |
| `pricingPage.planUpdated.headingNamed` | You |
| `pricingPage.planUpdated.body` | Thanks for upgrading. Your new plan is active immediately and a receipt has been emailed to you. |

## Metadata

- **Type:** locales
- **Category:** i18n
- **Stack:** app
- **Translates:** `@molecule/app-pricing-page-react`
