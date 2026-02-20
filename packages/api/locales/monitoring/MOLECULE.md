# @molecule/api-locales-monitoring

Translations for molecule monitoring package in 79 languages

## Purpose

Provides translations for the `@molecule/api-monitoring` package which has 10 translation keys.

## Languages

79 languages supported: af, am, ar, az, be, bg, bn, bs, ca, cs, cy, da, de, el, en, es, et, eu, fa, fi, fil, fr, ga, gl, gu, ha, he, hi, hr, hu, hy, id, ig, is, it, ja, ka, kk, km, kn, ko, ky, lo, lt, lv, mk, ml, mn, mr, ms, mt, my, nb, ne, nl, pa, pl, pt, ro, ru, si, sk, sl, sq, sr, sv, sw, ta, te, th, tr, uk, ur, uz, vi, yo, zh, zh-TW, zu.

## Usage

```typescript
import { af, am, ar } from '@molecule/api-locales-monitoring'
import type { MonitoringTranslationKey, MonitoringTranslations } from '@molecule/api-locales-monitoring'
```

## Translation Keys

| Key | English |
|-----|---------|
| `monitoring.error.noProvider` | Monitoring provider not configured. Call setProvider() first. |
| `monitoring.check.database.notBonded` | Database bond not configured. |
| `monitoring.check.database.poolUnavailable` | Database pool unavailable. |
| `monitoring.check.cache.notBonded` | Cache bond not configured. |
| `monitoring.check.cache.providerUnavailable` | Cache provider unavailable. |
| `monitoring.check.http.badStatus` | HTTP {{status}} response. |
| `monitoring.check.http.timeout` | Request timed out. |
| `monitoring.check.http.degraded` | Response time {{latencyMs}}ms exceeded threshold {{thresholdMs}}ms. |
| `monitoring.check.bond.notBonded` | Bond  |
| `monitoring.check.timedOut` | Check timed out after {{timeoutMs}}ms. |

## Metadata

- **Type:** locales
- **Category:** i18n
- **Stack:** api
- **Translates:** `@molecule/api-monitoring`
