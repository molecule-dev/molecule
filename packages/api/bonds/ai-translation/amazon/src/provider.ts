/**
 * Amazon Translate implementation of AITranslationProvider.
 *
 * Uses the Amazon Translate `TranslateText` API (one text per call — the API
 * takes a single string) through the AWS SDK v3, which retries throttling and
 * transient errors with its own backoff.
 *
 * @module
 */

// Side-effect import: registers this bond's secret definitions so the
// runtime registry is populated even when provider.js is imported directly
// (not through the package barrel).
import './secrets.js'
import {
  ListLanguagesCommand,
  TranslateClient,
  TranslateTextCommand,
} from '@aws-sdk/client-translate'
import { defaultProvider } from '@aws-sdk/credential-provider-node'

import type {
  AITranslationProvider,
  SupportedLanguage,
  TranslateParams,
  TranslationResult,
  TranslationUsage,
} from '@molecule/api-ai-translation'
import { trackBondFailure } from '@molecule/api-analytics'
import { getLogger } from '@molecule/api-bond'
import { getProxyAgents } from '@molecule/api-proxy-agent'

import { maskText, unmaskText } from './protect.js'
import type { AmazonTranslateConfig } from './types.js'

const logger = getLogger()

/**
 * Maximum `TranslateParams.text` length per call (AWS: "The text string can be
 * a maximum of 10,000 bytes long. Depending on your character set, this may be
 * fewer than 10,000 characters") — enforced locally so an oversized text fails
 * before any upstream call.
 */
const MAX_BYTES_PER_TEXT = 10_000

/**
 * Resolves the region at CLIENT-CONSTRUCTION time, not import time, so a
 * region resolved into `process.env` after this module loads (late secrets
 * resolution via a secrets bond) is honored — the SES bond's lesson.
 *
 * @param config - Explicit config, when the provider was created with one.
 * @returns The region to call Amazon Translate in.
 */
export function resolveRegion(config?: AmazonTranslateConfig): string {
  return (
    config?.region ?? (process.env.AWS_TRANSLATE_REGION || process.env.AWS_REGION || 'us-east-1')
  )
}

/**
 * Builds a Translate client from a config (or the environment when omitted).
 *
 * The AWS SDK v3 builds its own `https.Agent` and reads no proxy variable, so
 * on a host whose only egress path is a proxy every call fails with a bare
 * connection error unless the agent is passed in via `requestHandler` — the
 * SES bond's fix, mirrored here.
 *
 * @param config - Explicit config. Omitted keys fall back to the environment.
 * @returns The configured client.
 */
export function buildTranslateClient(config?: AmazonTranslateConfig): TranslateClient {
  const region = resolveRegion(config)
  const endpoint = config?.endpoint ?? process.env.AWS_TRANSLATE_ENDPOINT
  const credentials = config?.credentials
  const proxy = getProxyAgents(endpoint || `https://translate.${region}.amazonaws.com`)
  return new TranslateClient({
    region,
    ...(credentials ? { credentials } : { credentialDefaultProvider: defaultProvider }),
    ...(endpoint ? { endpoint } : {}),
    ...(proxy ? { requestHandler: proxy } : {}),
  })
}

/**
 * Maps the core's formality preference onto Amazon Translate's `Settings.Formality`.
 *
 * @param formality - The caller's formality preference.
 * @returns `FORMAL`, `INFORMAL`, or undefined when Amazon should pick (and for
 *   languages where formality does not apply, Amazon rejects the setting).
 */
function formalitySetting(
  formality: TranslateParams['formality'],
): 'FORMAL' | 'INFORMAL' | undefined {
  switch (formality) {
    case 'more':
    case 'prefer_more':
      return 'FORMAL'
    case 'less':
    case 'prefer_less':
      return 'INFORMAL'
    default:
      return undefined
  }
}

/**
 * Amazon Translate provider implementing `AITranslationProvider`.
 */
class AmazonTranslationProvider implements AITranslationProvider {
  readonly name = 'amazon'

  /** Built on first use — NOT at construction — and memoized. */
  private client: TranslateClient | null = null

  private readonly config?: AmazonTranslateConfig

  /** Characters sent by this process — Amazon has no usage endpoint. */
  private charactersSent = 0

  constructor(config?: AmazonTranslateConfig) {
    this.config = config
  }

  /**
   * Returns the memoized client, building it from config/environment on first use.
   *
   * @returns The configured Translate client.
   */
  private getClient(): TranslateClient {
    if (!this.client) this.client = buildTranslateClient(this.config)
    return this.client
  }

  /**
   * Translate one or more texts, one TranslateText call per text.
   *
   * @param params - Translation parameters. `preserveFormatting`, `tagHandling`,
   *   `context` and `modelType` have no TranslateText equivalent and are ignored.
   * @returns One translation per input text, in order.
   */
  async translate(params: TranslateParams): Promise<TranslationResult> {
    const texts = Array.isArray(params.text) ? params.text : [params.text]
    const translations: TranslationResult['translations'] = []
    for (const text of texts) {
      translations.push(await this.translateOne(text, params))
    }
    return { translations }
  }

  /**
   * List the languages Amazon Translate translates, named in English.
   *
   * @param _type - Ignored: Amazon's source and target lists are the same.
   * @returns Supported languages (Amazon's codes, e.g. 'de', 'zh-TW').
   */
  async getSupportedLanguages(_type?: 'source' | 'target'): Promise<SupportedLanguage[]> {
    const response = await this.getClient().send(
      new ListLanguagesCommand({ DisplayLanguageCode: 'en' }),
    )
    return (response.Languages ?? []).map((language) => ({
      language: language.LanguageCode ?? '',
      name: language.LanguageName ?? language.LanguageCode ?? '',
    }))
  }

  /**
   * Amazon exposes no usage endpoint; this reports what THIS process has sent.
   *
   * @returns Characters sent since startup, and an unbounded limit.
   */
  async getUsage(): Promise<TranslationUsage> {
    return { characterCount: this.charactersSent, characterLimit: Number.POSITIVE_INFINITY }
  }

  /**
   * One TranslateText call.
   *
   * @param text - One caller text (plain text — see the bond's remarks).
   * @param params - Translation parameters.
   * @returns The translation with its detected source language.
   */
  private async translateOne(
    text: string,
    params: TranslateParams,
  ): Promise<TranslationResult['translations'][number]> {
    if (text.length === 0) throw new Error('Amazon Translate needs a non-empty text per call.')
    if (Buffer.byteLength(text, 'utf8') > MAX_BYTES_PER_TEXT) {
      throw new Error(
        `Amazon Translate accepts up to 10,000 bytes of text per call, got ${Buffer.byteLength(text, 'utf8')} bytes. ` +
          'Split the text and call again (TranslateText takes ONE text per call).',
      )
    }
    const masked = maskText(text, params.protect ?? [])
    const formality = formalitySetting(params.formality)
    try {
      const response = await this.getClient().send(
        new TranslateTextCommand({
          Text: masked.masked,
          SourceLanguageCode: params.sourceLang ?? 'auto',
          TargetLanguageCode: params.targetLang,
          ...(formality ? { Settings: { Formality: formality } } : {}),
          ...(params.glossaryId ? { TerminologyNames: [params.glossaryId] } : {}),
        }),
      )
      this.charactersSent += text.length
      return {
        text: unmaskText(response.TranslatedText ?? '', masked.originals, masked.offset),
        detectedSourceLang: response.SourceLanguageCode ?? params.sourceLang ?? '',
      }
    } catch (error) {
      trackBondFailure({ bond: 'ai-translation-amazon', operation: 'translate', error })
      logger.error('Amazon Translate error:', error)
      throw error
    }
  }
}

/**
 * Creates an Amazon Translate provider instance.
 *
 * @param config - AWS-specific configuration (region, endpoint, credentials).
 * @returns An `AITranslationProvider` backed by Amazon Translate.
 */
export function createProvider(config?: AmazonTranslateConfig): AITranslationProvider {
  return new AmazonTranslationProvider(config)
}

/** Lazily-initialized provider singleton. Defers creation until first use so that env vars / secrets are resolved. */
let _provider: AITranslationProvider | null = null
/**
 * The provider implementation.
 */
export const provider: AITranslationProvider = new Proxy({} as AITranslationProvider, {
  get(_, prop, receiver) {
    if (!_provider) _provider = createProvider()
    return Reflect.get(_provider, prop, receiver)
  },
  // set trap: methods run with `this` bound to the proxy — without it, instance-state writes land on the dummy target and are lost (see api-push-notifications-web-push)
  set(_, prop, value) {
    if (!_provider) _provider = createProvider()
    return Reflect.set(_provider, prop, value)
  },
})
