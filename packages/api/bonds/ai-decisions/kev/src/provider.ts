/**
 * Kev implementation of `AIDecisionsProvider`.
 *
 * Talks to a self-hosted `kev.serve` over its `POST /v1/systemone` route
 * (the TypeSafe Jev wire protocol), so the open-weights Kev models answer
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

import type { KevConfig } from './types.js'
import { fromWireResponse, postSystemOne, toWireQuestions } from './wire.js'

/** `kev.serve`'s default bind (`--port` defaults to 8008; its README examples use 8009). */
export const DEFAULT_KEV_URL = 'http://localhost:8008'

/** The model id `kev.serve` documents; any string is echoed back, none selects a checkpoint. */
export const DEFAULT_KEV_MODEL = 'kev-latest'

/** Most `choice` options or `score` levels `kev.serve` accepts (`MAX_OPTIONS` in `kev/api.py`). */
export const DEFAULT_KEV_MAX_OPTIONS = 255

/** Default per-call timeout: room for a scale-to-zero cold start (~35 s on Modal). */
export const DEFAULT_KEV_TIMEOUT_MS = 120_000

/**
 * Refuses, before any request, what `kev.serve` would reject with a 422:
 * a `choice` or `score` question with no options or more than `maxOptions`.
 *
 * @param questions - The questions keyed by id.
 * @param maxOptions - Most options/levels per question.
 */
function checkLimits(questions: Record<string, DecisionQuestion>, maxOptions: number): void {
  for (const [id, q] of Object.entries(questions)) {
    if (q.type === 'choice') {
      const count = Object.keys(q.criteria ?? {}).length
      if (count < 1 || count > maxOptions) {
        throw new Error(
          `ai-decisions-kev: question "${id}" has ${count} options; Kev answers 1–${maxOptions}. Shortlist the options first, or split the question.`,
        )
      }
    } else if (q.type === 'score') {
      const count = q.criteria?.length ?? 0
      if (count < 1 || count > maxOptions) {
        throw new Error(
          `ai-decisions-kev: question "${id}" has ${count} score levels; Kev answers 1–${maxOptions}.`,
        )
      }
    }
  }
}

/**
 * Kev decisions provider over HTTP.
 */
class KevDecisionsProvider implements AIDecisionsProvider {
  readonly name = 'kev'
  private readonly baseUrl: string
  private readonly apiKey: string | undefined
  private readonly headers:
    (() => Record<string, string> | Promise<Record<string, string>>) | undefined
  private readonly model: string
  private readonly maxOptions: number
  private readonly timeoutMs: number

  /**
   * Creates the provider.
   *
   * @param config - Provider configuration; env vars fill anything omitted.
   */
  constructor(config: KevConfig = {}) {
    this.baseUrl = (config.baseUrl || process.env.KEV_URL || DEFAULT_KEV_URL).replace(/\/+$/, '')
    this.apiKey = config.apiKey ?? (process.env.KEV_API_KEY || undefined)
    this.headers = config.headers
    this.model = config.model || DEFAULT_KEV_MODEL
    this.maxOptions = config.maxOptions ?? DEFAULT_KEV_MAX_OPTIONS
    this.timeoutMs = config.timeoutMs ?? DEFAULT_KEV_TIMEOUT_MS
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
        'ai-decisions-kev: Kev reads text only, so `images` is not supported. Bond @molecule/api-ai-decisions-intern-decision or @molecule/api-ai-decisions-llm (over a vision model) to ask about images.',
      )
    }
    checkLimits(input.questions, this.maxOptions)
    const timeout = AbortSignal.timeout(this.timeoutMs)
    const body = await postSystemOne({
      url: `${this.baseUrl}/v1/systemone`,
      apiKey: this.apiKey,
      headers: this.headers,
      body: {
        model: input.model || this.model,
        state: input.state,
        questions: toWireQuestions(input.questions),
      },
      signal: input.signal ? AbortSignal.any([input.signal, timeout]) : timeout,
      label: 'Kev',
    })
    return fromWireResponse(input.questions, body, input.minConfidence)
  }
}

/**
 * Creates a Kev decisions provider.
 *
 * @param config - Base URL, API key, headers hook, model id, option limit and timeout.
 * @returns An `AIDecisionsProvider` backed by a `kev.serve` host.
 */
export function createProvider(config?: KevConfig): AIDecisionsProvider {
  return new KevDecisionsProvider(config)
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
