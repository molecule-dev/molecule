# @molecule/api-locales-user-payments

Translations for molecule user payment handlers in 79 languages

## Purpose

Provides translations for the `@molecule/api-user-payments` package which has 8 translation keys.

## Languages

79 languages supported: af, am, ar, az, be, bg, bn, bs, ca, cs, cy, da, de, el, en, es, et, eu, fa, fi, fil, fr, ga, gl, gu, ha, he, hi, hr, hu, hy, id, ig, is, it, ja, ka, kk, km, kn, ko, ky, lo, lt, lv, mk, ml, mn, mr, ms, mt, my, nb, ne, nl, pa, pl, pt, ro, ru, si, sk, sl, sq, sr, sv, sw, ta, te, th, tr, uk, ur, uz, vi, yo, zh, zh-TW, zu.

## Usage

```typescript
import { af, am, ar } from '@molecule/api-locales-user-payments'
import type { UserPaymentTranslationKey, UserPaymentTranslations } from '@molecule/api-locales-user-payments'
```

## Translation Keys

| Key | English |
|-----|---------|
| `user.payment.providerRequired` | Payment provider is required. |
| `user.payment.subscriptionIdRequired` | subscriptionId is required. |
| `user.payment.receiptAndPlanRequired` | receipt and planKey are required. |
| `user.payment.verificationNotConfigured` | Payment verification is not configured for {{provider}}. |
| `user.payment.invalidPlan` | Invalid plan for {{provider}}. |
| `user.payment.verificationFailed` | Payment verification failed for {{provider}}. |
| `user.payment.unknownPlan` | Unknown plan. |
| `user.payment.invalidWebhookEvent` | Invalid webhook event. |

## Metadata

- **Type:** locales
- **Category:** i18n
- **Stack:** api
- **Translates:** `@molecule/api-user-payments`
