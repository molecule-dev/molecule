import { describe, expect, it } from 'vitest'

import {
  formatTokenCount,
  getAvailableModels,
  getModel,
  getModelsByProvider,
  MODEL_IDS,
  MODELS,
} from '../models.js'

// ---------------------------------------------------------------------------
// formatTokenCount rounding
// ---------------------------------------------------------------------------

describe('formatTokenCount', () => {
  it('formats exact millions', () => {
    expect(formatTokenCount(1_000_000)).toBe('1M')
    expect(formatTokenCount(2_000_000)).toBe('2M')
  })

  it('rounds fractional millions to one decimal', () => {
    expect(formatTokenCount(1_048_576)).toBe('1M')
    expect(formatTokenCount(1_500_000)).toBe('1.5M')
  })

  it('formats exact thousands', () => {
    expect(formatTokenCount(200_000)).toBe('200K')
    expect(formatTokenCount(64_000)).toBe('64K')
  })

  it('rounds fractional thousands to nearest integer', () => {
    expect(formatTokenCount(65_536)).toBe('66K')
    expect(formatTokenCount(327_680)).toBe('328K')
    expect(formatTokenCount(196_608)).toBe('197K')
    expect(formatTokenCount(202_752)).toBe('203K')
  })

  it('returns raw number for values under 1000', () => {
    expect(formatTokenCount(500)).toBe('500')
    expect(formatTokenCount(0)).toBe('0')
  })
})

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
    // Opus and Sonnet use the upgraded dynamic-filtering version
    expect(MODELS.find((m) => m.id === 'claude-opus-4-6')!.webSearchToolType).toBe(
      'web_search_20260209',
    )
    expect(MODELS.find((m) => m.id === 'claude-sonnet-4-6')!.webSearchToolType).toBe(
      'web_search_20260209',
    )
    // Haiku keeps the original version (no code_execution = no dynamic filtering)
    expect(MODELS.find((m) => m.id === 'claude-haiku-4-5-20251001')!.webSearchToolType).toBe(
      'web_search_20250305',
    )
  })

  it('is set on OpenAI, xAI, Google, and Zhipu models', () => {
    for (const provider of ['openai', 'xai', 'zhipu'] as const) {
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

  it('is not set on Meta models (open-source, no native search)', () => {
    const meta = MODELS.filter((m) => m.provider === 'meta')
    expect(meta.length).toBeGreaterThan(0)
    for (const m of meta) {
      expect(m.webSearchToolType).toBeUndefined()
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

  it('is set on OpenAI and xAI models as code_interpreter', () => {
    for (const provider of ['openai', 'xai'] as const) {
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
