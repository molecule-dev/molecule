/**
 * Jev implementation of `AIDecisionsProvider`.
 *
 * Calls TypeSafe AI's hosted Jev model over `POST /v1/systemone`.
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

import type { JevConfig } from './types.js'
import { fromWireResponse, postSystemOne, toWireQuestions } from './wire.js'

/** TypeSafe's API host. */
export const DEFAULT_JEV_URL = 'https://api.typesafe.ai'
/** TypeSafe's flagship model id. */
export const DEFAULT_JEV_MODEL = 'jev-latest'

/**
 * Jev decisions provider over HTTP.
 */
class JevDecisionsProvider implements AIDecisionsProvider {
  readonly name = 'jev'
  private readonly baseUrl: string
  private readonly apiKey: string | undefined
  private readonly model: string

  /**
   * Creates the provider.
   *
   * @param config - Provider configuration; env vars fill anything omitted.
   */
  constructor(config: JevConfig = {}) {
    this.baseUrl = (config.baseUrl || process.env.TYPESAFE_BASE_URL || DEFAULT_JEV_URL).replace(
      /\/+$/,
      '',
    )
    this.apiKey = config.apiKey ?? (process.env.TYPESAFE_API_KEY || undefined)
    this.model = config.model ?? DEFAULT_JEV_MODEL
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
        'ai-decisions-jev: Jev reads text only, so `images` is not supported. Bond @molecule/api-ai-decisions-intern-decision or @molecule/api-ai-decisions-llm (over a vision model) to ask about images.',
      )
    }
    if (!this.apiKey) {
      throw new Error(
        'ai-decisions-jev: TYPESAFE_API_KEY is not set. Create a key at typesafe.ai, or bond @molecule/api-ai-decisions-laya to self-host.',
      )
    }
    const body = await postSystemOne({
      url: `${this.baseUrl}/v1/systemone`,
      apiKey: this.apiKey,
      body: {
        model: input.model ?? this.model,
        state: input.state,
        questions: toWireQuestions(input.questions),
      },
      signal: input.signal,
      label: 'Jev',
    })
    return fromWireResponse(input.questions, body, input.minConfidence)
  }
}

/**
 * Creates a Jev decisions provider.
 *
 * @param config - API key, base URL and default model.
 * @returns An `AIDecisionsProvider` backed by TypeSafe's Jev API.
 */
export function createProvider(config?: JevConfig): AIDecisionsProvider {
  return new JevDecisionsProvider(config)
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
