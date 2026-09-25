/**
 * molecule.dev hosted implementation of AITranslationProvider.
 *
 * Calls `POST <servicesUrl>/translation/translate` with the project's API key.
 * The request and response ARE the `@molecule/api-ai-translation` core's types,
 * so this bond is a thin, typed client: molecule.dev does the translating and
 * meters it per character to the project the key belongs to.
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

import type { MoleculeTranslationConfig } from './types.js'

/** Default hosted services base URL. */
const DEFAULT_SERVICES_URL = 'https://api.molecule.dev/api/v1/services'

/**
 * Languages offered in pickers. The hosted service translates with a language
 * model, which handles far more; this is the set worth listing.
 */
const LANGUAGE_CODES = [
  'af',
  'am',
  'ar',
  'az',
  'be',
  'bg',
  'bn',
  'bs',
  'ca',
  'cs',
  'cy',
  'da',
  'de',
  'el',
  'en',
  'es',
  'et',
  'eu',
  'fa',
  'fi',
  'fil',
  'fr',
  'ga',
  'gl',
  'gu',
  'ha',
  'he',
  'hi',
  'hr',
  'hu',
  'hy',
  'id',
  'ig',
  'is',
  'it',
  'ja',
  'ka',
  'kk',
  'km',
  'kn',
  'ko',
  'ky',
  'lo',
  'lt',
  'lv',
  'mk',
  'ml',
  'mn',
  'mr',
  'ms',
  'mt',
  'my',
  'nb',
  'ne',
  'nl',
  'pa',
  'pl',
  'pt',
  'pt-BR',
  'ro',
  'ru',
  'si',
  'sk',
  'sl',
  'sq',
  'sr',
  'sv',
  'sw',
  'ta',
  'te',
  'th',
  'tr',
  'uk',
  'ur',
  'uz',
  'vi',
  'yo',
  'zh',
  'zh-TW',
  'zu',
]

/** Shape of an error body from the hosted services endpoint. */
interface ServiceErrorBody {
  error?: string
  errorKey?: string
}

/**
 * Translation provider backed by molecule.dev's hosted translation service.
 */
class MoleculeTranslationProvider implements AITranslationProvider {
  readonly name = 'molecule'
  private readonly apiKey: string
  private readonly servicesUrl: string
  private readonly timeoutMs: number
  private charactersSent = 0

  /**
   * Creates a new molecule.dev translation provider.
   *
   * @param config - API key, services URL and timeout; each falls back to env.
   */
  constructor(config: MoleculeTranslationConfig = {}) {
    this.apiKey = config.apiKey ?? process.env.MOLECULE_API_KEY ?? ''
    this.servicesUrl = (
      config.servicesUrl ??
      process.env.MOLECULE_SERVICES_URL ??
      DEFAULT_SERVICES_URL
    ).replace(/\/+$/, '')
    this.timeoutMs = config.timeoutMs ?? 120_000
  }

  /**
   * Translate one or more texts on molecule.dev.
   *
   * @param params - `text`, `targetLang`, and optionally `sourceLang`, `protect`
   *   and `context`. Other fields are not sent (the service ignores them).
   * @returns One translation per input, in order.
   */
  async translate(params: TranslateParams): Promise<TranslationResult> {
    if (!this.apiKey) {
      throw Object.assign(
        new Error(
          'MOLECULE_API_KEY is not set — create a project key with `mlcl apikey create` and put it in .env.',
        ),
        { errorKey: 'aiTranslationMolecule.error.missingKey' },
      )
    }
    const body = {
      text: params.text,
      targetLang: params.targetLang,
      ...(params.sourceLang ? { sourceLang: params.sourceLang } : {}),
      ...(params.protect?.length ? { protect: params.protect } : {}),
      ...(params.context ? { context: params.context } : {}),
    }
    const response = await fetch(`${this.servicesUrl}/translation/translate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(this.timeoutMs),
    })
    if (!response.ok) {
      const text = await response.text()
      let parsed: ServiceErrorBody = {}
      try {
        parsed = JSON.parse(text) as ServiceErrorBody
      } catch (_error) {
        // Not JSON (a proxy's HTML error page) — the raw text becomes the message below.
      }
      throw Object.assign(
        new Error(
          `molecule.dev translation error (${response.status}): ${parsed.error ?? (text.slice(0, 200) || 'no details')}`,
        ),
        { status: response.status, errorKey: parsed.errorKey },
      )
    }
    const texts = Array.isArray(params.text) ? params.text : [params.text]
    this.charactersSent += texts.reduce((sum, text) => sum + text.length, 0)
    return (await response.json()) as TranslationResult
  }

  /**
   * Names the languages this provider offers in pickers.
   *
   * @param _type - Ignored: the service translates in both directions.
   * @returns Languages with English names.
   */
  async getSupportedLanguages(_type?: 'source' | 'target'): Promise<SupportedLanguage[]> {
    const names = new Intl.DisplayNames(['en'], { type: 'language' })
    return LANGUAGE_CODES.map((language) => ({
      language,
      name: names.of(language) ?? language,
    }))
  }

  /**
   * Characters this process sent. Spend is metered on molecule.dev per project;
   * see the project's usage page for the billed total.
   *
   * @returns Characters sent since startup, and an unbounded limit.
   */
  async getUsage(): Promise<TranslationUsage> {
    return { characterCount: this.charactersSent, characterLimit: Number.POSITIVE_INFINITY }
  }
}

/**
 * Creates a molecule.dev hosted translation provider.
 *
 * @param config - API key, services URL and timeout; each falls back to env.
 * @returns An `AITranslationProvider` backed by molecule.dev.
 */
export function createProvider(config?: MoleculeTranslationConfig): AITranslationProvider {
  return new MoleculeTranslationProvider(config)
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
