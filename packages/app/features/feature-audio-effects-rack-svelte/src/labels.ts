/**
 * Localized labels for the Svelte multi-effect rack. Internal to the package:
 * one literal i18n key per effect kind and per known (kind, param) pair, so the
 * i18n gate can verify every key these calls can produce exists in the locale
 * bond. The public surface stays the React package's export names.
 *
 * @module
 */

import type { InterpolationValues, TranslateOptions } from '@molecule/app-i18n'

import type { EffectKind } from './types.js'

/** The translate function the label helpers call (React's `t`). */
export type Translate = (
  key: string,
  values?: InterpolationValues,
  options?: TranslateOptions,
) => string

/**
 * Localized label for an effect kind — one literal key per kind in the
 * closed `EffectKind` union, so the i18n gate can verify every key this
 * call can produce exists in the locale bond.
 *
 * @param t - The binding's translate function.
 * @param kind - The effect kind.
 * @returns The localized kind label.
 */
export function kindLabel(t: Translate, kind: EffectKind): string {
  switch (kind) {
    case 'eq':
      return t('audioEffectsRack.kind.eq', {}, { defaultValue: 'EQ' })
    case 'compressor':
      return t('audioEffectsRack.kind.compressor', {}, { defaultValue: 'Compressor' })
    case 'reverb':
      return t('audioEffectsRack.kind.reverb', {}, { defaultValue: 'Reverb' })
    case 'delay':
      return t('audioEffectsRack.kind.delay', {}, { defaultValue: 'Delay' })
    case 'distortion':
      return t('audioEffectsRack.kind.distortion', {}, { defaultValue: 'Distortion' })
    case 'gate':
      return t('audioEffectsRack.kind.gate', {}, { defaultValue: 'Gate' })
    case 'limiter':
      return t('audioEffectsRack.kind.limiter', {}, { defaultValue: 'Limiter' })
    case 'chorus':
      return t('audioEffectsRack.kind.chorus', {}, { defaultValue: 'Chorus' })
    case 'flanger':
      return t('audioEffectsRack.kind.flanger', {}, { defaultValue: 'Flanger' })
    case 'phaser':
      return t('audioEffectsRack.kind.phaser', {}, { defaultValue: 'Phaser' })
  }
}

/**
 * Localized label for one param of one effect kind — one literal key per
 * known (kind, param) pair from `EFFECT_PARAM_SCHEMAS`. A param id
 * outside the built-in schemas falls back to one literal catch-all key
 * (never a runtime-built key).
 *
 * @param t - The binding's translate function.
 * @param kind - The effect kind.
 * @param paramId - The param id.
 * @returns The localized param label.
 */
export function paramLabel(t: Translate, kind: EffectKind, paramId: string): string {
  switch (kind) {
    case 'eq':
      switch (paramId) {
        case 'low':
          return t('audioEffectsRack.param.eq.low', {}, { defaultValue: 'Low' })
        case 'mid':
          return t('audioEffectsRack.param.eq.mid', {}, { defaultValue: 'Mid' })
        case 'high':
          return t('audioEffectsRack.param.eq.high', {}, { defaultValue: 'High' })
      }
      break
    case 'compressor':
      switch (paramId) {
        case 'threshold':
          return t('audioEffectsRack.param.compressor.threshold', {}, { defaultValue: 'Threshold' })
        case 'ratio':
          return t('audioEffectsRack.param.compressor.ratio', {}, { defaultValue: 'Ratio' })
        case 'attack':
          return t('audioEffectsRack.param.compressor.attack', {}, { defaultValue: 'Attack' })
        case 'release':
          return t('audioEffectsRack.param.compressor.release', {}, { defaultValue: 'Release' })
      }
      break
    case 'reverb':
      switch (paramId) {
        case 'mix':
          return t('audioEffectsRack.param.reverb.mix', {}, { defaultValue: 'Mix' })
        case 'decay':
          return t('audioEffectsRack.param.reverb.decay', {}, { defaultValue: 'Decay' })
        case 'predelay':
          return t('audioEffectsRack.param.reverb.predelay', {}, { defaultValue: 'Pre-delay' })
      }
      break
    case 'delay':
      switch (paramId) {
        case 'time':
          return t('audioEffectsRack.param.delay.time', {}, { defaultValue: 'Time' })
        case 'feedback':
          return t('audioEffectsRack.param.delay.feedback', {}, { defaultValue: 'Feedback' })
        case 'mix':
          return t('audioEffectsRack.param.delay.mix', {}, { defaultValue: 'Mix' })
      }
      break
    case 'distortion':
      switch (paramId) {
        case 'drive':
          return t('audioEffectsRack.param.distortion.drive', {}, { defaultValue: 'Drive' })
        case 'tone':
          return t('audioEffectsRack.param.distortion.tone', {}, { defaultValue: 'Tone' })
        case 'mix':
          return t('audioEffectsRack.param.distortion.mix', {}, { defaultValue: 'Mix' })
      }
      break
    case 'gate':
      switch (paramId) {
        case 'threshold':
          return t('audioEffectsRack.param.gate.threshold', {}, { defaultValue: 'Threshold' })
        case 'attack':
          return t('audioEffectsRack.param.gate.attack', {}, { defaultValue: 'Attack' })
        case 'release':
          return t('audioEffectsRack.param.gate.release', {}, { defaultValue: 'Release' })
      }
      break
    case 'limiter':
      switch (paramId) {
        case 'threshold':
          return t('audioEffectsRack.param.limiter.threshold', {}, { defaultValue: 'Threshold' })
        case 'release':
          return t('audioEffectsRack.param.limiter.release', {}, { defaultValue: 'Release' })
      }
      break
    case 'chorus':
      switch (paramId) {
        case 'rate':
          return t('audioEffectsRack.param.chorus.rate', {}, { defaultValue: 'Rate' })
        case 'depth':
          return t('audioEffectsRack.param.chorus.depth', {}, { defaultValue: 'Depth' })
        case 'mix':
          return t('audioEffectsRack.param.chorus.mix', {}, { defaultValue: 'Mix' })
      }
      break
    case 'flanger':
      switch (paramId) {
        case 'rate':
          return t('audioEffectsRack.param.flanger.rate', {}, { defaultValue: 'Rate' })
        case 'depth':
          return t('audioEffectsRack.param.flanger.depth', {}, { defaultValue: 'Depth' })
        case 'feedback':
          return t('audioEffectsRack.param.flanger.feedback', {}, { defaultValue: 'Feedback' })
      }
      break
    case 'phaser':
      switch (paramId) {
        case 'rate':
          return t('audioEffectsRack.param.phaser.rate', {}, { defaultValue: 'Rate' })
        case 'depth':
          return t('audioEffectsRack.param.phaser.depth', {}, { defaultValue: 'Depth' })
        case 'feedback':
          return t('audioEffectsRack.param.phaser.feedback', {}, { defaultValue: 'Feedback' })
      }
      break
  }
  return t('audioEffectsRack.param.fallback', {}, { defaultValue: 'Parameter' })
}
