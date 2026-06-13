import { describe, expect, it } from 'vitest'

import { getAvailableModels, getModel, getModelsByProvider, MODEL_IDS } from '../lookup.js'
import { MODELS } from '../models.js'

// ---------------------------------------------------------------------------
// webSearchToolType on model definitions
// ---------------------------------------------------------------------------

describe('webSearchToolType', () => {
  const modelsWithWebSearch = MODELS.filter((m) => m.webSearchToolType)
  const modelsWithoutWebSearch = MODELS.filter((m) => !m.webSearchToolType)

  it('is set on all Anthropic models', () => {
    const anthropic = MODELS.filter((m) => m.provider === 'anthropic')
    expect(anthropic.length).toBeGreaterThan(0)
    for (const m of anthropic) {
      expect(m.webSearchToolType).toBeDefined()
    }
    expect(MODELS.find((m) => m.id === 'claude-opus-4-6')!.webSearchToolType).toBe(
      'web_search_20260209',
    )
    expect(MODELS.find((m) => m.id === 'claude-sonnet-4-6')!.webSearchToolType).toBe(
      'web_search_20260209',
    )
    expect(MODELS.find((m) => m.id === 'claude-haiku-4-5-20251001')!.webSearchToolType).toBe(
      'web_search_20250305',
    )
  })

  it('is set on OpenAI, Google, and Zhipu models', () => {
    for (const provider of ['openai', 'zhipu'] as const) {
      const models = MODELS.filter((m) => m.provider === provider)
      expect(models.length).toBeGreaterThan(0)
      for (const m of models) {
        expect(m.webSearchToolType).toBe('web_search')
      }
    }
    const google = MODELS.filter((m) => m.provider === 'google')
    for (const m of google) {
      expect(m.webSearchToolType).toBe('google_search')
    }
  })

  it('every model with webSearchToolType has a non-empty string', () => {
    for (const m of modelsWithWebSearch) {
      expect(typeof m.webSearchToolType).toBe('string')
      expect(m.webSearchToolType!.length).toBeGreaterThan(0)
    }
  })

  it('models without webSearchToolType have it undefined', () => {
    for (const m of modelsWithoutWebSearch) {
      expect(m.webSearchToolType).toBeUndefined()
    }
  })
})

// ---------------------------------------------------------------------------
// codeExecutionToolType on model definitions
// ---------------------------------------------------------------------------

describe('codeExecutionToolType', () => {
  it('is set on Anthropic Opus and Sonnet (not Haiku)', () => {
    expect(MODELS.find((m) => m.id === 'claude-opus-4-6')!.codeExecutionToolType).toBe(
      'code_execution_20250825',
    )
    expect(MODELS.find((m) => m.id === 'claude-sonnet-4-6')!.codeExecutionToolType).toBe(
      'code_execution_20250825',
    )
    expect(
      MODELS.find((m) => m.id === 'claude-haiku-4-5-20251001')!.codeExecutionToolType,
    ).toBeUndefined()
  })

  it('is set on OpenAI models as code_interpreter', () => {
    for (const provider of ['openai'] as const) {
      const models = MODELS.filter((m) => m.provider === provider)
      expect(models.length).toBeGreaterThan(0)
      for (const m of models) {
        expect(m.codeExecutionToolType).toBe('code_interpreter')
      }
    }
  })

  it('is set on Google as code_execution', () => {
    const google = MODELS.filter((m) => m.provider === 'google')
    for (const m of google) {
      expect(m.codeExecutionToolType).toBe('code_execution')
    }
  })

  it('is not set on Meta, Moonshot, MiniMax, Alibaba, or Zhipu models', () => {
    for (const provider of ['meta', 'moonshot', 'minimax', 'alibaba', 'zhipu'] as const) {
      const models = MODELS.filter((m) => m.provider === provider)
      for (const m of models) {
        expect(m.codeExecutionToolType).toBeUndefined()
      }
    }
  })
})

// ---------------------------------------------------------------------------
// webFetchToolType on model definitions
// ---------------------------------------------------------------------------

describe('webFetchToolType', () => {
  it('is set on Anthropic Opus, Sonnet, and Haiku', () => {
    expect(MODELS.find((m) => m.id === 'claude-opus-4-6')!.webFetchToolType).toBe(
      'web_fetch_20260209',
    )
    expect(MODELS.find((m) => m.id === 'claude-sonnet-4-6')!.webFetchToolType).toBe(
      'web_fetch_20260209',
    )
    expect(MODELS.find((m) => m.id === 'claude-haiku-4-5-20251001')!.webFetchToolType).toBe(
      'web_fetch_20250910',
    )
  })

  it('is set on Google as url_context', () => {
    const google = MODELS.filter((m) => m.provider === 'google')
    for (const m of google) {
      expect(m.webFetchToolType).toBe('url_context')
    }
  })

  it('is not set on OpenAI, xAI, Meta, Moonshot, MiniMax, Alibaba, or Zhipu models', () => {
    for (const provider of [
      'openai',
      'xai',
      'meta',
      'moonshot',
      'minimax',
      'alibaba',
      'zhipu',
    ] as const) {
      const models = MODELS.filter((m) => m.provider === provider)
      for (const m of models) {
        expect(m.webFetchToolType).toBeUndefined()
      }
    }
  })
})

// ---------------------------------------------------------------------------
// getModel lookup
// ---------------------------------------------------------------------------

describe('getModel', () => {
  it('returns model definition for valid ID', () => {
    const model = getModel('claude-haiku-4-5-20251001')
    expect(model).toBeDefined()
    expect(model!.provider).toBe('anthropic')
    expect(model!.webSearchToolType).toBe('web_search_20250305')
  })

  it('returns undefined for unknown ID', () => {
    expect(getModel('nonexistent-model')).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// MODEL_IDS set
// ---------------------------------------------------------------------------

describe('MODEL_IDS', () => {
  it('contains every model ID from MODELS', () => {
    for (const model of MODELS) {
      expect(MODEL_IDS.has(model.id)).toBe(true)
    }
  })

  it('has the same size as MODELS', () => {
    expect(MODEL_IDS.size).toBe(MODELS.length)
  })

  it('returns false for unknown IDs', () => {
    expect(MODEL_IDS.has('nonexistent-model')).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Pricing integrity — spend-accounting invariant
//
// Every offered model MUST carry finite, non-negative per-MTok prices. The cost
// accumulator (molecule-dev ai-cost.ts `computeAiCostCents`) prices each turn from
// these and returns 0 for any model it can't price — so an offered-but-unpriced
// model would silently fall through as FREE and under-count real spend. Since
// chat dispatch is clamped to MODEL_IDS, "every MODELS entry is priced" is exactly
// the guarantee that no usable model escapes metering.
// ---------------------------------------------------------------------------

describe('pricing integrity (spend accounting)', () => {
  it('every model has finite, non-negative input + output per-MTok prices', () => {
    for (const model of MODELS) {
      expect(
        Number.isFinite(model.inputPricePerMTok),
        `${model.id} inputPricePerMTok must be a finite number`,
      ).toBe(true)
      expect(
        Number.isFinite(model.outputPricePerMTok),
        `${model.id} outputPricePerMTok must be a finite number`,
      ).toBe(true)
      expect(
        model.inputPricePerMTok,
        `${model.id} inputPricePerMTok must be >= 0`,
      ).toBeGreaterThanOrEqual(0)
      expect(
        model.outputPricePerMTok,
        `${model.id} outputPricePerMTok must be >= 0`,
      ).toBeGreaterThanOrEqual(0)
    }
  })

  it('every model has finite, non-negative cache read + write per-MTok prices', () => {
    // With prompt caching on, cache-read tokens are the DOMINANT input category
    // for the agentic loop. A model that shipped without cache prices (or with
    // them left at 0) would bill the bulk of real spend as FREE — the exact
    // under-counting CST1 fixed. Requiring finite, non-negative cache prices on
    // every offered model is the compile-and-test guard against that regression.
    for (const model of MODELS) {
      expect(
        Number.isFinite(model.cacheReadPricePerMTok),
        `${model.id} cacheReadPricePerMTok must be a finite number`,
      ).toBe(true)
      expect(
        Number.isFinite(model.cacheWritePricePerMTok),
        `${model.id} cacheWritePricePerMTok must be a finite number`,
      ).toBe(true)
      expect(
        model.cacheReadPricePerMTok,
        `${model.id} cacheReadPricePerMTok must be >= 0`,
      ).toBeGreaterThanOrEqual(0)
      expect(
        model.cacheWritePricePerMTok,
        `${model.id} cacheWritePricePerMTok must be >= 0`,
      ).toBeGreaterThanOrEqual(0)
    }
  })

  it('cache reads are never costlier than fresh input; cache writes never cheaper', () => {
    // Sanity bounds that catch a swapped read/write or a misplaced decimal: a
    // cache HIT is always a discount on fresh input, and a cache WRITE never
    // costs less than fresh input (it may carry a premium, e.g. Anthropic 1.25×).
    for (const model of MODELS) {
      expect(
        model.cacheReadPricePerMTok,
        `${model.id} cache read must be <= input price`,
      ).toBeLessThanOrEqual(model.inputPricePerMTok)
      expect(
        model.cacheWritePricePerMTok,
        `${model.id} cache write must be >= input price`,
      ).toBeGreaterThanOrEqual(model.inputPricePerMTok)
    }
  })

  it('every model has a non-empty id and label', () => {
    for (const model of MODELS) {
      expect(typeof model.id === 'string' && model.id.length > 0).toBe(true)
      expect(typeof model.label === 'string' && model.label.length > 0).toBe(true)
    }
  })
})

// ---------------------------------------------------------------------------
// getModelsByProvider
// ---------------------------------------------------------------------------

describe('getModelsByProvider', () => {
  it('returns Anthropic models', () => {
    const models = getModelsByProvider('anthropic')
    expect(models.length).toBeGreaterThan(0)
    for (const m of models) {
      expect(m.provider).toBe('anthropic')
    }
  })

  it('returns models for each provider that has entries', () => {
    const providers = [...new Set(MODELS.map((m) => m.provider))]
    for (const provider of providers) {
      const models = getModelsByProvider(provider)
      expect(models.length).toBeGreaterThan(0)
      for (const m of models) {
        expect(m.provider).toBe(provider)
      }
    }
  })

  it('returns all models for a provider (not a subset)', () => {
    const providers = [...new Set(MODELS.map((m) => m.provider))]
    for (const provider of providers) {
      const expected = MODELS.filter((m) => m.provider === provider).length
      expect(getModelsByProvider(provider).length).toBe(expected)
    }
  })
})

// ---------------------------------------------------------------------------
// getAvailableModels
// ---------------------------------------------------------------------------

describe('getAvailableModels', () => {
  it('returns models only from available providers (Set)', () => {
    const available = new Set<(typeof MODELS)[number]['provider']>(['anthropic'])
    const models = getAvailableModels(available)
    expect(models.length).toBeGreaterThan(0)
    for (const m of models) {
      expect(m.provider).toBe('anthropic')
    }
  })

  it('accepts an array of providers', () => {
    const models = getAvailableModels(['anthropic', 'openai'])
    expect(models.length).toBeGreaterThan(0)
    for (const m of models) {
      expect(['anthropic', 'openai']).toContain(m.provider)
    }
  })

  it('returns empty for empty provider set', () => {
    expect(getAvailableModels(new Set())).toEqual([])
  })

  it('returns all models when all providers are available', () => {
    const allProviders = new Set(MODELS.map((m) => m.provider))
    expect(getAvailableModels(allProviders).length).toBe(MODELS.length)
  })
})

// ---------------------------------------------------------------------------
// Model data integrity
// ---------------------------------------------------------------------------

describe('model data integrity', () => {
  it('has exactly one freeTier model', () => {
    const freeTierModels = MODELS.filter((m) => m.freeTier)
    expect(freeTierModels).toHaveLength(1)
    expect(freeTierModels[0].id).toBe('grok-code-fast-1')
  })

  it('sets thinkingConfigurable on all models with supportsThinking', () => {
    for (const model of MODELS) {
      if (model.supportsThinking) {
        expect(typeof model.thinkingConfigurable).toBe('boolean')
      }
    }
  })

  it('has positive pricing on every model', () => {
    for (const model of MODELS) {
      expect(model.inputPricePerMTok).toBeGreaterThan(0)
      expect(model.outputPricePerMTok).toBeGreaterThan(0)
    }
  })
})
