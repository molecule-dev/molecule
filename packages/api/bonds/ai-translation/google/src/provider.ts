/**
 * Google Cloud Translation implementation of AITranslationProvider.
 *
 * Uses the Cloud Translation API (Basic, v2 REST) with an API key. Requests are
 * always sent as HTML (`format=html`) so `protect` substrings can ride in
 * `translate="no"` spans; plain-text input is escaped on the way in and decoded on
 * the way out, so callers see plain text unless they set `tagHandling`.
 *
 * @module
 */

// Side-effect import: registers this bond's secret definitions so the
// runtime registry is populated even when provider.js is imported directly
// (not through the package barrel).
import './secrets.js'

import type {
  AITranslationProvider,
  SupportedLanguage,
  TranslateParams,
  TranslationResult,
  TranslationUsage,
} from '@molecule/api-ai-translation'

import { maskText, unmaskText } from './protect.js'
import type { GoogleTranslateConfig } from './types.js'

/** Shape of the v2 translate response. */
interface GoogleTranslateResponse {
  data: { translations: Array<{ translatedText: string; detectedSourceLanguage?: string }> }
}

/** Shape of the v2 languages response. */
interface GoogleLanguagesResponse {
  data: { languages: Array<{ language: string; name?: string }> }
}

/** Shape of a Google API error body. */
interface GoogleErrorResponse {
  error?: { message?: string }
}

/** Statuses worth retrying (403 only when it is a rate limit — see `isRetryable`). */
const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504])

/**
 * Google answers bursts with 403 "User Rate Limit Exceeded" as well as 429, so a
 * 403 is retried when its body says rate limit — and a real auth 403 fails at once.
 *
 * @param response - The response to classify.
 * @returns True when the request should be retried.
 */
async function isRetryable(response: Response): Promise<boolean> {
  if (RETRYABLE_STATUS_CODES.has(response.status)) return true
  if (response.status !== 403) return false
  const body = await response.clone().text()
  return /rate ?limit/i.test(body)
}

/** Maximum retry attempts for retryable errors. */
const MAX_RETRIES = 5

/** Maximum `q` entries per request (Cloud Translation v2 limit). */
const MAX_TEXTS_PER_REQUEST = 128

/** Stay well under the v2 request-size limit; long batches are split by characters too. */
const MAX_CHARS_PER_REQUEST = 25_000

/**
 * Google Cloud Translation provider implementing `AITranslationProvider`.
 */
class GoogleTranslationProvider implements AITranslationProvider {
  readonly name = 'google'
  private apiKey: string
  private baseUrl: string
  /** Characters sent by this process — Google has no usage endpoint. */
  private charactersSent = 0

  /**
   * Creates a new Google Cloud Translation provider.
   *
   * @param config - Provider configuration. API key defaults to GOOGLE_TRANSLATE_API_KEY.
   */
  constructor(config: GoogleTranslateConfig = {}) {
    this.apiKey = config.apiKey ?? process.env.GOOGLE_TRANSLATE_API_KEY ?? ''
    this.baseUrl =
      config.baseUrl ??
      process.env.GOOGLE_TRANSLATE_BASE_URL ??
      'https://translation.googleapis.com'
  }

  /**
   * Translate one or more texts, batching by count and size.
   *
   * @param params - Translation parameters. `formality`, `glossaryId`, `modelType`,
   *   `context` and `preserveFormatting` have no v2 equivalent and are ignored.
   * @returns One translation per input text, in order.
   */
  async translate(params: TranslateParams): Promise<TranslationResult> {
    const texts = Array.isArray(params.text) ? params.text : [params.text]
    const translations: TranslationResult['translations'] = []

    let batch: string[] = []
    let batchChars = 0
    for (const text of texts) {
      if (
        batch.length > 0 &&
        (batch.length >= MAX_TEXTS_PER_REQUEST || batchChars + text.length > MAX_CHARS_PER_REQUEST)
      ) {
        translations.push(...(await this.callTranslate(batch, params)))
        batch = []
        batchChars = 0
      }
      batch.push(text)
      batchChars += text.length
    }
    if (batch.length > 0) translations.push(...(await this.callTranslate(batch, params)))

    return { translations }
  }

  /**
   * List the languages Google translates, named in English.
   *
   * @param _type - Ignored: Google's source and target lists are the same.
   * @returns Supported languages (BCP-47-style codes such as 'de', 'zh-TW').
   */
  async getSupportedLanguages(_type?: 'source' | 'target'): Promise<SupportedLanguage[]> {
    const url = new URL('/language/translate/v2/languages', this.baseUrl)
    url.searchParams.set('key', this.apiKey)
    url.searchParams.set('target', 'en')

    const response = await this.fetchWithRetry(url.toString(), { method: 'GET' })
    if (!response.ok) throw await this.buildError('languages', response)

    const data = (await response.json()) as GoogleLanguagesResponse
    return data.data.languages.map((lang) => ({
      language: lang.language,
      name: lang.name ?? lang.language,
    }))
  }

  /**
   * Google exposes no usage endpoint; this reports what THIS process has sent.
   *
   * @returns Characters sent since startup, and an unbounded limit.
   */
  async getUsage(): Promise<TranslationUsage> {
    return { characterCount: this.charactersSent, characterLimit: Number.POSITIVE_INFINITY }
  }

  /**
   * One request to the v2 translate endpoint.
   *
   * @param texts - Texts for this batch.
   * @param params - Translation parameters.
   * @returns Translations for this batch, in order.
   */
  private async callTranslate(
    texts: string[],
    params: TranslateParams,
  ): Promise<TranslationResult['translations']> {
    const callerMarkup = params.tagHandling !== undefined
    const masked = texts.map((text) => maskText(text, params.protect ?? [], callerMarkup))

    const url = new URL('/language/translate/v2', this.baseUrl)
    url.searchParams.set('key', this.apiKey)
    const body: Record<string, unknown> = {
      q: masked.map((m) => m.masked),
      target: params.targetLang,
      format: 'html',
    }
    if (params.sourceLang) body.source = params.sourceLang

    const response = await this.fetchWithRetry(url.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!response.ok) throw await this.buildError('translate', response)

    this.charactersSent += texts.reduce((sum, text) => sum + text.length, 0)
    const data = (await response.json()) as GoogleTranslateResponse
    return data.data.translations.map((t, i) => ({
      text: unmaskText(t.translatedText, masked[i].originals, callerMarkup),
      detectedSourceLang: t.detectedSourceLanguage ?? params.sourceLang ?? '',
    }))
  }

  /**
   * Fetch with exponential backoff on rate-limit and server errors.
   *
   * @param url - The URL to fetch.
   * @param init - Fetch request options.
   * @returns The final response.
   */
  private async fetchWithRetry(url: string, init: RequestInit): Promise<Response> {
    let response: Response | null = null
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      response = await fetch(url, init)
      if (attempt < MAX_RETRIES && (await isRetryable(response))) {
        await new Promise<void>((resolve) =>
          setTimeout(resolve, Math.min(1000 * 2 ** attempt, 30_000)),
        )
        continue
      }
      break
    }
    return response!
  }

  /**
   * Builds an error from a failed response, carrying the HTTP status.
   *
   * @param endpoint - The endpoint name (for the message).
   * @param response - The failed response.
   * @returns An Error with a `status` property.
   */
  private async buildError(endpoint: string, response: Response): Promise<Error> {
    const errorBody = await response.text()
    let detail = `HTTP ${response.status}`
    try {
      const parsed = JSON.parse(errorBody) as GoogleErrorResponse
      if (parsed.error?.message) detail = parsed.error.message
    } catch (_error) {
      // JSON.parse failed — error body is not JSON; fall back to raw text if short enough.
      if (errorBody.length > 0 && errorBody.length < 200) detail = errorBody
    }
    return Object.assign(
      new Error(`Google Translate ${endpoint} API error (${response.status}): ${detail}`),
      { status: response.status },
    )
  }
}

/**
 * Creates a Google Cloud Translation provider instance.
 *
 * @param config - Google-specific configuration (API key, base URL).
 * @returns An `AITranslationProvider` backed by the Cloud Translation API.
 */
export function createProvider(config?: GoogleTranslateConfig): AITranslationProvider {
  return new GoogleTranslationProvider(config)
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
