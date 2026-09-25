/**
 * MADLAD-400 implementation of AITranslationProvider.
 *
 * Google's MADLAD-400 model runs in CTranslate2, which has no Node binding, so
 * the model lives in a small HTTP sidecar (`sidecar/server.py`, shipped with
 * this package) and this provider talks to it. Any host running the sidecar
 * works — a container next to the API, a GPU box, a shared service.
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

import { languageName, toMadladLanguage } from './languages.js'
import {
  assemblePieces,
  isTranslatable,
  MARKER_FORMS,
  markersIntact,
  maskWith,
  splitProtected,
  unmaskWith,
} from './protect.js'
import type { MadladConfig } from './types.js'

/** HTTP statuses worth retrying (sidecar restarting, proxy hiccup). */
const RETRYABLE_STATUS_CODES = new Set([502, 503, 504])

/** Retries after the first attempt. */
const MAX_RETRIES = 3

/** Shape of an error body from the sidecar. */
interface SidecarError {
  error?: string
}

/**
 * Translation provider backed by a MADLAD-400 sidecar.
 */
class MadladTranslationProvider implements AITranslationProvider {
  readonly name = 'madlad'
  private readonly baseUrl: string
  private readonly apiKey: string
  private readonly fetchImpl: typeof fetch
  private languagesPromise: Promise<string[]> | null = null
  private charactersTranslated = 0

  /**
   * Creates a MADLAD provider. Nothing is contacted until the first call.
   *
   * @param config - Sidecar URL, key, batching and decoding options.
   */
  constructor(private readonly config: MadladConfig = {}) {
    this.baseUrl = (
      config.baseUrl ??
      process.env.MADLAD_BASE_URL ??
      'http://127.0.0.1:8765'
    ).replace(/\/+$/, '')
    this.apiKey = config.apiKey ?? process.env.MADLAD_API_KEY ?? ''
    this.fetchImpl = config.fetch ?? fetch
  }

  /**
   * Translate one or more texts.
   *
   * @param params - Translation parameters. The source language is read from the
   *   text (`sourceLang` is only echoed back). `formality`, `glossaryId`, `context`,
   *   `modelType`, `preserveFormatting` and `tagHandling` have no MADLAD equivalent
   *   and are ignored — markup is translated as plain text.
   * @returns One translation per input, in order.
   * @throws {Error} With `code: 'UNSUPPORTED_LANGUAGE'` when MADLAD has no such target.
   */
  async translate(params: TranslateParams): Promise<TranslationResult> {
    const texts = Array.isArray(params.text) ? params.text : [params.text]
    const detectedSourceLang = params.sourceLang ?? ''
    if (texts.length === 0) return { translations: [] }
    const known = new Set(await this.languages())
    const target = toMadladLanguage(params.targetLang, known)
    if (!known.has(target)) {
      throw Object.assign(
        new Error(
          `MADLAD-400 has no target language "${params.targetLang}" (looked for <2${target}>).`,
        ),
        { code: 'UNSUPPORTED_LANGUAGE', targetLang: params.targetLang },
      )
    }
    this.charactersTranslated += texts.reduce((sum, text) => sum + text.length, 0)

    const split = texts.map((text) => splitProtected(text, params.protect ?? []))
    const out = new Array<string | undefined>(texts.length)
    let todo = texts.map((_, i) => i)

    for (const form of MARKER_FORMS) {
      if (todo.length === 0) break
      const translated = await this.send(
        todo.map((i) => maskWith(split[i].pieces, form)),
        target,
      )
      const failed: number[] = []
      todo.forEach((index, k) => {
        const { originals } = split[index]
        if (markersIntact(translated[k], originals.length, form)) {
          out[index] = unmaskWith(translated[k], originals, form)
        } else failed.push(index)
      })
      todo = failed
    }

    if (todo.length > 0) {
      // Last resort: translate the pieces between placeholders separately.
      const jobs = todo.flatMap((index) =>
        split[index].pieces
          .map((piece, p) => ({ index, p, piece }))
          .filter(({ piece }) => isTranslatable(piece)),
      )
      const translated = await this.send(
        jobs.map(({ piece }) => piece.trim()),
        target,
      )
      const pieces = new Map(todo.map((index) => [index, [...split[index].pieces]]))
      jobs.forEach(({ index, p }, k) => {
        pieces.get(index)![p] = translated[k]
      })
      for (const index of todo) {
        out[index] = assemblePieces(split[index].pieces, pieces.get(index)!, split[index].originals)
      }
    }

    return { translations: out.map((text) => ({ text: text ?? '', detectedSourceLang })) }
  }

  /**
   * Lists MADLAD's target languages (over 400), as its token codes.
   *
   * @param _type - Ignored: any language the model reads can be a source, and
   *   every listed language can be a target.
   * @returns Languages with English names where the runtime knows one.
   */
  async getSupportedLanguages(_type?: 'source' | 'target'): Promise<SupportedLanguage[]> {
    return (await this.languages()).map((language) => ({
      language,
      name: languageName(language),
    }))
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
   * The sidecar's language list, fetched once.
   *
   * @returns Token codes.
   */
  private languages(): Promise<string[]> {
    this.languagesPromise ??= this.request<{ languages: string[] }>('GET', '/languages')
      .then((body) => body.languages)
      .catch((error: unknown) => {
        this.languagesPromise = null // retry on the next call
        throw error
      })
    return this.languagesPromise
  }

  /**
   * Translates texts in batches of `batchSize`.
   *
   * @param texts - Texts to send.
   * @param target - MADLAD target code.
   * @returns One translation per text.
   */
  private async send(texts: string[], target: string): Promise<string[]> {
    const size = Math.max(1, this.config.batchSize ?? 32)
    const out: string[] = []
    for (let i = 0; i < texts.length; i += size) {
      const body = await this.request<{ translations: string[] }>('POST', '/translate', {
        texts: texts.slice(i, i + size),
        target,
        beamSize: this.config.beamSize ?? 1,
        maxLength: this.config.maxLength ?? 256,
      })
      out.push(...body.translations)
    }
    return out
  }

  /**
   * One JSON request to the sidecar, retrying when it is restarting.
   *
   * @param method - HTTP method.
   * @param path - Route.
   * @param body - JSON body.
   * @returns The parsed response.
   * @throws {Error} When the sidecar is unreachable or answers with an error.
   */
  private async request<T>(method: 'GET' | 'POST', path: string, body?: unknown): Promise<T> {
    const url = `${this.baseUrl}${path}`
    let lastError: unknown
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      if (attempt > 0) await new Promise((resolve) => setTimeout(resolve, 500 * 2 ** attempt))
      let response: Response
      try {
        response = await this.fetchImpl(url, {
          method,
          headers: {
            ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
            ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}),
          },
          body: body === undefined ? undefined : JSON.stringify(body),
          signal: AbortSignal.timeout(this.config.timeoutMs ?? 10 * 60 * 1000),
        })
      } catch (error) {
        lastError = error // connection refused / reset: the sidecar may be starting — retry
        continue
      }
      if (response.ok) return (await response.json()) as T
      const text = await response.text()
      let detail = text.slice(0, 200) || `HTTP ${response.status}`
      try {
        detail = (JSON.parse(text) as SidecarError).error ?? detail
      } catch (_error) {
        // Not JSON (e.g. a proxy's HTML error page) — the raw text above is the detail.
      }
      const error = Object.assign(
        new Error(`MADLAD sidecar ${path} error (${response.status}): ${detail}`),
        { status: response.status },
      )
      if (!RETRYABLE_STATUS_CODES.has(response.status)) throw error
      lastError = error
    }
    throw new Error(`MADLAD sidecar at ${this.baseUrl} did not answer ${path}`, {
      cause: lastError,
    })
  }
}

/**
 * Creates a MADLAD-400 translation provider.
 *
 * @param config - Sidecar URL, key, batching and decoding options.
 * @returns An `AITranslationProvider` backed by a MADLAD sidecar.
 */
export function createProvider(config?: MadladConfig): AITranslationProvider {
  return new MadladTranslationProvider(config)
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
