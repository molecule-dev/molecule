/**
 * DeepL implementation of AITranslationProvider.
 *
 * Uses the DeepL REST API v2 to translate text, list supported languages,
 * and retrieve usage statistics. Supports both free and pro API keys with
 * automatic base URL detection and retry with exponential backoff.
 *
 * @module
 */

import type {
  AITranslationProvider,
  SupportedLanguage,
  TranslateParams,
  TranslationResult,
  TranslationUsage,
} from '@molecule/api-ai-translation'

import type { DeeplConfig } from './types.js'

/** Shape of a single translation in the DeepL API response. */
interface DeepLTranslation {
  detected_source_language: string
  text: string
}

/** Shape of the DeepL /v2/translate response. */
interface DeepLTranslateResponse {
  translations: DeepLTranslation[]
}

/** Shape of a language entry in the DeepL /v2/languages response. */
interface DeepLLanguage {
  language: string
  name: string
  supports_formality?: boolean
}

/** Shape of the DeepL /v2/usage response. */
interface DeepLUsageResponse {
  character_count: number
  character_limit: number
}

/** Shape of a DeepL API error response. */
interface DeepLErrorResponse {
  message?: string
}

/** HTTP status codes that are retryable. */
const RETRYABLE_STATUS_CODES = new Set([429, 503, 529])

/** Maximum number of retry attempts for retryable errors. */
const MAX_RETRIES = 3

/** Maximum number of texts per translate request (DeepL API limit). */
const MAX_TEXTS_PER_REQUEST = 50

/**
 * Detects whether a DeepL API key is a free-tier key.
 *
 * @param apiKey - The DeepL API key.
 * @returns True if the key is a free-tier key (ends with ':fx').
 */
function isFreeKey(apiKey: string): boolean {
  return apiKey.endsWith(':fx')
}

/**
 * DeepL translation provider that implements the `AITranslationProvider` interface
 * using the DeepL REST API v2.
 */
class DeeplTranslationProvider implements AITranslationProvider {
  readonly name = 'deepl'
  private apiKey: string
  private baseUrl: string
  private defaultFormality: string
  private defaultModelType: string

  /**
   * Creates a new DeepL translation provider.
   *
   * @param config - Provider configuration. API key defaults to DEEPL_API_KEY env var.
   */
  constructor(config: DeeplConfig = {}) {
    this.apiKey = config.apiKey ?? process.env.DEEPL_API_KEY ?? ''
    this.defaultFormality = config.defaultFormality ?? 'default'
    this.defaultModelType = config.defaultModelType ?? 'latency_optimized'

    if (config.baseUrl) {
      this.baseUrl = config.baseUrl
    } else {
      this.baseUrl = isFreeKey(this.apiKey) ? 'https://api-free.deepl.com' : 'https://api.deepl.com'
    }
  }

  /**
   * Translate one or more texts to a target language via the DeepL API.
   *
   * Automatically splits large input arrays into batches of 50 (the DeepL limit).
   *
   * @param params - Translation parameters including text(s) and target language.
   * @returns Translation results with detected source languages.
   */
  async translate(params: TranslateParams): Promise<TranslationResult> {
    const texts = Array.isArray(params.text) ? params.text : [params.text]

    if (texts.length === 0) {
      return { translations: [] }
    }

    if (texts.length > MAX_TEXTS_PER_REQUEST) {
      return this.translateBatched(texts, params)
    }

    return this.callTranslate(texts, params)
  }

  /**
   * Get the list of languages supported by DeepL.
   *
   * @param type - Whether to list 'source' or 'target' languages. Defaults to 'source'.
   * @returns Array of supported languages with formality support metadata.
   */
  async getSupportedLanguages(type?: 'source' | 'target'): Promise<SupportedLanguage[]> {
    const url = new URL('/v2/languages', this.baseUrl)
    if (type) {
      url.searchParams.set('type', type)
    }

    const response = await this.fetchWithRetry(url.toString(), {
      method: 'GET',
      headers: this.buildHeaders(),
    })

    if (!response.ok) {
      throw await this.buildError('languages', response)
    }

    const data = (await response.json()) as DeepLLanguage[]

    return data.map((lang) => ({
      language: lang.language,
      name: lang.name,
      supportsFormality: lang.supports_formality,
    }))
  }

  /**
   * Get current API usage statistics from DeepL.
   *
   * @returns Character count and limit for the current billing period.
   */
  async getUsage(): Promise<TranslationUsage> {
    const response = await this.fetchWithRetry(`${this.baseUrl}/v2/usage`, {
      method: 'GET',
      headers: this.buildHeaders(),
    })

    if (!response.ok) {
      throw await this.buildError('usage', response)
    }

    const data = (await response.json()) as DeepLUsageResponse

    return {
      characterCount: data.character_count,
      characterLimit: data.character_limit,
    }
  }

  /**
   * Handles text arrays exceeding 50 items by splitting into batches.
   *
   * @param texts - All input texts.
   * @param params - Original translate params (minus text, which is replaced per batch).
   * @returns Aggregated translation result.
   */
  private async translateBatched(
    texts: string[],
    params: TranslateParams,
  ): Promise<TranslationResult> {
    const allTranslations: TranslationResult['translations'] = []

    for (let i = 0; i < texts.length; i += MAX_TEXTS_PER_REQUEST) {
      const batch = texts.slice(i, i + MAX_TEXTS_PER_REQUEST)
      const result = await this.callTranslate(batch, params)
      allTranslations.push(...result.translations)
    }

    return { translations: allTranslations }
  }

  /**
   * Makes a single call to the DeepL /v2/translate endpoint.
   *
   * @param texts - Array of texts to translate (max 50).
   * @param params - Translation parameters.
   * @returns Parsed translation result.
   */
  private async callTranslate(
    texts: string[],
    params: TranslateParams,
  ): Promise<TranslationResult> {
    const body: Record<string, unknown> = {
      text: texts,
      target_lang: params.targetLang,
    }

    if (params.sourceLang) {
      body.source_lang = params.sourceLang
    }

    const formality = params.formality ?? this.defaultFormality
    if (formality !== 'default') {
      body.formality = formality
    }

    const modelType = params.modelType ?? this.defaultModelType
    if (modelType !== 'latency_optimized') {
      body.model_type = modelType
    }

    if (params.preserveFormatting !== undefined) {
      body.preserve_formatting = params.preserveFormatting
    }

    if (params.glossaryId) {
      body.glossary_id = params.glossaryId
    }

    if (params.tagHandling) {
      body.tag_handling = params.tagHandling
    }

    if (params.context) {
      body.context = params.context
    }

    const response = await this.fetchWithRetry(`${this.baseUrl}/v2/translate`, {
      method: 'POST',
      headers: {
        ...this.buildHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      throw await this.buildError('translate', response)
    }

    const data = (await response.json()) as DeepLTranslateResponse

    return {
      translations: data.translations.map((t) => ({
        text: t.text,
        detectedSourceLang: t.detected_source_language,
      })),
    }
  }

  /**
   * Builds the authorization headers for DeepL API requests.
   *
   * @returns Headers object with the DeepL auth key.
   */
  private buildHeaders(): Record<string, string> {
    return {
      Authorization: `DeepL-Auth-Key ${this.apiKey}`,
    }
  }

  /**
   * Executes a fetch request with retry logic for rate-limit and server errors.
   *
   * Uses exponential backoff with jitter, respecting the Retry-After header when present.
   *
   * @param url - The URL to fetch.
   * @param init - Fetch request options.
   * @returns The final fetch response.
   */
  private async fetchWithRetry(url: string, init: RequestInit): Promise<Response> {
    let response: Response | null = null

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      response = await fetch(url, init)

      if (RETRYABLE_STATUS_CODES.has(response.status) && attempt < MAX_RETRIES) {
        const retryAfter = response.headers.get('retry-after')
        const delayMs = retryAfter
          ? Math.min(parseInt(retryAfter, 10) * 1000, 60_000)
          : Math.min(1000 * 2 ** attempt, 30_000)
        await new Promise<void>((resolve) => setTimeout(resolve, delayMs))
        continue
      }

      break
    }

    return response!
  }

  /**
   * Builds a descriptive error from a failed DeepL API response.
   *
   * @param endpoint - The endpoint name (for the error message).
   * @param response - The failed fetch response.
   * @returns An Error with a descriptive message.
   */
  private async buildError(endpoint: string, response: Response): Promise<Error> {
    const errorBody = await response.text()
    let detail = `HTTP ${response.status}`

    try {
      const parsed = JSON.parse(errorBody) as DeepLErrorResponse
      if (parsed.message) detail = parsed.message
    } catch {
      if (errorBody.length > 0 && errorBody.length < 200) detail = errorBody
    }

    return new Error(`DeepL ${endpoint} API error: ${detail}`)
  }
}

/**
 * Creates a DeepL translation provider instance.
 *
 * @param config - DeepL-specific configuration (API key, base URL, defaults).
 * @returns An `AITranslationProvider` backed by the DeepL REST API.
 */
export function createProvider(config?: DeeplConfig): AITranslationProvider {
  return new DeeplTranslationProvider(config)
}
