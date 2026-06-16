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

  it('fully configurable reasoning models expose the full S/M/L/XL set', () => {
    for (const model of MODELS) {
      if (!model.thinkingConfigurable) continue
      // thinkingConfigurable models map the abstract scale onto a real budget range.
      expect([...(model.supportedEffortLevels ?? ALL_LEVELS)].sort(), model.id).toEqual(
        [...ALL_LEVELS].sort(),
      )
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
