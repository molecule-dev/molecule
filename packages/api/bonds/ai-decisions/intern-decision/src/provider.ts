/**
 * Intern-Decision implementation of `AIDecisionsProvider`.
 *
 * Talks to a self-hosted Intern-Decision FastAPI service over its
 * `POST /v1/decisions` route, so the open-weights Intern-Decision models
 * answer typed decisions about text and images on your own hardware.
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

import type { InternDecisionConfig } from './types.js'
import { fromWireResponse, postDecisions, toWireQuestions } from './wire.js'

/** The service's default bind (`scripts/demo.sh`: `DEMO_HOST` 127.0.0.1, `DEMO_PORT` 7860). */
export const DEFAULT_INTERN_DECISION_URL = 'http://127.0.0.1:7860'

/** The service's request limits (`src/inference/pipeline.py`, `src/service/uploads.py`). */
export const INTERN_DECISION_LIMITS = {
  /** Questions per request. */
  maxQuestions: 16,
  /** Options per `choice` / levels per `score` (one answer symbol each: A–Z, a–z, 0–9). */
  maxOptions: 62,
  /** Images per request. */
  maxImages: 8,
  /** Decoded bytes per image. */
  maxImageBytes: 12 * 1024 * 1024,
  /** Decoded bytes across all images. */
  maxTotalImageBytes: 32 * 1024 * 1024,
} as const

/** Image media types the service decodes (GIFs must be still). */
export const INTERN_DECISION_IMAGE_TYPES: readonly string[] = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
]

/**
 * Decoded byte length of a base64 string, without decoding it.
 *
 * @param data - Base64 text.
 * @returns The byte count it decodes to.
 */
const base64Bytes = (data: string): number => {
  const clean = data.replace(/\s+/g, '')
  const padding = clean.endsWith('==') ? 2 : clean.endsWith('=') ? 1 : 0
  return Math.floor((clean.length * 3) / 4) - padding
}

/**
 * Refuses, before any request, what the service would reject with a bare 422.
 *
 * @param questions - The questions keyed by id.
 * @param images - The images, if any.
 */
function checkLimits(questions: Record<string, DecisionQuestion>, images: DecisionImage[]): void {
  const { maxQuestions, maxOptions, maxImages, maxImageBytes, maxTotalImageBytes } =
    INTERN_DECISION_LIMITS
  const count = Object.keys(questions).length
  if (count > maxQuestions) {
    throw new Error(
      `ai-decisions-intern-decision: ${count} questions passed; Intern-Decision answers at most ${maxQuestions} per request. Split them across calls.`,
    )
  }
  for (const [id, q] of Object.entries(questions)) {
    if (q.type === 'yesNo') continue
    const options =
      q.type === 'choice' ? Object.keys(q.criteria ?? {}).length : (q.criteria?.length ?? 0)
    if (options < 1 || options > maxOptions) {
      throw new Error(
        `ai-decisions-intern-decision: question "${id}" has ${options} options; Intern-Decision answers 1–${maxOptions}.`,
      )
    }
  }
  if (images.length > maxImages) {
    throw new Error(
      `ai-decisions-intern-decision: ${images.length} images passed; the service accepts at most ${maxImages}.`,
    )
  }
  let total = 0
  for (const image of images) {
    if (!INTERN_DECISION_IMAGE_TYPES.includes(image.mimeType)) {
      throw new Error(
        `ai-decisions-intern-decision: image type "${image.mimeType}" is not supported; use ${INTERN_DECISION_IMAGE_TYPES.join(', ')}.`,
      )
    }
    const bytes = base64Bytes(image.data)
    if (bytes < 1 || bytes > maxImageBytes) {
      throw new Error(
        `ai-decisions-intern-decision: each image must be 1 byte to 12 MB (got ${bytes} bytes).`,
      )
    }
    total += bytes
  }
  if (total > maxTotalImageBytes) {
    throw new Error(
      `ai-decisions-intern-decision: images total ${total} bytes; the service accepts at most 32 MB per request.`,
    )
  }
}

/**
 * Intern-Decision decisions provider over HTTP.
 */
class InternDecisionProvider implements AIDecisionsProvider {
  readonly name = 'intern-decision'
  private readonly baseUrl: string
  private readonly apiKey: string | undefined
  private readonly headers:
    (() => Record<string, string> | Promise<Record<string, string>>) | undefined

  /**
   * Creates the provider.
   *
   * @param config - Provider configuration; env vars fill anything omitted.
   */
  constructor(config: InternDecisionConfig = {}) {
    this.baseUrl = (
      config.baseUrl ||
      process.env.INTERN_DECISION_URL ||
      DEFAULT_INTERN_DECISION_URL
    ).replace(/\/+$/, '')
    this.apiKey = config.apiKey ?? (process.env.INTERN_DECISION_API_KEY || undefined)
    this.headers = config.headers
  }

  /**
   * Answers every question about `input.state` (and `input.images`) in one request.
   *
   * @param input - The state, questions, images and options. `model` is
   *   ignored: the service answers with the one checkpoint it loaded.
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
    checkLimits(input.questions, images)
    const body = await postDecisions({
      url: `${this.baseUrl}/v1/decisions`,
      apiKey: this.apiKey,
      headers: this.headers,
      body: {
        state: input.state,
        questions: toWireQuestions(input.questions),
        ...(images.length
          ? { images: images.map((image) => ({ type: image.mimeType, data: image.data })) }
          : {}),
      },
      signal: input.signal,
      label: 'Intern-Decision',
    })
    return fromWireResponse(input.questions, body, input.minConfidence)
  }
}

/**
 * Creates an Intern-Decision decisions provider.
 *
 * @param config - Base URL and optional proxy API key.
 * @returns An `AIDecisionsProvider` backed by an Intern-Decision service.
 */
export function createProvider(config?: InternDecisionConfig): AIDecisionsProvider {
  return new InternDecisionProvider(config)
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
