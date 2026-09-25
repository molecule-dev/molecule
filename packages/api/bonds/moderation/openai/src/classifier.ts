/**
 * OpenAI content classifier — `POST /v1/moderations`.
 *
 * OpenAI's moderation endpoint is free to call. `omni-moderation-latest`
 * scores text and images against 13 categories (harassment, hate, illicit,
 * self-harm, sexual, violence and their sub-categories).
 *
 * @module
 */

import type {
  ContentClassifierProvider,
  ImageModerationOptions,
  ModerationOptions,
  ModerationResult,
} from '@molecule/api-content-moderation'

import type { OpenaiModerationConfig } from './types.js'

/** One `results[]` entry from the moderation endpoint. */
interface OpenaiModerationEntry {
  flagged: boolean
  categories: Record<string, boolean>
  category_scores: Record<string, number>
}

/** Error thrown when the moderation endpoint refuses or fails. */
export class OpenaiModerationError extends Error {
  /** HTTP status from OpenAI (0 when the request never completed). */
  readonly status: number

  /**
   * Create the error.
   *
   * @param message - Human-readable message.
   * @param status - HTTP status.
   */
  constructor(message: string, status: number) {
    super(message)
    this.name = 'OpenaiModerationError'
    this.status = status
  }
}

/**
 * Turn one moderation entry into the core's result, applying the caller's
 * category filter and threshold.
 *
 * - No `threshold`: a category is flagged exactly when OpenAI flagged it.
 * - With `threshold`: a category is flagged iff its score ≥ threshold.
 * - `categories` limits the returned categories AND the overall `flagged`.
 *
 * @param entry - The endpoint's result for one input.
 * @param options - Category filter and threshold.
 * @returns The normalized result.
 */
export function toModerationResult(
  entry: OpenaiModerationEntry,
  options: ModerationOptions = {},
): ModerationResult {
  const wanted = options.categories?.length ? new Set(options.categories) : null
  const threshold = options.threshold
  const categories = Object.entries(entry.category_scores)
    .filter(([name]) => !wanted || wanted.has(name))
    .map(([category, score]) => ({
      category,
      score,
      flagged: threshold === undefined ? entry.categories[category] === true : score >= threshold,
    }))
    .sort((a, b) => b.score - a.score)
  return { flagged: categories.some((c) => c.flagged), categories }
}

/**
 * Classifier backed by OpenAI's moderation endpoint.
 */
export class OpenaiContentClassifier implements ContentClassifierProvider {
  readonly name = 'openai'

  private readonly apiKey: string
  private readonly baseUrl: string
  private readonly model: string
  private readonly timeoutMs: number

  /**
   * Create the classifier.
   *
   * @param config - Options; each falls back to its env var or default.
   */
  constructor(config: OpenaiModerationConfig = {}) {
    this.apiKey = config.apiKey ?? process.env.OPENAI_API_KEY ?? ''
    this.baseUrl = (
      config.baseUrl ??
      process.env.OPENAI_BASE_URL ??
      'https://api.openai.com'
    ).replace(/\/+$/, '')
    this.model = config.model ?? 'omni-moderation-latest'
    this.timeoutMs = config.timeoutMs ?? 30_000
  }

  /**
   * Classify text.
   *
   * @param content - The text.
   * @param options - Category filter and threshold.
   * @returns Per-category scores (highest first) and the overall decision.
   */
  async check(content: string, options?: ModerationOptions): Promise<ModerationResult> {
    return toModerationResult(await this.moderate([{ type: 'text', text: content }]), options)
  }

  /**
   * Classify an image (sent inline as a data URL).
   *
   * @param image - The image bytes.
   * @param options - Category filter, threshold and MIME type (default `image/jpeg`).
   * @returns Per-category scores (highest first) and the overall decision.
   */
  async checkImage(image: Uint8Array, options?: ImageModerationOptions): Promise<ModerationResult> {
    const mime = options?.mimeType ?? 'image/jpeg'
    const url = `data:${mime};base64,${Buffer.from(image).toString('base64')}`
    return toModerationResult(
      await this.moderate([{ type: 'image_url', image_url: { url } }]),
      options,
    )
  }

  /** One call to the moderation endpoint. */
  private async moderate(input: unknown[]): Promise<OpenaiModerationEntry> {
    if (!this.apiKey) {
      throw new OpenaiModerationError('OPENAI_API_KEY is not set.', 401)
    }
    const response = await fetch(`${this.baseUrl}/v1/moderations`, {
      method: 'POST',
      headers: { authorization: `Bearer ${this.apiKey}`, 'content-type': 'application/json' },
      body: JSON.stringify({ model: this.model, input }),
      signal: AbortSignal.timeout(this.timeoutMs),
    })
    if (!response.ok) {
      const detail = (await response.text()).slice(0, 300)
      throw new OpenaiModerationError(
        `OpenAI moderation failed (${response.status}): ${detail}`,
        response.status,
      )
    }
    const data = (await response.json()) as { results?: OpenaiModerationEntry[] }
    const entry = data.results?.[0]
    if (!entry || typeof entry.category_scores !== 'object') {
      throw new OpenaiModerationError('OpenAI moderation returned no result.', response.status)
    }
    return entry
  }
}

/**
 * Create an OpenAI content classifier.
 *
 * @param config - Options; each falls back to its env var or default.
 * @returns A `ContentClassifierProvider`.
 */
export function createClassifier(config?: OpenaiModerationConfig): ContentClassifierProvider {
  return new OpenaiContentClassifier(config)
}
