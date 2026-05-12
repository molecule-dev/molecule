import { describe, expect, it } from 'vitest'

import { MODELS } from '../models.js'
import { toPublicModel } from '../projection.js'

describe('toPublicModel', () => {
  it('drops outputPricePerMTok from every model', () => {
    for (const model of MODELS) {
      const projected = toPublicModel(model)
      expect((projected as Record<string, unknown>).outputPricePerMTok).toBeUndefined()
    }
  })

  it('preserves every other field', () => {
    const model = MODELS.find((m) => m.id === 'claude-sonnet-4-6')!
    const projected = toPublicModel(model)
    expect(projected.id).toBe(model.id)
    expect(projected.provider).toBe(model.provider)
    expect(projected.label).toBe(model.label)
    expect(projected.description).toBe(model.description)
    expect(projected.contextWindow).toBe(model.contextWindow)
    expect(projected.maxOutputTokens).toBe(model.maxOutputTokens)
    expect(projected.inputPricePerMTok).toBe(model.inputPricePerMTok)
    expect(projected.supportsThinking).toBe(model.supportsThinking)
    expect(projected.thinkingBudgetTokens).toBe(model.thinkingBudgetTokens)
    expect(projected.thinkingConfigurable).toBe(model.thinkingConfigurable)
    expect(projected.supportsVision).toBe(model.supportsVision)
    expect(projected.supportsPromptCaching).toBe(model.supportsPromptCaching)
    expect(projected.supportsTools).toBe(model.supportsTools)
    expect(projected.webSearchToolType).toBe(model.webSearchToolType)
    expect(projected.codeExecutionToolType).toBe(model.codeExecutionToolType)
    expect(projected.webFetchToolType).toBe(model.webFetchToolType)
    expect(projected.knowledgeCutoff).toBe(model.knowledgeCutoff)
  })

  it('preserves freeTier when present', () => {
    const freeTierModel = MODELS.find((m) => m.freeTier)!
    expect(toPublicModel(freeTierModel).freeTier).toBe(true)
  })
})
