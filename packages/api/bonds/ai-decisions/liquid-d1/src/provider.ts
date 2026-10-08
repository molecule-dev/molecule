/**
 * Liquid d1 implementation of `AIDecisionsProvider`.
 *
 * Calls Liquid AI's hosted d1 decision models over
 * `POST /decisions/v1/systemone`, or a self-hosted `llama-server` running the
 * open d1 weights over its identical `POST /v1/systemone` route.
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

import type { LiquidD1Config } from './types.js'
import { fromWireResponse, postSystemOne, toWireQuestions } from './wire.js'

/** Liquid AI's API host. */
export const DEFAULT_LIQUID_D1_URL = 'https://api.liquid.ai'
/** The systemone route on the hosted Liquid API (nesting is Liquid's). */
export const HOSTED_LIQUID_D1_PATH = '/decisions/v1/systemone'
/** The systemone route on a `llama-server` running the open d1 weights. */
export const SELF_HOSTED_D1_PATH = '/v1/systemone'
/** Liquid's flagship model id. */
export const DEFAULT_LIQUID_D1_MODEL = 'd1'

/** The hosted API's request limits (docs.liquid.ai/lfm/models/d1). */
export const LIQUID_D1_LIMITS = {
  /** Images per request. */
  maxImages: 8,
  /** Levels per `score` question. */
  minScoreLevels: 2,
  maxScoreLevels: 10,
} as const

/** Image media types the hosted API accepts (llama-server decodes the same four). */
export const LIQUID_D1_IMAGE_TYPES: readonly string[] = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]

/**
 * Refuses, before any request, what the API would reject with a bare 4xx.
 * Patch count (≤10,000 32×32 patches), aspect ratio (longer side ≤100× the
 * shorter) and the 4.5 MB body cap depend on the decoded pixels, so only the
 * API itself can check them.
 *
 * @param questions - The questions keyed by id.
 * @param images - The images, if any.
 */
function checkLimits(questions: Record<string, DecisionQuestion>, images: DecisionImage[]): void {
  for (const [id, q] of Object.entries(questions)) {
    if (q.type !== 'score') continue
    const levels = q.criteria.length
    if (levels < LIQUID_D1_LIMITS.minScoreLevels || levels > LIQUID_D1_LIMITS.maxScoreLevels) {
      throw new Error(
        `ai-decisions-liquid-d1: score question "${id}" has ${levels} levels; d1 answers ${LIQUID_D1_LIMITS.minScoreLevels}–${LIQUID_D1_LIMITS.maxScoreLevels}, lowest first.`,
      )
    }
  }
  if (images.length > LIQUID_D1_LIMITS.maxImages) {
    throw new Error(
      `ai-decisions-liquid-d1: ${images.length} images passed; the API accepts at most ${LIQUID_D1_LIMITS.maxImages}.`,
    )
  }
  for (const image of images) {
    if (!LIQUID_D1_IMAGE_TYPES.includes(image.mimeType)) {
      throw new Error(
        `ai-decisions-liquid-d1: image type "${image.mimeType}" is not supported; use ${LIQUID_D1_IMAGE_TYPES.join(', ')}.`,
      )
    }
    if (!image.data) {
      throw new Error(
        'ai-decisions-liquid-d1: each image needs base64 `data` (no `data:` URL prefix).',
      )
    }
  }
}

/**
 * Liquid d1 decisions provider over HTTP.
 */
class LiquidD1DecisionsProvider implements AIDecisionsProvider {
  readonly name = 'liquid-d1'
  private readonly baseUrl: string
  private readonly decisionsUrl: string
  private readonly apiKey: string | undefined
  private readonly headers:
    (() => Record<string, string> | Promise<Record<string, string>>) | undefined
  private readonly model: string

  /**
   * Creates the provider.
   *
   * @param config - Provider configuration; env vars fill anything omitted.
   */
  constructor(config: LiquidD1Config = {}) {
    this.baseUrl = (config.baseUrl || process.env.LIQUID_BASE_URL || DEFAULT_LIQUID_D1_URL).replace(
      /\/+$/,
      '',
    )
    this.decisionsUrl = (config.decisionsUrl || process.env.LIQUID_DECISIONS_URL || '').replace(
      /\/+$/,
      '',
    )
    this.apiKey = config.apiKey ?? (process.env.LIQUID_API_KEY || undefined)
    this.headers = config.headers
    this.model = config.model ?? DEFAULT_LIQUID_D1_MODEL
  }

  /**
   * Answers every question about `input.state` (and `input.images`) in one
   * request.
   *
   * @param input - The state, questions, images and options.
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
    const model = input.model ?? this.model
    const images = input.images ?? []
    if (images.length && model === 'd1:free') {
      throw new Error(
        "ai-decisions-liquid-d1: model 'd1:free' does not accept images (it is text-only); use model 'd1', or self-host d1-3B with LIQUID_DECISIONS_URL.",
      )
    }
    checkLimits(input.questions, images)
    const selfHosted = this.decisionsUrl.length > 0
    if (!selfHosted && !this.apiKey) {
      throw new Error(
        'ai-decisions-liquid-d1: LIQUID_API_KEY is not set. Create a key at console.liquid.ai (Dashboard > API Keys), or set LIQUID_DECISIONS_URL to a llama-server running d1 (llama-server -hf LiquidAI/d1-3B-GGUF:Q8_0) to self-host without a key.',
      )
    }
    const body = await postSystemOne({
      url: selfHosted
        ? `${this.decisionsUrl}${SELF_HOSTED_D1_PATH}`
        : `${this.baseUrl}${HOSTED_LIQUID_D1_PATH}`,
      apiKey: this.apiKey,
      headers: this.headers,
      body: {
        model,
        state: input.state,
        questions: toWireQuestions(input.questions),
        ...(images.length
          ? {
              images: images.map((image) => ({
                content_type: image.mimeType,
                base64: image.data,
              })),
            }
          : {}),
      },
      signal: input.signal,
      label: 'Liquid d1',
    })
    return fromWireResponse(input.questions, body, input.minConfidence)
  }
}

/**
 * Creates a Liquid d1 decisions provider.
 *
 * @param config - API key, base URL / self-host URL and default model.
 * @returns An `AIDecisionsProvider` backed by Liquid's d1 decision models.
 */
export function createProvider(config?: LiquidD1Config): AIDecisionsProvider {
  return new LiquidD1DecisionsProvider(config)
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
