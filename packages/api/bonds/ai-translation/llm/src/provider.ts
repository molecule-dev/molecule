/**
 * Language-model implementation of AITranslationProvider.
 *
 * Translates through any `@molecule/api-ai` provider — a hosted model
 * (DeepSeek, Qwen, GPT, Claude, …) or a self-hosted one behind
 * `@molecule/api-ai-local` (vLLM, Ollama, llama.cpp). Texts are sent in JSON
 * batches; protected substrings travel as numbered tokens and are restored by
 * index. A batch whose answer is malformed, or whose tokens do not survive, is
 * retried in smaller pieces, down to one text per request.
 *
 * @module
 */

import type { AIProvider } from '@molecule/api-ai'
import { requireProvider as requireAiProvider } from '@molecule/api-ai'
import type {
  AITranslationProvider,
  SupportedLanguage,
  TranslateParams,
  TranslationResult,
  TranslationUsage,
} from '@molecule/api-ai-translation'

import { languageName, parseTranslations, systemPrompt } from './prompt.js'
import { type MaskedText, maskText, tokensIntact, unmaskText } from './protect.js'
import type { LlmTranslationConfig } from './types.js'

/**
 * Language codes reported by `getSupportedLanguages`. A language model can
 * translate far more; this is the set it is reasonable to offer in a picker.
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

/**
 * Translation provider backed by a language model.
 */
class LlmTranslationProvider implements AITranslationProvider {
  readonly name = 'llm'
  private charactersSent = 0

  /**
   * Creates a new language-model translation provider.
   *
   * @param config - Which AI provider/model to use, batch size, extra instructions.
   */
  constructor(private readonly config: LlmTranslationConfig = {}) {}

  /**
   * Translate one or more texts.
   *
   * @param params - Translation parameters. `formality`, `glossaryId`, `modelType`,
   *   `preserveFormatting` and `tagHandling` have no model equivalent and are
   *   ignored; put terminology in `context` or the config's `instructions`.
   * @returns One translation per input, in order. A text the model could not
   *   translate with its protected substrings intact comes back as the model's
   *   last attempt — callers must still check it (see the package remarks).
   */
  async translate(params: TranslateParams): Promise<TranslationResult> {
    const texts = Array.isArray(params.text) ? params.text : [params.text]
    const masked = texts.map((text) => maskText(text, params.protect ?? []))
    const out = new Array<string>(texts.length)
    const batchSize = Math.max(1, this.config.batchSize ?? 40)

    for (let i = 0; i < texts.length; i += batchSize) {
      const indices = Array.from({ length: Math.min(batchSize, texts.length - i) }, (_, k) => i + k)
      await this.translateIndices(indices, masked, out, params)
    }

    this.charactersSent += texts.reduce((sum, text) => sum + text.length, 0)
    return {
      translations: out.map((text) => ({
        text,
        detectedSourceLang: params.sourceLang ?? '',
      })),
    }
  }

  /**
   * Names the languages this provider offers in pickers.
   *
   * @param _type - Ignored: a model translates in both directions.
   * @returns Languages with English names.
   */
  async getSupportedLanguages(_type?: 'source' | 'target'): Promise<SupportedLanguage[]> {
    return LANGUAGE_CODES.map((language) => ({ language, name: languageName(language) }))
  }

  /**
   * Characters translated by this process. Model spend is metered by the AI
   * provider in tokens, so there is no character limit.
   *
   * @returns Characters sent since startup, and an unbounded limit.
   */
  async getUsage(): Promise<TranslationUsage> {
    return { characterCount: this.charactersSent, characterLimit: Number.POSITIVE_INFINITY }
  }

  /**
   * Translates the texts at `indices`, splitting the request in half whenever
   * the answer is malformed or a text loses its tokens.
   *
   * @param indices - Positions in `masked`/`out` to translate.
   * @param masked - All masked texts.
   * @param out - Results, filled in place.
   * @param params - The caller's parameters.
   */
  private async translateIndices(
    indices: number[],
    masked: MaskedText[],
    out: string[],
    params: TranslateParams,
  ): Promise<void> {
    if (indices.length === 0) return
    const answer = parseTranslations(
      await this.ask(
        indices.map((i) => masked[i].masked),
        params,
      ),
      indices.length,
    )

    const failed: number[] = []
    indices.forEach((index, k) => {
      const translated = answer?.[k]
      if (translated !== undefined && tokensIntact(translated, masked[index].originals)) {
        out[index] = unmaskText(translated, masked[index].originals)
      } else {
        failed.push(index)
        // Keep the best attempt so a text that never succeeds still has an answer.
        if (translated !== undefined) out[index] = unmaskText(translated, masked[index].originals)
      }
    })

    if (failed.length === 0) return
    if (failed.length === 1 && indices.length === 1) {
      // Already down to one text: one more try, then keep whatever came back.
      const retry = parseTranslations(await this.ask([masked[failed[0]].masked], params), 1)
      if (retry) out[failed[0]] = unmaskText(retry[0], masked[failed[0]].originals)
      out[failed[0]] ??= masked[failed[0]].masked
      return
    }
    const half = Math.ceil(failed.length / 2)
    await this.translateIndices(failed.slice(0, half), masked, out, params)
    await this.translateIndices(failed.slice(half), masked, out, params)
  }

  /**
   * Sends one batch to the model and returns its full text answer.
   *
   * @param strings - Masked texts for this request.
   * @param params - The caller's parameters.
   * @returns The model's text output.
   */
  private async ask(strings: string[], params: TranslateParams): Promise<string> {
    const ai: AIProvider = this.config.ai ?? requireAiProvider()
    let answer = ''
    for await (const event of ai.chat({
      system: systemPrompt(
        params.targetLang,
        params.sourceLang,
        params.context,
        this.config.instructions,
      ),
      messages: [{ role: 'user', content: JSON.stringify({ strings }) }],
      model: this.config.model,
      temperature: this.config.temperature ?? 0,
      maxTokens: Math.max(1024, strings.join('').length * 4),
    })) {
      if (event.type === 'text') answer += event.content
      else if (event.type === 'error') {
        throw Object.assign(new Error(`Translation model error: ${event.message}`), {
          errorKey: event.errorKey,
        })
      }
    }
    return answer
  }
}

/**
 * Creates a language-model translation provider.
 *
 * @param config - Which AI provider/model to use and how to batch.
 * @returns An `AITranslationProvider` backed by a language model.
 */
export function createProvider(config?: LlmTranslationConfig): AITranslationProvider {
  return new LlmTranslationProvider(config)
}

/** Lazily-initialized provider singleton, using the bonded `ai` provider on first use. */
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
