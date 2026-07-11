import { beforeEach, describe, expect, it } from 'vitest'

import type { AIProvider, ChatParams } from '@molecule/api-ai'
import { setProvider as setAIProvider } from '@molecule/api-ai'
import { configure, reset } from '@molecule/api-bond'

import {
  getProvider,
  getProviderByName,
  hasProvider,
  provider as defaultProvider,
  requireProvider,
  setProvider,
} from '../provider.js'
import type { AISummarizationProvider } from '../types.js'

// ---------------------------------------------------------------------------
// Fake AI provider — records the params it received so we can assert the prompt.
// ---------------------------------------------------------------------------

/**
 * Builds a fake AIProvider that yields the given text chunks then a `done`
 * event, capturing the ChatParams it was called with.
 */
function makeFakeAI(chunks: string[], usage = { inputTokens: 10, outputTokens: 5 }) {
  const captured: { params?: ChatParams } = {}
  const ai: AIProvider = {
    name: 'fake',
    async *chat(params: ChatParams) {
      captured.params = params
      for (const content of chunks) {
        yield { type: 'text' as const, content }
      }
      yield { type: 'done' as const, usage }
    },
  }
  return { ai, captured }
}

const stubSummarizer = (name = 'custom'): AISummarizationProvider => ({
  name,
  async summarize() {
    return { summary: `stub:${name}` }
  },
})

describe('ai-summarization provider', () => {
  beforeEach(() => {
    reset()
    configure({ strict: false, verbose: false })
  })

  // -------------------------------------------------------------------------
  // Accessor — api-bond registry round-trip
  // -------------------------------------------------------------------------

  describe('accessor (api-bond registry)', () => {
    it('starts with no provider bonded', () => {
      expect(hasProvider()).toBe(false)
      expect(getProvider()).toBeNull()
    })

    it('requireProvider throws when nothing is bonded', () => {
      expect(() => requireProvider()).toThrow(/not configured/)
    })

    it('setProvider then getProvider round-trips through the registry', () => {
      const p = stubSummarizer()
      setProvider(p)
      expect(getProvider()).toBe(p)
      expect(requireProvider()).toBe(p)
      expect(hasProvider()).toBe(true)
    })

    it('supports named providers via the registry', () => {
      const p = stubSummarizer('fast')
      setProvider('fast', p)
      expect(getProviderByName('fast')).toBe(p)
      // First named registration also fills the singleton fallback.
      expect(getProvider()).toBe(p)
    })
  })

  // -------------------------------------------------------------------------
  // Default provider — composes the bonded `ai` chat provider
  // -------------------------------------------------------------------------

  describe('default provider.summarize', () => {
    it('collects text events and returns summary + usage', async () => {
      const { ai } = makeFakeAI(['Hello ', 'world.'], {
        inputTokens: 42,
        outputTokens: 7,
      })
      setAIProvider(ai)

      const result = await defaultProvider.summarize({ text: 'a long article' })

      expect(result.summary).toBe('Hello world.')
      expect(result.usage).toEqual({ inputTokens: 42, outputTokens: 7 })
    })

    it('trims the collected summary', async () => {
      const { ai } = makeFakeAI(['  spaced out  '])
      setAIProvider(ai)

      const result = await defaultProvider.summarize({ text: 'x' })
      expect(result.summary).toBe('spaced out')
    })

    it('reflects format and maxLength in the system prompt', async () => {
      const { ai, captured } = makeFakeAI(['ok'])
      setAIProvider(ai)

      await defaultProvider.summarize({
        text: 'a long article',
        format: 'bullets',
        maxLength: 40,
        focus: 'the risks',
      })

      const system = captured.params?.system ?? ''
      expect(system).toContain('bullet')
      expect(system).toContain('40')
      expect(system).toContain('the risks')
    })

    it('passes the model and text through to the AI provider', async () => {
      const { ai, captured } = makeFakeAI(['ok'])
      setAIProvider(ai)

      await defaultProvider.summarize({ text: 'source text', model: 'some-model' })

      expect(captured.params?.model).toBe('some-model')
      expect(captured.params?.stream).toBe(false)
      expect(captured.params?.messages).toEqual([{ role: 'user', content: 'source text' }])
    })

    it('throws when no AI provider is bonded', async () => {
      await expect(defaultProvider.summarize({ text: 'x' })).rejects.toThrow(/AI provider/)
    })

    it('throws a clear error when a named AI provider is missing', async () => {
      const { ai } = makeFakeAI(['ok'])
      setAIProvider(ai) // singleton exists, but the named one does not
      await expect(
        defaultProvider.summarize({ text: 'x', provider: 'nonexistent' }),
      ).rejects.toThrow(/nonexistent/)
    })

    it('surfaces an AI error event as a thrown error', async () => {
      const errorAI: AIProvider = {
        name: 'fake-error',
        async *chat() {
          yield { type: 'error' as const, message: 'rate limited' }
        },
      }
      setAIProvider(errorAI)

      await expect(defaultProvider.summarize({ text: 'x' })).rejects.toThrow(/rate limited/)
    })

    it('can itself be bonded and resolved through requireProvider', async () => {
      const { ai } = makeFakeAI(['bonded summary'])
      setAIProvider(ai)
      setProvider(defaultProvider)

      const result = await requireProvider().summarize({ text: 'x' })
      expect(result.summary).toBe('bonded summary')
    })
  })
})
