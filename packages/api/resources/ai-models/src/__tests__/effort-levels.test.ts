import { describe, expect, it } from 'vitest'

import { MODELS } from '../models.js'
import type { EffortLevel } from '../types.js'

const ALL_LEVELS: readonly EffortLevel[] = ['S', 'M', 'L', 'XL']
/** The global default effort level (mirrors `DEFAULT_EFFORT_LEVEL` in the consumers). */
const DEFAULT_LEVEL: EffortLevel = 'M'

describe('supportedEffortLevels catalog data', () => {
  it('every populated set is a non-empty, duplicate-free subset of the abstract scale', () => {
    for (const model of MODELS) {
      if (model.supportedEffortLevels === undefined) continue
      const levels = model.supportedEffortLevels
      expect(levels.length, `${model.id} has an empty set`).toBeGreaterThan(0)
      // No duplicates.
      expect(new Set(levels).size, `${model.id} has duplicate levels`).toBe(levels.length)
      // Subset of S/M/L/XL.
      for (const level of levels) {
        expect(ALL_LEVELS, `${model.id} has an unknown level ${level}`).toContain(level)
      }
    }
  })

  it('every populated set includes the default level so DEFAULT_EFFORT_LEVEL is always in range', () => {
    for (const model of MODELS) {
      if (model.supportedEffortLevels === undefined) continue
      expect(model.supportedEffortLevels, `${model.id} omits the default level`).toContain(
        DEFAULT_LEVEL,
      )
    }
  })

  it('budget-scaled configurable models (no native map) expose the full S/M/L/XL set', () => {
    for (const model of MODELS) {
      if (!model.thinkingConfigurable || model.effortNativeByLevel) continue
      // Without a native effort map, thinkingConfigurable models scale a real
      // token budget — every point on the abstract scale is meaningful.
      expect([...(model.supportedEffortLevels ?? ALL_LEVELS)].sort(), model.id).toEqual(
        [...ALL_LEVELS].sort(),
      )
    }
  })

  it('native-effort models declare a map whose keys exactly match supportedEffortLevels', () => {
    for (const model of MODELS) {
      if (!model.effortNativeByLevel) continue
      // A native map implies a controllable reasoning param.
      expect(model.thinkingConfigurable, `${model.id} has a map but is not configurable`).toBe(true)
      const mapKeys = Object.keys(model.effortNativeByLevel).sort()
      expect(mapKeys, `${model.id} map keys != supportedEffortLevels`).toEqual(
        [...(model.supportedEffortLevels ?? [])].sort(),
      )
      // The default level must resolve to a native value.
      expect(
        model.effortNativeByLevel[DEFAULT_LEVEL],
        `${model.id} map omits the default level`,
      ).toBeTruthy()
      // Native values are non-empty distinct strings (monotonicity is curated,
      // not machine-checkable across provider scales).
      const values = Object.values(model.effortNativeByLevel)
      for (const value of values) {
        expect(typeof value, model.id).toBe('string')
        expect((value as string).length, `${model.id} has an empty native value`).toBeGreaterThan(0)
      }
      expect(new Set(values).size, `${model.id} maps two levels to one native value`).toBe(
        values.length,
      )
    }
  })

  it('current Anthropic adaptive-thinking models carry a native effort map (budget_tokens would 400)', () => {
    // Fable 5 / Opus 4.8 / Sonnet 5 reject budget_tokens outright; the 4.6
    // family deprecates it. Only Haiku 4.5 stays on the legacy budget path.
    for (const model of MODELS) {
      if (model.provider !== 'anthropic') continue
      if (model.id.startsWith('claude-haiku-')) {
        expect(model.effortNativeByLevel, model.id).toBeUndefined()
      } else {
        expect(model.effortNativeByLevel, `${model.id} must use adaptive + effort`).toBeDefined()
      }
    }
  })

  it('models with a fixed reasoning budget expose a reduced set (default-only)', () => {
    for (const model of MODELS) {
      if (model.thinkingConfigurable) continue
      // A fixed (or absent) reasoning budget cannot be dialed, so the catalog
      // restricts the model to the single default level.
      expect(model.supportedEffortLevels, model.id).toEqual([DEFAULT_LEVEL])
    }
  })

  it('the curated catalog sets the field explicitly on every entry', () => {
    // Absent is still a valid wire/type state (means "all levels"); the catalog
    // chooses to be explicit so each model's effort capability is self-evident.
    for (const model of MODELS) {
      expect(
        model.supportedEffortLevels,
        `${model.id} is missing supportedEffortLevels`,
      ).toBeDefined()
    }
  })
})
