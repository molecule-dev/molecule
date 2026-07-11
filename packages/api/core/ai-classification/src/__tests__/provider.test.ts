import { beforeEach, describe, expect, it } from 'vitest'

import type { AIProvider, TokenUsage } from '@molecule/api-ai'
import { bond, configure, reset } from '@molecule/api-bond'

import { getProvider, hasProvider, provider, requireProvider, setProvider } from '../provider.js'

// ---------------------------------------------------------------------------
// Fake AI provider — yields a chunk of text then a done event with usage.
// ---------------------------------------------------------------------------

const makeAI = (
  text: string,
  usage: TokenUsage = { inputTokens: 5, outputTokens: 3 },
): AIProvider => ({
  name: 'fake',
  async *chat() {
    yield { type: 'text' as const, content: text }
    yield { type: 'done' as const, usage }
  },
})

const bondAI = (text: string, usage?: TokenUsage): void => {
  bond('ai', makeAI(text, usage))
}

describe('ai-classification default provider', () => {
  beforeEach(() => {
    reset()
    configure({ strict: false, verbose: false })
  })

  it('has name "default"', () => {
    expect(provider.name).toBe('default')
  })

  it('returns candidate labels sorted desc by score with the correct top + usage', async () => {
    bondAI('{"scores": {"spam": 0.1, "ham": 0.9}}', { inputTokens: 11, outputTokens: 4 })

    const result = await provider.classify({ text: 'hello there', labels: ['spam', 'ham'] })

    expect(result.top).toBe('ham')
    expect(result.labels).toEqual([
      { label: 'ham', score: 0.9 },
      { label: 'spam', score: 0.1 },
    ])
    expect(result.usage).toEqual({ inputTokens: 11, outputTokens: 4 })
  })

  it('restricts to the candidate set (drops extras) and defaults missing labels to 0', async () => {
    // Model returns an out-of-set label ("promo") and omits "urgent".
    bondAI('{"scores": {"spam": 0.8, "ham": 0.2, "promo": 0.99}}')

    const result = await provider.classify({
      text: 'buy now',
      labels: ['spam', 'ham', 'urgent'],
    })

    expect(result.labels.map((l) => l.label).sort()).toEqual(['ham', 'spam', 'urgent'])
    expect(result.labels.find((l) => l.label === 'promo')).toBeUndefined()
    expect(result.labels.find((l) => l.label === 'urgent')?.score).toBe(0)
    expect(result.top).toBe('spam')
  })

  it('parses a fenced ```json``` response with surrounding prose', async () => {
    bondAI('Here you go:\n```json\n{"scores": {"spam": 0.7, "ham": 0.3}}\n```\nDone.')

    const result = await provider.classify({ text: 'x', labels: ['spam', 'ham'] })

    expect(result.top).toBe('spam')
    expect(result.labels).toEqual([
      { label: 'spam', score: 0.7 },
      { label: 'ham', score: 0.3 },
    ])
  })

  it('clamps out-of-range scores into 0..1', async () => {
    bondAI('{"scores": {"spam": 1.7, "ham": -0.5}}')

    const result = await provider.classify({ text: 'x', labels: ['spam', 'ham'] })

    expect(result.labels).toEqual([
      { label: 'spam', score: 1 },
      { label: 'ham', score: 0 },
    ])
  })

  it('throws when labels is empty', async () => {
    bondAI('{"scores": {}}')

    await expect(provider.classify({ text: 'x', labels: [] })).rejects.toThrow(/non-empty/i)
  })

  it('throws when no ai provider is bonded', async () => {
    // No bond('ai', ...) — requireProvider() from @molecule/api-ai must throw.
    await expect(provider.classify({ text: 'x', labels: ['spam', 'ham'] })).rejects.toThrow(
      /AI provider not configured/i,
    )
  })

  it('throws with an output snippet when the model returns unparseable output', async () => {
    bondAI('sorry, I cannot do that')

    await expect(provider.classify({ text: 'x', labels: ['spam', 'ham'] })).rejects.toThrow(
      /could not parse/i,
    )
  })

  it('surfaces an error event from the ai provider', async () => {
    bond('ai', {
      name: 'boom',
      async *chat() {
        yield { type: 'error' as const, message: 'upstream exploded' }
      },
    } as AIProvider)

    await expect(provider.classify({ text: 'x', labels: ['spam', 'ham'] })).rejects.toThrow(
      /upstream exploded/,
    )
  })
})

describe('ai-classification bond accessor', () => {
  beforeEach(() => {
    reset()
    configure({ strict: false, verbose: false })
  })

  it('requireProvider throws when nothing is bonded', () => {
    expect(hasProvider()).toBe(false)
    expect(getProvider()).toBeNull()
    expect(() => requireProvider()).toThrow(/not configured/i)
  })

  it('setProvider then requireProvider round-trips the default provider', async () => {
    setProvider(provider)
    expect(hasProvider()).toBe(true)
    expect(requireProvider()).toBe(provider)

    bondAI('{"scores": {"spam": 0.6, "ham": 0.4}}')
    const result = await requireProvider().classify({ text: 'x', labels: ['spam', 'ham'] })
    expect(result.top).toBe('spam')
  })
})
