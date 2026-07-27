import { describe, expect, it } from 'vitest'

import {
  cachedPromptTokens,
  formatTokenTotal,
  totalPromptTokens,
} from '../components/chat-cost-utilities.js'

describe('formatTokenTotal', () => {
  it('abbreviates millions and thousands, and leaves small counts alone', () => {
    expect(formatTokenTotal(25_026_480)).toBe('25.0M')
    expect(formatTokenTotal(1_110_437)).toBe('1.1M')
    expect(formatTokenTotal(40_500)).toBe('40.5K')
    expect(formatTokenTotal(812)).toBe('812')
  })

  it('renders 0 for zero, negatives and non-finite values (never NaN on the card)', () => {
    expect(formatTokenTotal(0)).toBe('0')
    expect(formatTokenTotal(-5)).toBe('0')
    expect(formatTokenTotal(Number.NaN)).toBe('0')
    expect(formatTokenTotal(Number.POSITIVE_INFINITY)).toBe('0')
  })
})

describe('cachedPromptTokens', () => {
  it('sums cache reads and cache writes', () => {
    expect(
      cachedPromptTokens({
        inputTokens: 1_000,
        outputTokens: 500,
        cacheReadInputTokens: 24_000_000,
        cacheCreationInputTokens: 120_000,
      }),
    ).toBe(24_120_000)
  })

  it('is 0 when the provider reports no caching (fields absent)', () => {
    expect(cachedPromptTokens({ inputTokens: 1_000, outputTokens: 500 })).toBe(0)
  })
})

describe('totalPromptTokens', () => {
  it('reconciles with what a provider dashboard reports — uncached PLUS cached', () => {
    // The regression this guards: `inputTokens` is the UNCACHED prompt only
    // (OpenAI-compatible bonds subtract `prompt_tokens_details.cached_tokens`
    // from `prompt_tokens`), so a card showing it alone reads far below the
    // provider's own "tokens processed" figure. In a warm agentic turn the
    // cached share is most of the volume — here 24.1M of 25.1M.
    const usage = {
      inputTokens: 1_000_000,
      outputTokens: 340_000,
      cacheReadInputTokens: 24_000_000,
      cacheCreationInputTokens: 120_000,
    }
    expect(totalPromptTokens(usage)).toBe(25_120_000)
    expect(totalPromptTokens(usage)).toBeGreaterThan(usage.inputTokens)
  })

  it('equals inputTokens when nothing was cached', () => {
    expect(totalPromptTokens({ inputTokens: 4_200, outputTokens: 900 })).toBe(4_200)
  })

  it('treats a non-finite inputTokens as 0 rather than propagating NaN', () => {
    expect(
      totalPromptTokens({
        inputTokens: Number.NaN,
        outputTokens: 0,
        cacheReadInputTokens: 500,
      }),
    ).toBe(500)
  })
})
