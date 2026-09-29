/**
 * Jeff implementation of `AIDecisionsProvider`.
 *
 * Talks to a self-hosted `jeff-serve` over its `POST /v1/systemone` route
 * (the TypeSafe Jev wire protocol), so the open-weights Jeff models answer
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
  DecisionImage,
  DecisionQuestion,
} from '@molecule/api-ai-decisions'

import type { JeffConfig } from './types.js'
import { fromWireResponse, postSystemOne, toWireQuestions } from './wire.js'

/** `jeff-serve`'s default bind (`PORT` defaults to 8000; its README examples use 8765). */
export const DEFAULT_JEFF_URL = 'http://localhost:8000'

/** A model id every `jeff-serve` accepts; it answers with the checkpoint it loaded. */
export const DEFAULT_JEFF_MODEL = 'jeff-latest'

/** Most `choice` options the released Jeff checkpoints answer (options are coded A–Z). */
export const DEFAULT_JEFF_MAX_OPTIONS = 26

/** `jeff-serve`'s bounds on a `score` question's levels. */
export const JEFF_SCORE_LEVELS = { min: 2, max: 10 } as const

/** Most images `jeff-serve` accepts per request. */
export const JEFF_MAX_IMAGES = 4

/** Image media types `jeff-serve` decodes. */
export const JEFF_IMAGE_TYPES: readonly string[] = ['image/png', 'image/jpeg', 'image/webp']

/**
 * Refuses, before any request, what `jeff-serve` would reject with a bare 422:
 * too many `choice` options, a `score` outside 2–10 levels, too many or
 * unsupported images.
 *
 * @param questions - The questions keyed by id.
 * @param images - The images, if any.
 * @param maxOptions - Most `choice` options the checkpoint answers.
 */
function checkLimits(
  questions: Record<string, DecisionQuestion>,
  images: DecisionImage[],
  maxOptions: number,
): void {
  for (const [id, q] of Object.entries(questions)) {
    if (q.type === 'choice') {
      const count = Object.keys(q.criteria ?? {}).length
      if (count < 1 || count > maxOptions) {
        throw new Error(
          `ai-decisions-jeff: question "${id}" has ${count} options; Jeff answers 1–${maxOptions}. Shortlist the options first, or split the question.`,
        )
      }
    } else if (q.type === 'score') {
      const count = q.criteria?.length ?? 0
      if (count < JEFF_SCORE_LEVELS.min || count > JEFF_SCORE_LEVELS.max) {
        throw new Error(
          `ai-decisions-jeff: question "${id}" has ${count} score levels; Jeff answers ${JEFF_SCORE_LEVELS.min}–${JEFF_SCORE_LEVELS.max}.`,
        )
      }
    }
  }
  if (images.length > JEFF_MAX_IMAGES) {
    throw new Error(
      `ai-decisions-jeff: ${images.length} images passed; jeff-serve accepts at most ${JEFF_MAX_IMAGES}.`,
    )
  }
  for (const image of images) {
    if (!JEFF_IMAGE_TYPES.includes(image.mimeType)) {
      throw new Error(
        `ai-decisions-jeff: image type "${image.mimeType}" is not supported; use ${JEFF_IMAGE_TYPES.join(', ')}.`,
      )
    }
  }
}

/**
 * Jeff decisions provider over HTTP.
 */
class JeffDecisionsProvider implements AIDecisionsProvider {
  readonly name = 'jeff'
  private readonly baseUrl: string
  private readonly apiKey: string | undefined
  private readonly model: string
  private readonly maxOptions: number

  /**
   * Creates the provider.
   *
   * @param config - Provider configuration; env vars fill anything omitted.
   */
  constructor(config: JeffConfig = {}) {
    this.baseUrl = (config.baseUrl || process.env.JEFF_URL || DEFAULT_JEFF_URL).replace(/\/+$/, '')
    this.apiKey = config.apiKey ?? (process.env.JEFF_API_KEY || undefined)
    this.model = config.model || DEFAULT_JEFF_MODEL
    this.maxOptions = config.maxOptions ?? DEFAULT_JEFF_MAX_OPTIONS
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
    const images = input.images ?? []
    checkLimits(input.questions, images, this.maxOptions)
    const body = await postSystemOne({
      url: `${this.baseUrl}/v1/systemone`,
      apiKey: this.apiKey,
      body: {
        model: input.model || this.model,
        state: input.state,
        questions: toWireQuestions(input.questions),
        ...(images.length
          ? { images: images.map((image) => `data:${image.mimeType};base64,${image.data}`) }
          : {}),
      },
      signal: input.signal,
      label: 'Jeff',
    })
    return fromWireResponse(input.questions, body, input.minConfidence)
  }
}

/**
 * Creates a Jeff decisions provider.
 *
 * @param config - Base URL, API key, model id and option limit.
 * @returns An `AIDecisionsProvider` backed by a `jeff-serve` host.
 */
export function createProvider(config?: JeffConfig): AIDecisionsProvider {
  return new JeffDecisionsProvider(config)
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
