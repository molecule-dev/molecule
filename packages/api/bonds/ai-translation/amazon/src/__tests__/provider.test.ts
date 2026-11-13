/**
 * Tests for the Amazon Translate provider.
 *
 * The AWS SDK is mocked: unit tests prove the bond's own behavior (parameter
 * mapping, protect masking, limits before any upstream call); live translation
 * is proven against the real API.
 *
 * @module
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mockSend = vi.fn()
const mockTrackBondFailure = vi.fn()

vi.mock('@aws-sdk/client-translate', () => ({
  TranslateClient: vi.fn(function () {
    return { send: mockSend }
  }),
  TranslateTextCommand: vi.fn(function (input: unknown) {
    return { input, type: 'TranslateTextCommand' }
  }),
  ListLanguagesCommand: vi.fn(function (input: unknown) {
    return { input, type: 'ListLanguagesCommand' }
  }),
}))
vi.mock('@molecule/api-analytics', () => ({
  trackBondFailure: (...args: unknown[]) => mockTrackBondFailure(...args),
}))
vi.mock('@molecule/api-proxy-agent', () => ({
  getProxyAgents: vi.fn(() => undefined),
}))

import {
  ListLanguagesCommand,
  TranslateClient,
  TranslateTextCommand,
} from '@aws-sdk/client-translate'

import { maskText, unmaskText } from '../protect.js'
import { createProvider, resolveRegion } from '../provider.js'

beforeEach(() => {
  vi.clearAllMocks()
  mockSend.mockReset()
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('protect (amazon)', () => {
  it('masks protected substrings as numbered tokens and restores them', () => {
    const masked = maskText('Showing {{start}}-{{end}} & more', ['{{start}}', '{{end}}'])
    expect(masked.masked).toBe('Showing {{0}}-{{1}} & more')
    expect(masked.originals).toEqual(['{{start}}', '{{end}}'])
    expect(unmaskText('Zeigt {{0}}-{{1}} & mehr', masked.originals, masked.offset)).toBe(
      'Zeigt {{start}}-{{end}} & mehr',
    )
  })

  it('tolerates whitespace the translator moved inside a token', () => {
    const masked = maskText('Total: {{price}}', ['{{price}}'])
    expect(unmaskText('Gesamt: {{ 0 }}', masked.originals, masked.offset)).toBe('Gesamt: {{price}}')
  })

  it('numbers tokens above any {{N}} already in the text, so unprotected ones pass through', () => {
    const masked = maskText('Use {{0}} from pack A, dose {{dose}}', ['{{dose}}'])
    expect(masked.offset).toBe(1)
    expect(masked.masked).toBe('Use {{0}} from pack A, dose {{1}}')
    expect(unmaskText('Use {{0}} from pack A, dose {{1}}', masked.originals, masked.offset)).toBe(
      'Use {{0}} from pack A, dose {{dose}}',
    )
  })

  it('drops empty protect entries and matches the longest first', () => {
    const masked = maskText('AB and ABC', ['', 'ABC', 'AB'])
    expect(masked.masked).toBe('{{0}} and {{1}}')
    expect(unmaskText('{{0}} and {{1}}', masked.originals, masked.offset)).toBe('AB and ABC')
  })

  it('returns the text unchanged with nothing to protect', () => {
    const masked = maskText('plain text', [])
    expect(masked).toEqual({ masked: 'plain text', originals: [], offset: 0 })
  })
})

describe('api-ai-translation-amazon', () => {
  it('translates one text: auto source, target, and the detected language back', async () => {
    mockSend.mockResolvedValue({ TranslatedText: 'Hallo, Welt.', SourceLanguageCode: 'en' })
    const result = await createProvider().translate({ text: 'Hello, world.', targetLang: 'de' })
    expect(TranslateTextCommand).toHaveBeenCalledWith({
      Text: 'Hello, world.',
      SourceLanguageCode: 'auto',
      TargetLanguageCode: 'de',
    })
    expect(result).toEqual({
      translations: [{ text: 'Hallo, Welt.', detectedSourceLang: 'en' }],
    })
  })

  it('passes an explicit source language through instead of auto', async () => {
    mockSend.mockResolvedValue({ TranslatedText: 'Hallo', SourceLanguageCode: 'en' })
    await createProvider().translate({ text: 'Hello', sourceLang: 'en', targetLang: 'de' })
    expect(TranslateTextCommand).toHaveBeenCalledWith({
      Text: 'Hello',
      SourceLanguageCode: 'en',
      TargetLanguageCode: 'de',
    })
  })

  it('maps formality onto Settings.Formality', async () => {
    mockSend.mockResolvedValue({ TranslatedText: 'Wie geht es Ihnen?', SourceLanguageCode: 'en' })
    await createProvider().translate({ text: 'How are you?', targetLang: 'de', formality: 'more' })
    await createProvider().translate({
      text: 'How are you?',
      targetLang: 'de',
      formality: 'prefer_less',
    })
    await createProvider().translate({
      text: 'How are you?',
      targetLang: 'de',
      formality: 'default',
    })
    expect(TranslateTextCommand).toHaveBeenNthCalledWith(1, {
      Text: 'How are you?',
      SourceLanguageCode: 'auto',
      TargetLanguageCode: 'de',
      Settings: { Formality: 'FORMAL' },
    })
    expect(TranslateTextCommand).toHaveBeenNthCalledWith(2, {
      Text: 'How are you?',
      SourceLanguageCode: 'auto',
      TargetLanguageCode: 'de',
      Settings: { Formality: 'INFORMAL' },
    })
    expect(TranslateTextCommand).toHaveBeenNthCalledWith(3, {
      Text: 'How are you?',
      SourceLanguageCode: 'auto',
      TargetLanguageCode: 'de',
    })
  })

  it('maps glossaryId onto TerminologyNames and protects placeholders', async () => {
    mockSend.mockResolvedValue({ TranslatedText: '{{0}} Artikel', SourceLanguageCode: 'en' })
    const result = await createProvider().translate({
      text: '{{count}} items',
      targetLang: 'de',
      protect: ['{{count}}'],
      glossaryId: 'my-terms',
    })
    expect(TranslateTextCommand).toHaveBeenCalledWith({
      Text: '{{0}} items',
      SourceLanguageCode: 'auto',
      TargetLanguageCode: 'de',
      TerminologyNames: ['my-terms'],
    })
    expect(result.translations[0].text).toBe('{{count}} Artikel')
  })

  it('translates arrays one call per text, in order', async () => {
    mockSend
      .mockResolvedValueOnce({ TranslatedText: 'Eins', SourceLanguageCode: 'en' })
      .mockResolvedValueOnce({ TranslatedText: 'Zwei', SourceLanguageCode: 'en' })
    const result = await createProvider().translate({ text: ['one', 'two'], targetLang: 'de' })
    expect(mockSend).toHaveBeenCalledTimes(2)
    expect(result.translations.map((t) => t.text)).toEqual(['Eins', 'Zwei'])
  })

  it('refuses an empty text before any upstream call', async () => {
    await expect(createProvider().translate({ text: '', targetLang: 'de' })).rejects.toThrow(
      /non-empty/,
    )
    expect(mockSend).not.toHaveBeenCalled()
  })

  it('refuses a text over 10,000 bytes before any upstream call', async () => {
    const long = 'x'.repeat(10_001)
    await expect(createProvider().translate({ text: long, targetLang: 'de' })).rejects.toThrow(
      /10,000 bytes/,
    )
    expect(mockSend).not.toHaveBeenCalled()
  })

  it('tracks a failed send through trackBondFailure and rethrows', async () => {
    const failure = new Error('TextSizeLimitExceededException')
    mockSend.mockRejectedValue(failure)
    await expect(createProvider().translate({ text: 'hi', targetLang: 'de' })).rejects.toThrow(
      'TextSizeLimitExceededException',
    )
    expect(mockTrackBondFailure).toHaveBeenCalledWith({
      bond: 'ai-translation-amazon',
      operation: 'translate',
      error: failure,
    })
  })

  it('lists languages from the live ListLanguages endpoint', async () => {
    mockSend.mockResolvedValue({
      Languages: [
        { LanguageCode: 'de', LanguageName: 'German' },
        { LanguageCode: 'zh-TW', LanguageName: 'Chinese (Traditional)' },
      ],
    })
    const languages = await createProvider().getSupportedLanguages()
    expect(ListLanguagesCommand).toHaveBeenCalledWith({ DisplayLanguageCode: 'en' })
    expect(languages).toEqual([
      { language: 'de', name: 'German' },
      { language: 'zh-TW', name: 'Chinese (Traditional)' },
    ])
  })

  it('counts characters sent in getUsage, unbounded limit', async () => {
    mockSend.mockResolvedValue({ TranslatedText: 'x', SourceLanguageCode: 'en' })
    const provider = createProvider()
    await provider.translate({ text: '12345', targetLang: 'de' })
    await provider.translate({ text: ['ab', 'cde'], targetLang: 'de' })
    const usage = await provider.getUsage()
    expect(usage.characterCount).toBe(10)
    expect(usage.characterLimit).toBe(Number.POSITIVE_INFINITY)
  })

  it('builds one client per provider and reuses it across calls', async () => {
    mockSend.mockResolvedValue({ TranslatedText: 'x', SourceLanguageCode: 'en' })
    const provider = createProvider()
    await provider.translate({ text: 'a', targetLang: 'de' })
    await provider.translate({ text: 'b', targetLang: 'de' })
    expect(TranslateClient).toHaveBeenCalledTimes(1)
    expect(mockSend).toHaveBeenCalledTimes(2)
  })

  it('resolves the region from config, then AWS_TRANSLATE_REGION, then AWS_REGION, then the default', () => {
    vi.stubEnv('AWS_TRANSLATE_REGION', 'eu-central-1')
    vi.stubEnv('AWS_REGION', 'us-west-2')
    expect(resolveRegion()).toBe('eu-central-1')
    vi.stubEnv('AWS_TRANSLATE_REGION', '')
    expect(resolveRegion()).toBe('us-west-2')
    vi.stubEnv('AWS_REGION', '')
    expect(resolveRegion()).toBe('us-east-1')
    expect(resolveRegion({ region: 'ap-south-1' })).toBe('ap-south-1')
  })
})
