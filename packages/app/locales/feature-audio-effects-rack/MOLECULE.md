# @molecule/app-locales-feature-audio-effects-rack

Translations for @molecule/app-feature-audio-effects-rack-react in 79 languages

## Purpose

Provides translations for the `@molecule/app-feature-audio-effects-rack-react` package which has 47 translation keys.

## Languages

79 languages supported: af, am, ar, az, be, bg, bn, bs, ca, cs, cy, da, de, el, en, es, et, eu, fa, fi, fil, fr, ga, gl, gu, ha, he, hi, hr, hu, hy, id, ig, is, it, ja, ka, kk, km, kn, ko, ky, lo, lt, lv, mk, ml, mn, mr, ms, mt, my, nb, ne, nl, pa, pl, pt, ro, ru, si, sk, sl, sq, sr, sv, sw, ta, te, th, tr, uk, ur, uz, vi, yo, zh, zh-TW, zu.

## Quick Start

```typescript
import { af, am, ar } from '@molecule/app-locales-feature-audio-effects-rack'
import type { AudioEffectsRackTranslationKey, AudioEffectsRackTranslations } from '@molecule/app-locales-feature-audio-effects-rack'
```

## Registration

In an mlcl-scaffolded app, installed locale bonds are registered automatically by the app's i18n setup at startup — installing this package is normally all you need. To register manually (or in a custom app), pass the whole module to `registerLocaleModule` from `@molecule/app-i18n` at startup:

```typescript
import { registerLocaleModule } from '@molecule/app-i18n'
import * as locales from '@molecule/app-locales-feature-audio-effects-rack'

registerLocaleModule(locales)
```

## Editing translations

`en.ts` is the canonical key set — every other language file mirrors its keys. To change or add strings, edit the locale files in this package (add new keys to `en.ts` first) or merge overrides at runtime with `addTranslations(locale, map)`. Never hand-write translations inline in feature code: features call `t(key, values, { defaultValue })` and THIS bond supplies the translations — inline strings bypass every other language.

## Translation Keys

| Key | English |
|-----|---------|
| `audioEffectsRack.aria.rack` | Audio effects rack |
| `audioEffectsRack.aria.dragHandle` | Drag to reorder |
| `audioEffectsRack.button.add` | Add effect |
| `audioEffectsRack.button.addPlaceholder` | Add effect… |
| `audioEffectsRack.button.bypass` | Bypass |
| `audioEffectsRack.button.remove` | Remove effect |
| `audioEffectsRack.empty` | No effects in chain — add one to get started. |
| `audioEffectsRack.kind.eq` | EQ |
| `audioEffectsRack.kind.compressor` | Compressor |
| `audioEffectsRack.kind.reverb` | Reverb |
| `audioEffectsRack.kind.delay` | Delay |
| `audioEffectsRack.kind.distortion` | Distortion |
| `audioEffectsRack.kind.gate` | Gate |
| `audioEffectsRack.kind.limiter` | Limiter |
| `audioEffectsRack.kind.chorus` | Chorus |
| `audioEffectsRack.kind.flanger` | Flanger |
| `audioEffectsRack.kind.phaser` | Phaser |
| `audioEffectsRack.param.eq.low` | Low |
| `audioEffectsRack.param.eq.mid` | Mid |
| `audioEffectsRack.param.eq.high` | High |
| `audioEffectsRack.param.compressor.threshold` | Threshold |
| `audioEffectsRack.param.compressor.ratio` | Ratio |
| `audioEffectsRack.param.compressor.attack` | Attack |
| `audioEffectsRack.param.compressor.release` | Release |
| `audioEffectsRack.param.reverb.mix` | Mix |
| `audioEffectsRack.param.reverb.decay` | Decay |
| `audioEffectsRack.param.reverb.predelay` | Pre-delay |
| `audioEffectsRack.param.delay.time` | Time |
| `audioEffectsRack.param.delay.feedback` | Feedback |
| `audioEffectsRack.param.delay.mix` | Mix |
| `audioEffectsRack.param.distortion.drive` | Drive |
| `audioEffectsRack.param.distortion.tone` | Tone |
| `audioEffectsRack.param.distortion.mix` | Mix |
| `audioEffectsRack.param.gate.threshold` | Threshold |
| `audioEffectsRack.param.gate.attack` | Attack |
| `audioEffectsRack.param.gate.release` | Release |
| `audioEffectsRack.param.limiter.threshold` | Threshold |
| `audioEffectsRack.param.limiter.release` | Release |
| `audioEffectsRack.param.chorus.rate` | Rate |
| `audioEffectsRack.param.chorus.depth` | Depth |
| `audioEffectsRack.param.chorus.mix` | Mix |
| `audioEffectsRack.param.flanger.rate` | Rate |
| `audioEffectsRack.param.flanger.depth` | Depth |
| `audioEffectsRack.param.flanger.feedback` | Feedback |
| `audioEffectsRack.param.phaser.rate` | Rate |
| `audioEffectsRack.param.phaser.depth` | Depth |
| `audioEffectsRack.param.phaser.feedback` | Feedback |

## Metadata

- **Type:** locales
- **Category:** i18n
- **Stack:** app
- **Translates:** `@molecule/app-feature-audio-effects-rack-react`
