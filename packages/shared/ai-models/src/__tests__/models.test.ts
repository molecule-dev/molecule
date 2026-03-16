import { describe, expect, it } from 'vitest'

import { formatTokenCount, getModel, MODELS } from '../models.js'

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
      expect(m.webSearchToolType).toBe('web_search_20250305')
    }
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
