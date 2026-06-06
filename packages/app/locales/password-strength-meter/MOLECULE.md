# @molecule/app-locales-password-strength-meter

Companion locale bond for `@molecule/app-password-strength-meter-react`.

Provides `passwordStrengthMeter.*` translations across 79 supported
locales.

Register all exports with the i18n provider via `registerLocaleModule`:

## Purpose

Provides translations for the `@molecule/app-password-strength-meter-react` package which has 12 translation keys.

## Languages

79 languages supported: af, am, ar, az, be, bg, bn, bs, ca, cs, cy, da, de, el, en, es, et, eu, fa, fi, fil, fr, ga, gl, gu, ha, he, hi, hr, hu, hy, id, ig, is, it, ja, ka, kk, km, kn, ko, ky, lo, lt, lv, mk, ml, mn, mr, ms, mt, my, nb, ne, nl, pa, pl, pt, ro, ru, si, sk, sl, sq, sr, sv, sw, ta, te, th, tr, uk, ur, uz, vi, yo, zh, zh-TW, zu.

## Quick Start

```typescript
import { af, am, ar } from '@molecule/app-locales-password-strength-meter'
import type { PasswordStrengthMeterTranslationKey, PasswordStrengthMeterTranslations } from '@molecule/app-locales-password-strength-meter'
```

## Translation Keys

| Key | English |
|-----|---------|
| `passwordStrengthMeter.label.0` | Very weak |
| `passwordStrengthMeter.label.1` | Weak |
| `passwordStrengthMeter.label.2` | Fair |
| `passwordStrengthMeter.label.3` | Good |
| `passwordStrengthMeter.label.4` | Strong |
| `passwordStrengthMeter.ariaValueText` | Password strength: {{label}} ({{score}} of 4) |
| `passwordStrengthMeter.rule.length` | At least 12 characters |
| `passwordStrengthMeter.rule.upper` | Contains an uppercase letter |
| `passwordStrengthMeter.rule.lower` | Contains a lowercase letter |
| `passwordStrengthMeter.rule.digit` | Contains a digit |
| `passwordStrengthMeter.rule.symbol` | Contains a symbol |
| `passwordStrengthMeter.rule.noCommon` | Not a common password |

## Metadata

- **Type:** locales
- **Category:** i18n
- **Stack:** app
- **Translates:** `@molecule/app-password-strength-meter-react`
