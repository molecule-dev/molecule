import { beforeEach, describe, expect, it } from 'vitest'

import type { AIProvider, ChatParams } from '@molecule/api-ai'
import { setProvider as setAIProvider } from '@molecule/api-ai'
import {
  requireProvider as requireSummarizer,
  setProvider as setSummarizer,
} from '@molecule/api-ai-summarization'
import { configure, reset } from '@molecule/api-bond'

import { provider } from '../provider.js'

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

describe('ai-summarization-llm provider', () => {
  beforeEach(() => {
    reset()
    configure({ strict: false, verbose: false })
  })

  it('exposes the "llm" provider name', () => {
    expect(provider.name).toBe('llm')
  })

  it('collects text events and returns summary + usage', async () => {
    const { ai } = makeFakeAI(['Hello ', 'world.'], {
      inputTokens: 42,
      outputTokens: 7,
    })
    setAIProvider(ai)

    const result = await provider.summarize({ text: 'a long article' })

    expect(result.summary).toBe('Hello world.')
    expect(result.usage).toEqual({ inputTokens: 42, outputTokens: 7 })
  })

  it('trims the collected summary', async () => {
    const { ai } = makeFakeAI(['  spaced out  '])
    setAIProvider(ai)

    const result = await provider.summarize({ text: 'x' })
    expect(result.summary).toBe('spaced out')
  })

  it('reflects format, maxLength, and focus in the system prompt', async () => {
    const { ai, captured } = makeFakeAI(['ok'])
    setAIProvider(ai)

    await provider.summarize({
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

    await provider.summarize({ text: 'source text', model: 'some-model' })

    expect(captured.params?.model).toBe('some-model')
    expect(captured.params?.stream).toBe(false)
    expect(captured.params?.messages).toEqual([{ role: 'user', content: 'source text' }])
  })

  it('throws when no AI provider is bonded', async () => {
    await expect(provider.summarize({ text: 'x' })).rejects.toThrow(/AI provider/)
  })

  it('selects a named AI provider and throws a clear error when it is missing', async () => {
    const { ai: fastAI, captured } = makeFakeAI(['fast summary'])
    setAIProvider('fast', fastAI)

    const result = await provider.summarize({ text: 'x', provider: 'fast' })
    expect(result.summary).toBe('fast summary')
    expect(captured.params?.messages).toEqual([{ role: 'user', content: 'x' }])

    await expect(provider.summarize({ text: 'x', provider: 'nonexistent' })).rejects.toThrow(
      /nonexistent/,
    )
  })

  it('surfaces an AI error event as a thrown error', async () => {
    const errorAI: AIProvider = {
      name: 'fake-error',
      async *chat() {
        yield { type: 'error' as const, message: 'rate limited' }
      },
    }
    setAIProvider(errorAI)

    await expect(provider.summarize({ text: 'x' })).rejects.toThrow(/rate limited/)
  })

  it('can be bonded and resolved through the summarization core requireProvider', async () => {
    const { ai } = makeFakeAI(['bonded summary'])
    setAIProvider(ai)
    setSummarizer(provider)

    const result = await requireSummarizer().summarize({ text: 'x' })
    expect(result.summary).toBe('bonded summary')
  })
})
