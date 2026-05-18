# @molecule/app-locales-cookie-banner

Translations for the `@molecule/app-cookie-banner` package in 79 languages.

## Purpose

Provides translations for the `@molecule/app-cookie-banner-react` package, which has 7 translation keys.

## Languages

79 languages supported: af, am, ar, az, be, bg, bn, bs, ca, cs, cy, da, de, el, en, es, et, eu, fa, fi, fil, fr, ga, gl, gu, ha, he, hi, hr, hu, hy, id, ig, is, it, ja, ka, kk, km, kn, ko, ky, lo, lt, lv, mk, ml, mn, mr, ms, mt, my, nb, ne, nl, pa, pl, pt, ro, ru, si, sk, sl, sq, sr, sv, sw, ta, te, th, tr, uk, ur, uz, vi, yo, zh, zh-TW, zu.

## Quick Start

```typescript
import * as cookie_banner_react from '@molecule/app-locales-cookie-banner'
import type { CookieBannerTranslationKey, CookieBannerTranslations } from '@molecule/app-locales-cookie-banner'
```

Pass to `setupI18nDefault` via the `packageLocales` option to register
all langs at app startup:

```typescript
setupI18nDefault({
  enUi: en,
  lazyLoadUi,
  packageLocales: [cookie_banner_react, /* ...other bonds */],
})
```

## Translation Keys

| Key | English |
|-----|---------|
| `cookieBanner.title` | Cookie preferences |
| `cookieBanner.description` | We use cookies to improve your experience and analyse traffic. |
| `cookieBanner.hideDetails` | Hide details |
| `cookieBanner.customize` | Customize |
| `cookieBanner.reject` | Reject all |
| `cookieBanner.save` | Save preferences |
| `cookieBanner.accept` | Accept all |
