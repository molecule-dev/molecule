/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works as written against the real model catalog.
 *
 * @module
 */
import { describe, expect, it } from 'vitest'

import { effectiveBaseRates, getAvailableModels, getModel, MODEL_IDS } from '../index.js'

describe('README @example', () => {
  it('validates a selectable id, prices usage at current rates and lists pickable models', () => {
    const requestedId = 'claude-opus-5-5'
    expect(MODEL_IDS.has(requestedId)).toBe(true)

    const model = getModel(requestedId)
    expect(model?.provider).toBe('anthropic')
    if (!model) throw new Error('model missing from catalog')

    const rates = effectiveBaseRates(model)
    const costUsd =
      (12_000 * rates.inputPricePerMTok + 3_000 * rates.outputPricePerMTok) / 1_000_000
    expect(costUsd).toBeGreaterThan(0)

    const selectable = getAvailableModels(['anthropic'])
    expect(selectable.some((m) => m.id === requestedId)).toBe(true)
    expect(selectable.every((m) => m.provider === 'anthropic' && MODEL_IDS.has(m.id))).toBe(true)
  })

  it('rejects an unknown id', () => {
    expect(MODEL_IDS.has('not-a-model')).toBe(false)
    expect(getModel('not-a-model')).toBeUndefined()
  })
})
