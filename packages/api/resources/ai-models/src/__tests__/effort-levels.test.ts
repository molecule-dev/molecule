import { describe, expect, it } from 'vitest'

import { MODELS } from '../models.js'

/**
 * Catalog invariants for per-model effort. Effort is each model's OWN native
 * value — no abstract scale. A model either declares an ordered
 * `supportedEffortLevels` (native strings or budget labels) with a
 * `defaultEffortLevel`, or omits both (fixed reasoning).
 */
describe('supportedEffortLevels catalog data', () => {
  it('every populated set is a non-empty, duplicate-free list of non-empty strings', () => {
    for (const model of MODELS) {
      if (model.supportedEffortLevels === undefined) continue
      const levels = model.supportedEffortLevels
      expect(levels.length, `${model.id} has an empty set`).toBeGreaterThan(0)
      expect(new Set(levels).size, `${model.id} has duplicate levels`).toBe(levels.length)
      for (const level of levels) {
        expect(typeof level, model.id).toBe('string')
        expect(level.length, `${model.id} has an empty level`).toBeGreaterThan(0)
      }
    }
  })

  it("every model with levels declares a defaultEffortLevel that's one of them", () => {
    for (const model of MODELS) {
      if (!model.supportedEffortLevels) continue
      expect(model.defaultEffortLevel, `${model.id} omits defaultEffortLevel`).toBeDefined()
      expect(model.supportedEffortLevels, `${model.id} default is not one of its levels`).toContain(
        model.defaultEffortLevel,
      )
    }
  })

  it("a budget-configurable model's effortBudgetTokens keys exactly match its levels", () => {
    for (const model of MODELS) {
      if (!model.effortBudgetTokens) continue
      // A budget map implies a controllable reasoning budget.
      expect(model.thinkingConfigurable, `${model.id} has budgets but isn't configurable`).toBe(
        true,
      )
      const keys = Object.keys(model.effortBudgetTokens).sort()
      expect(keys, `${model.id} budget keys != levels`).toEqual(
        [...(model.supportedEffortLevels ?? [])].sort(),
      )
      // Every budget is a positive number.
      for (const [label, tokens] of Object.entries(model.effortBudgetTokens)) {
        expect(typeof tokens, `${model.id} ${label}`).toBe('number')
        expect(tokens, `${model.id} ${label} budget must be > 0`).toBeGreaterThan(0)
      }
    }
  })

  it('current Anthropic adaptive-thinking models are native-effort (no budget map — budget_tokens would 400)', () => {
    // Fable 5 / Opus 4.8 / Sonnet 5 reject budget_tokens outright; the 4.6
    // family deprecates it. Only Haiku 4.5 stays on the budget path.
    for (const model of MODELS) {
      if (model.provider !== 'anthropic') continue
      if (model.id.startsWith('claude-haiku-')) {
        // Budget-configurable → carries a budget map, no native effort param.
        expect(model.effortBudgetTokens, model.id).toBeDefined()
      } else {
        // Native-effort → NO budget map; its levels ARE the provider values.
        expect(
          model.effortBudgetTokens,
          `${model.id} must be native-effort (no budget map)`,
        ).toBeUndefined()
        expect(model.supportedEffortLevels, `${model.id} must expose native levels`).toBeDefined()
      }
    }
  })

  it('fixed-reasoning models expose no effort levels (nothing to tune)', () => {
    for (const model of MODELS) {
      if (model.thinkingConfigurable) continue
      expect(model.supportedEffortLevels, model.id).toBeUndefined()
      expect(model.defaultEffortLevel, model.id).toBeUndefined()
    }
  })

  it('every thinkingConfigurable model exposes effort levels', () => {
    for (const model of MODELS) {
      if (!model.thinkingConfigurable) continue
      expect(
        model.supportedEffortLevels,
        `${model.id} is configurable but exposes no levels`,
      ).toBeDefined()
    }
  })
})
