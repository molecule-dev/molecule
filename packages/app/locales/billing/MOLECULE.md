# @molecule/app-locales-billing

Translations for the `@molecule/app-billing` package in 79 languages.

## Purpose

Provides translations for the `@molecule/app-billing-react` package, which has 12 translation keys.

## Languages

79 languages supported: af, am, ar, az, be, bg, bn, bs, ca, cs, cy, da, de, el, en, es, et, eu, fa, fi, fil, fr, ga, gl, gu, ha, he, hi, hr, hu, hy, id, ig, is, it, ja, ka, kk, km, kn, ko, ky, lo, lt, lv, mk, ml, mn, mr, ms, mt, my, nb, ne, nl, pa, pl, pt, ro, ru, si, sk, sl, sq, sr, sv, sw, ta, te, th, tr, uk, ur, uz, vi, yo, zh, zh-TW, zu.

## Quick Start

```typescript
import * as billing_react from '@molecule/app-locales-billing'
import type { BillingTranslationKey, BillingTranslations } from '@molecule/app-locales-billing'
```

Pass to `setupI18nDefault` via the `packageLocales` option to register
all langs at app startup:

```typescript
setupI18nDefault({
  enUi: en,
  lazyLoadUi,
  packageLocales: [billing_react, /* ...other bonds */],
})
```

## Translation Keys

| Key | English |
|-----|---------|
| `billing.status.loading` | Loading… |
| `billing.status.currentPlan` | Current plan: {{tierName}} |
| `billing.status.cancelCta` | Cancel subscription |
| `billing.status.cancelError` | Could not cancel. Please try again. |
| `billing.pricing.loading` | Loading plans… |
| `billing.pricing.error` | Could not load pricing. Try again later. |
| `billing.pricing.checkoutError` | Could not start checkout. Please try again. |
| `billing.pricing.reassurance` | Cancel anytime · No credit card required to start |
| `billing.pricing.mostPopular` | Most popular |
| `billing.pricing.tierEyebrow` | Tier |
| `billing.pricing.perSeat` | per seat |
| `billing.pricing.upgradeCta` | Upgrade to {{tierName}} |
