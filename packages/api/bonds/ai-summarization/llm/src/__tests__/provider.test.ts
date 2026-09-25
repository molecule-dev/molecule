import { beforeEach, describe, expect, it } from 'vitest'

import type { AIProvider, ChatParams } from '@molecule/api-ai'
import { setProvider as setAIProvider } from '@molecule/api-ai'
import {
  requireProvider as requireSummarizer,
  setProvider as setSummarizer,
} from '@molecule/api-ai-summarization'
import { configure, reset } from '@molecule/api-bond'

import { cleanSummary, countWords, firstSentences, meetsCap, provider } from '../provider.js'

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

  describe('hard caps (maxWords / sentences)', () => {
    /** A fake AI that answers each call with the next scripted reply. */
    function scripted(replies: string[]) {
      const calls: ChatParams[] = []
      const ai: AIProvider = {
        name: 'scripted',
        async *chat(params: ChatParams) {
          calls.push(structuredClone({ ...params, signal: undefined }))
          yield {
            type: 'text' as const,
            content: replies[Math.min(calls.length - 1, replies.length - 1)],
          }
          yield { type: 'done' as const, usage: { inputTokens: 1, outputTokens: 1 } }
        },
      }
      return { ai, calls }
    }
    const long = Array.from({ length: 40 }, (_, i) => `word${i}`).join(' ') + '.'

    it('accepts a compliant answer in one call, stripping labels and quotes', async () => {
      const { ai, calls } = scripted(['TL;DR: "The post explains how builds are logged."'])
      setAIProvider(ai)
      const r = await provider.summarize({ text: 'x', format: 'tldr', maxWords: 25 })
      expect(r).toMatchObject({
        summary: 'The post explains how builds are logged.',
        withinCap: true,
        attempts: 1,
      })
      expect(calls[0].temperature).toBeUndefined()
      expect(calls[0].maxTokens).toBeGreaterThanOrEqual(2048)
      expect(calls[0].system).toContain('about 18 words (never more than 25)')
    })

    it('keeps whole sentences only — the extra sentence and a trailing fragment are dropped', async () => {
      const { ai } = scripted(['It logs builds. It also pairs each session and'])
      setAIProvider(ai)
      const r = await provider.summarize({ text: 'x', maxWords: 25, sentences: 1 })
      expect(r.summary).toBe('It logs builds.')
    })

    it('asks again when the answer runs long, and never slices a sentence', async () => {
      const { ai, calls } = scripted([long, 'A short sentence that fits.'])
      setAIProvider(ai)
      const r = await provider.summarize({ text: 'x', format: 'tldr', maxWords: 25 })
      expect(r).toMatchObject({
        summary: 'A short sentence that fits.',
        withinCap: true,
        attempts: 2,
      })
      expect(calls[1].messages.at(-1)?.content).toMatch(/40 words/)
    })

    it('rejects an answer ending on a function word and retries', async () => {
      const { ai } = scripted([
        'It pairs each session with the.',
        'It pairs each session with its prompt.',
      ])
      setAIProvider(ai)
      const r = await provider.summarize({ text: 'x', format: 'tldr', maxWords: 25 })
      expect(r.summary).toBe('It pairs each session with its prompt.')
    })

    it('after every attempt runs long, returns the shortest complete sentence with withinCap false', async () => {
      const { ai } = scripted([long])
      setAIProvider(ai)
      const r = await provider.summarize({ text: 'x', format: 'tldr', maxWords: 25, attempts: 2 })
      expect(r).toMatchObject({ summary: long, withinCap: false, attempts: 2 })
    })

    it('an empty answer (hidden reasoning used the budget) retries, then throws', async () => {
      const { ai } = scripted(['<think>long reasoning</think>'])
      setAIProvider(ai)
      await expect(provider.summarize({ text: 'x', format: 'tldr', maxWords: 25 })).rejects.toThrow(
        /no usable summary/,
      )
    })

    it('helpers: countWords, cleanSummary, firstSentences, meetsCap', () => {
      expect(countWords('  one two  three ')).toBe(3)
      expect(cleanSummary('**Summary:** Hello there.')).toBe('Hello there.')
      expect(
        cleanSummary(
          'It documents `useAsyncExtendedState`, a **React** _hook_ from [mlcl](https://x.dev).',
        ),
      ).toBe('It documents useAsyncExtendedState, a React hook from mlcl.')
      expect(cleanSummary('Keeps snake_case_names intact.')).toBe('Keeps snake_case_names intact.')
      expect(firstSentences('One. Two. Three', 2)).toBe('One. Two.')
      expect(firstSentences('no ending here', 1)).toBe('')
      expect(meetsCap('It works for e.g. blogs.', 25)).toBe(true)
      expect(meetsCap('It stops at the', 25)).toBe(false)
    })
  })

  it('can be bonded and resolved through the summarization core requireProvider', async () => {
    const { ai } = makeFakeAI(['bonded summary'])
    setAIProvider(ai)
    setSummarizer(provider)

    const result = await requireSummarizer().summarize({ text: 'x' })
    expect(result.summary).toBe('bonded summary')
  })
})
