/**
 * Laya implementation of `AIDecisionsProvider`.
 *
 * Talks to a self-hosted `laya-serve` over its `POST /v1/systemone` route
 * (the TypeSafe Jev wire protocol), so the open-weights Laya model answers
 * typed decisions on your own hardware.
 *
 * @module
 */

// Side-effect import: registers this bond's secret definitions.
import './secrets.js'

import type {
  AIDecisionsProvider,
  DecideInput,
  DecideResult,
  DecisionQuestion,
} from '@molecule/api-ai-decisions'

import type { LayaConfig } from './types.js'
import { fromWireResponse, postSystemOne, toWireQuestions } from './wire.js'

/** `laya-serve`'s default bind (`LAYA_PORT` defaults to 8000). */
export const DEFAULT_LAYA_URL = 'http://localhost:8000'

/**
 * Laya decisions provider over HTTP.
 */
class LayaDecisionsProvider implements AIDecisionsProvider {
  readonly name = 'laya'
  private readonly baseUrl: string
  private readonly apiKey: string | undefined
  private readonly headers:
    (() => Record<string, string> | Promise<Record<string, string>>) | undefined
  private readonly model: string | undefined

  /**
   * Creates the provider.
   *
   * @param config - Provider configuration; env vars fill anything omitted.
   */
  constructor(config: LayaConfig = {}) {
    this.baseUrl = (config.baseUrl || process.env.LAYA_URL || DEFAULT_LAYA_URL).replace(/\/+$/, '')
    this.apiKey = config.apiKey ?? (process.env.LAYA_API_KEY || undefined)
    this.headers = config.headers
    this.model = config.model
  }

  /**
   * Answers every question about `input.state` in one request.
   *
   * @param input - The state, questions and options.
   * @returns One typed answer per question id.
   */
  async decide<Q extends Record<string, DecisionQuestion>>(
    input: DecideInput<Q>,
  ): Promise<DecideResult<Q>> {
    if (input.state === undefined || input.state === null) {
      throw new Error('ai-decisions: decide() requires a `state`')
    }
    if (!input.questions || Object.keys(input.questions).length === 0) {
      throw new Error('ai-decisions: decide() requires at least one question')
    }
    if (input.images?.length) {
      throw new Error(
        'ai-decisions-laya: Laya reads text only, so `images` is not supported. Bond @molecule/api-ai-decisions-intern-decision or @molecule/api-ai-decisions-llm (over a vision model) to ask about images.',
      )
    }
    const model = input.model ?? this.model
    const body = await postSystemOne({
      url: `${this.baseUrl}/v1/systemone`,
      apiKey: this.apiKey,
      headers: this.headers,
      body: {
        ...(model ? { model } : {}),
        state: input.state,
        questions: toWireQuestions(input.questions),
      },
      signal: input.signal,
      label: 'Laya',
    })
    return fromWireResponse(input.questions, body, input.minConfidence)
  }
}

/**
 * Creates a Laya decisions provider.
 *
 * @param config - Base URL, API key and default checkpoint.
 * @returns An `AIDecisionsProvider` backed by a `laya-serve` host.
 */
export function createProvider(config?: LayaConfig): AIDecisionsProvider {
  return new LayaDecisionsProvider(config)
}

let _provider: AIDecisionsProvider | null = null
/**
 * The provider implementation — lazy, so env vars are read on first use.
 */
export const provider: AIDecisionsProvider = new Proxy({} as AIDecisionsProvider, {
  get(_, prop, receiver) {
    if (!_provider) _provider = createProvider()
    return Reflect.get(_provider, prop, receiver)
  },
  set(_, prop, value) {
    if (!_provider) _provider = createProvider()
    return Reflect.set(_provider, prop, value)
  },
})
