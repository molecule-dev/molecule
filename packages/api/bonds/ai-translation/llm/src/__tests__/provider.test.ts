import { describe, expect, it } from 'vitest'

import type { AIProvider, ChatEvent, ChatParams } from '@molecule/api-ai'

import { languageName, parseTranslations, systemPrompt } from '../prompt.js'
import { maskText, tokensIntact, unmaskText } from '../protect.js'
import { createProvider } from '../provider.js'

/** A fake AI provider answering each request with `respond(strings)`. */
function fakeAi(respond: (strings: string[], params: ChatParams) => string): {
  ai: AIProvider
  calls: ChatParams[]
} {
  const calls: ChatParams[] = []
  const ai: AIProvider = {
    name: 'fake',
    async *chat(params: ChatParams): AsyncIterable<ChatEvent> {
      calls.push(params)
      const { strings } = JSON.parse(params.messages[0].content as string) as { strings: string[] }
      yield { type: 'text', content: respond(strings, params) }
      yield { type: 'done', usage: { inputTokens: 1, outputTokens: 1 } }
    },
  }
  return { ai, calls }
}

describe('protect (llm)', () => {
  it('masks protected substrings as numbered tokens and restores them by index', () => {
    const { masked, originals } = maskText('{{count}} of {{total}}', ['{{count}}', '{{total}}'])
    expect(masked).toBe('⟦0⟧ of ⟦1⟧')
    expect(tokensIntact('⟦1⟧ 中 ⟦0⟧', originals)).toBe(true)
    expect(unmaskText('⟦1⟧ 中 ⟦0⟧', originals)).toBe('{{total}} 中 {{count}}')
  })

  it('flags a dropped, duplicated or invented token', () => {
    const { originals } = maskText('{{a}} {{b}}', ['{{a}}', '{{b}}'])
    expect(tokensIntact('⟦0⟧', originals)).toBe(false)
    expect(tokensIntact('⟦0⟧ ⟦0⟧', originals)).toBe(false)
    expect(tokensIntact('⟦0⟧ ⟦1⟧ ⟦2⟧', originals)).toBe(false)
  })
})

describe('prompt', () => {
  it('names languages in English, accepting provider-flavored codes', () => {
    expect(languageName('de')).toBe('German')
    expect(languageName('PT-BR')).toBe('Brazilian Portuguese')
    expect(languageName('not a code!')).toBe('not a code!')
  })

  it('puts target, context and instructions into the system prompt', () => {
    const prompt = systemPrompt('kk', 'en', 'Buttons in a log viewer', 'Say "журнал" for log.')
    expect(prompt).toContain('Kazakh')
    expect(prompt).toContain('Buttons in a log viewer')
    expect(prompt).toContain('Say "журнал" for log.')
  })

  it('parses a fenced JSON answer and rejects a wrong-length one', () => {
    expect(parseTranslations('```json\n{"translations":["a","b"]}\n```', 2)).toEqual(['a', 'b'])
    expect(parseTranslations('{"translations":["a"]}', 2)).toBeNull()
    expect(parseTranslations('sorry', 1)).toBeNull()
  })
})

describe('LlmTranslationProvider', () => {
  it('translates a batch in one request and restores placeholders', async () => {
    const { ai, calls } = fakeAi((strings) =>
      JSON.stringify({ translations: strings.map((s) => `DE:${s}`) }),
    )
    const result = await createProvider({ ai, model: 'm' }).translate({
      text: ['{{count}} items', 'Checkout'],
      targetLang: 'de',
      protect: ['{{count}}'],
    })

    expect(calls).toHaveLength(1)
    expect(calls[0].model).toBe('m')
    expect(calls[0].temperature).toBe(0)
    expect(result.translations.map((t) => t.text)).toEqual(['DE:{{count}} items', 'DE:Checkout'])
  })

  it('splits by batchSize', async () => {
    const { ai, calls } = fakeAi((strings) => JSON.stringify({ translations: strings }))
    await createProvider({ ai, batchSize: 2 }).translate({
      text: ['a', 'b', 'c'],
      targetLang: 'fr',
    })
    expect(calls.map((c) => JSON.parse(c.messages[0].content as string).strings)).toEqual([
      ['a', 'b'],
      ['c'],
    ])
  })

  it('retries only the texts that lost a token, in smaller requests', async () => {
    let first = true
    const { ai, calls } = fakeAi((strings) => {
      if (first) {
        first = false
        // Drops the token from the second string.
        return JSON.stringify({ translations: [strings[0], 'lost it', strings[2]] })
      }
      return JSON.stringify({ translations: strings })
    })
    const result = await createProvider({ ai }).translate({
      text: ['a {{x}}', 'b {{x}}', 'c {{x}}'],
      targetLang: 'fr',
      protect: ['{{x}}'],
    })

    expect(calls).toHaveLength(2)
    expect(JSON.parse(calls[1].messages[0].content as string).strings).toEqual(['b ⟦0⟧'])
    expect(result.translations.map((t) => t.text)).toEqual(['a {{x}}', 'b {{x}}', 'c {{x}}'])
  })

  it('returns a text without its placeholders when the model never keeps them', async () => {
    const { ai } = fakeAi((strings) => JSON.stringify({ translations: strings.map(() => 'nope') }))
    const result = await createProvider({ ai }).translate({
      text: 'x {{a}}',
      targetLang: 'fr',
      protect: ['{{a}}'],
    })
    expect(result.translations[0].text).not.toContain('{{a}}')
  })

  it('throws when the model reports an error', async () => {
    const ai: AIProvider = {
      name: 'broken',
      async *chat(): AsyncIterable<ChatEvent> {
        yield { type: 'error', message: 'quota', errorKey: 'ai.quota' }
      },
    }
    await expect(
      createProvider({ ai }).translate({ text: 'x', targetLang: 'fr' }),
    ).rejects.toMatchObject({
      message: 'Translation model error: quota',
      errorKey: 'ai.quota',
    })
  })

  it('lists languages and counts characters', async () => {
    const { ai } = fakeAi((strings) => JSON.stringify({ translations: strings }))
    const provider = createProvider({ ai })
    await provider.translate({ text: ['abc', 'de'], targetLang: 'fr' })
    expect(await provider.getUsage()).toEqual({
      characterCount: 5,
      characterLimit: Number.POSITIVE_INFINITY,
    })
    expect(await provider.getSupportedLanguages()).toContainEqual({
      language: 'ja',
      name: 'Japanese',
    })
  })
})

// Live check through a real model — runs only when a DeepSeek key is present.
describe.skipIf(!process.env.DEEPSEEK_API_KEY)('LlmTranslationProvider (live, DeepSeek)', () => {
  it('translates UI strings and keeps placeholders', async () => {
    const { createProvider: createDeepseek } = await import('@molecule/api-ai-deepseek')
    const provider = createProvider({ ai: createDeepseek() })
    const texts = ['Showing {{start}}-{{end}} of {{count}} stories', 'Close menu']
    const result = await provider.translate({
      text: texts,
      targetLang: 'kk',
      sourceLang: 'en',
      protect: ['{{start}}', '{{end}}', '{{count}}'],
    })
    const [first, second] = result.translations.map((t) => t.text)
    for (const token of ['{{start}}', '{{end}}', '{{count}}']) expect(first).toContain(token)
    expect(second).not.toBe('Close menu')
  }, 120_000)
})
