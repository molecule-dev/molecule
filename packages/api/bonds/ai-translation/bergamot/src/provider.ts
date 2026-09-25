/**
 * Bergamot (Firefox Translations) implementation of AITranslationProvider.
 *
 * Runs Mozilla's Firefox Translations models in-process on the CPU through the
 * Bergamot WASM runtime — no API key, no per-character cost, no text leaves the
 * host once the models are downloaded. Firefox publishes English↔X models, so
 * X→Y is translated through English in one engine call (Bergamot's pivoting).
 *
 * @module
 */

import { homedir } from 'node:os'
import { join } from 'node:path'

import type {
  AITranslationProvider,
  SupportedLanguage,
  TranslateParams,
  TranslationResult,
  TranslationUsage,
} from '@molecule/api-ai-translation'

import { createWorkerEngine } from './engine.js'
import { languageName, toBergamotLanguage } from './languages.js'
import {
  findProtected,
  maskHtml,
  maskTokens,
  type ProtectedSpan,
  tokensIntact,
  unmaskHtml,
  unmaskTokens,
} from './protect.js'
import {
  availablePairs,
  DEFAULT_ATTACHMENTS_URL,
  DEFAULT_RECORDS_URL,
  ModelStore,
  selectModelSet,
} from './registry.js'
import type { BergamotConfig, BergamotEngine, BergamotModelSpec } from './types.js'

/** The pivot language every Firefox model pairs with. */
const PIVOT = 'en'

/**
 * Translation provider backed by Firefox Translations models.
 */
class BergamotTranslationProvider implements AITranslationProvider {
  readonly name = 'bergamot'
  private readonly store: ModelStore
  private readonly engine: BergamotEngine
  private charactersTranslated = 0

  /**
   * Creates a Bergamot provider. Nothing is downloaded or started until the first call.
   *
   * @param config - Cache directory, worker count, mirrors.
   */
  constructor(config: BergamotConfig = {}) {
    const cacheDir =
      config.cacheDir ??
      process.env.BERGAMOT_CACHE_DIR ??
      join(homedir(), '.cache', 'molecule', 'bergamot')
    this.store = new ModelStore({
      cacheDir,
      recordsUrl: config.recordsUrl ?? DEFAULT_RECORDS_URL,
      attachmentsUrl: config.attachmentsUrl ?? DEFAULT_ATTACHMENTS_URL,
      recordsMaxAgeMs: config.recordsMaxAgeMs ?? 24 * 60 * 60 * 1000,
      fetch: config.fetch ?? fetch,
    })
    const localRuntime =
      config.wasmPath && config.gluePath
        ? { wasmPath: config.wasmPath, gluePath: config.gluePath }
        : null
    this.engine =
      config.engine ??
      createWorkerEngine({
        runtime: () => (localRuntime ? Promise.resolve(localRuntime) : this.store.ensureRuntime()),
        workers: config.workers ?? (Number(process.env.BERGAMOT_WORKERS) || 1),
        maxLoadedRoutes: config.maxLoadedPairs ?? 4,
      })
  }

  /**
   * Translate one or more texts.
   *
   * @param params - Translation parameters. `sourceLang` defaults to English (there is
   *   no language detection). `formality`, `glossaryId`, `modelType`, `context` and
   *   `preserveFormatting` have no Bergamot equivalent and are ignored; `tagHandling`
   *   ('html' or 'xml') translates the text as markup and keeps its tags.
   * @returns One translation per input, in order.
   * @throws {Error} With `code: 'UNSUPPORTED_LANGUAGE_PAIR'` when Firefox publishes no model for the pair.
   */
  async translate(params: TranslateParams): Promise<TranslationResult> {
    const texts = Array.isArray(params.text) ? params.text : [params.text]
    const source = toBergamotLanguage(params.sourceLang ?? PIVOT)
    const target = toBergamotLanguage(params.targetLang)
    const detectedSourceLang = source
    if (texts.length === 0) return { translations: [] }
    this.charactersTranslated += texts.reduce((sum, text) => sum + text.length, 0)
    if (source === target) {
      return { translations: texts.map((text) => ({ text, detectedSourceLang })) }
    }

    const models = await this.route(source, target)
    const protect = params.protect ?? []
    const callerMarkup = params.tagHandling !== undefined
    const spans = texts.map((text) => findProtected(text, protect))
    const out = new Array<string>(texts.length)

    if (!callerMarkup) {
      // First pass: plain text, protected substrings as ⟦N⟧ tokens.
      const translated = await this.engine.translate({
        models,
        texts: texts.map((text) => maskTokens(text, protect)),
        html: false,
      })
      translated.forEach((text, i) => {
        if (tokensIntact(text, spans[i].length)) out[i] = unmaskTokens(text, spans[i])
      })
    }

    // Second pass (and the only pass for markup): HTML mode, which never drops a tag.
    const retry = texts.map((_, i) => i).filter((i) => out[i] === undefined)
    if (retry.length > 0) {
      const translated = await this.engine.translate({
        models,
        texts: retry.map((i) => maskHtml(texts[i], protect, callerMarkup)),
        html: true,
      })
      retry.forEach((index, k) => {
        out[index] = unmaskHtml(
          translated[k],
          spans[index] as ProtectedSpan[],
          texts[index],
          callerMarkup,
        )
      })
    }

    return { translations: out.map((text) => ({ text, detectedSourceLang })) }
  }

  /**
   * Lists the languages Firefox publishes models for. Any listed source can be
   * translated to any listed target (through English when there is no direct model).
   *
   * @param type - 'source' (languages with a model into English) or 'target'
   *   (languages with a model from English). Defaults to 'source'.
   * @returns Languages with English names, in the model list's codes (`zh-Hans`, `zh-Hant`).
   */
  async getSupportedLanguages(type: 'source' | 'target' = 'source'): Promise<SupportedLanguage[]> {
    const pairs = availablePairs(await this.store.records())
    const codes = new Set<string>([PIVOT])
    for (const [from, to] of pairs) {
      if (type === 'source' && to === PIVOT) codes.add(from)
      if (type === 'target' && from === PIVOT) codes.add(to)
    }
    return [...codes].sort().map((language) => ({ language, name: languageName(language) }))
  }

  /**
   * Characters translated by this process. Self-hosted: there is no limit.
   *
   * @returns Characters since startup, and an unbounded limit.
   */
  async getUsage(): Promise<TranslationUsage> {
    return { characterCount: this.charactersTranslated, characterLimit: Number.POSITIVE_INFINITY }
  }

  /**
   * Finds the model(s) for a pair: a direct model if Firefox has one, else
   * source→English→target. Downloads whatever is not cached yet.
   *
   * @param source - Source language (model-list code).
   * @param target - Target language (model-list code).
   * @returns One or two models, in order.
   * @throws {Error} With `code: 'UNSUPPORTED_LANGUAGE_PAIR'` when a leg has no model.
   */
  private async route(source: string, target: string): Promise<BergamotModelSpec[]> {
    const records = await this.store.records()
    const direct = selectModelSet(records, source, target)
    if (direct) return [await this.store.ensureModel(direct)]
    const first = source === PIVOT ? null : selectModelSet(records, source, PIVOT)
    const second = target === PIVOT ? null : selectModelSet(records, PIVOT, target)
    const missing = [
      source !== PIVOT && !first ? `${source}→${PIVOT}` : null,
      target !== PIVOT && !second ? `${PIVOT}→${target}` : null,
    ].filter(Boolean)
    if (missing.length > 0 || (!first && !second)) {
      throw Object.assign(
        new Error(
          `Bergamot has no model for ${source}→${target} (missing: ${missing.join(', ') || `${source}→${target}`}). ` +
            'Use another translation provider for this language.',
        ),
        { code: 'UNSUPPORTED_LANGUAGE_PAIR', sourceLang: source, targetLang: target },
      )
    }
    return Promise.all(
      [first, second].filter((set) => set !== null).map((set) => this.store.ensureModel(set)),
    )
  }
}

/**
 * Creates a Bergamot translation provider.
 *
 * @param config - Cache directory, worker count, mirrors, or an injected engine.
 * @returns An `AITranslationProvider` backed by Firefox Translations models.
 */
export function createProvider(config?: BergamotConfig): AITranslationProvider {
  return new BergamotTranslationProvider(config)
}

/** Lazily-initialized provider singleton. Defers creation until first use so env vars are read then. */
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
