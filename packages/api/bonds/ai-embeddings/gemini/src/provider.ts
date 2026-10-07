/**
 * Gemini API implementation of AIEmbeddingsProvider.
 *
 * Calls `gemini-embedding-2` through `models/{model}:batchEmbedContents` with the
 * runtime's global `fetch` (no SDK). One request per input: Gemini Embedding 2
 * merges every part of ONE request into ONE vector, so a list of texts is sent
 * as a batch of single-part requests, and an `embedContent` input (text + media)
 * as one multi-part request.
 *
 * @module
 */

// Side-effect import: registers this bond's secret definitions so the
// runtime registry is populated even when provider.js is imported directly
// (not through the package barrel).
import './secrets.js'

import type {
  AIEmbeddingsProvider,
  EmbedContentInput,
  EmbedContentParams,
  EmbeddingInputType,
  EmbeddingModality,
  EmbeddingResult,
  EmbeddingTask,
  EmbedMediaSource,
  EmbedParams,
} from '@molecule/api-ai-embeddings'
import { configNotConfiguredError } from '@molecule/api-secrets'

import { applyTaskPrefix } from './prefixes.js'
import type { GeminiEmbeddingsConfig } from './types.js'

/** Default API base URL (version included). */
export const GEMINI_EMBEDDINGS_DEFAULT_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta'

/** Default model: Google's hosted multimodal embedding model. */
export const GEMINI_EMBEDDINGS_DEFAULT_MODEL = 'gemini-embedding-2'

/** Smallest and largest `output_dimensionality` the API accepts. */
const MIN_DIMENSIONS = 128
const MAX_DIMENSIONS = 3072

/** Placeholders other multimodal models use; Gemini takes media as parts instead. */
const MEDIA_PLACEHOLDERS = /\s*<\|(image|audio|video)\|>/g

/** A Gemini content part. */
type GeminiPart =
  | { text: string }
  | { inline_data: { mime_type: string; data: string } }
  | { file_data: { mime_type: string; file_uri: string } }

/** One `EmbedContentRequest` inside a batch. */
interface GeminiEmbedRequest {
  model: string
  content: { parts: GeminiPart[] }
  output_dimensionality?: number
}

/** `batchEmbedContents` response body. */
interface GeminiBatchResponse {
  embeddings?: { values?: number[] }[]
  usageMetadata?: { promptTokenCount?: number }
}

/** Gemini API error body. */
interface GeminiErrorBody {
  error?: { code?: number; message?: string; status?: string }
}

/**
 * A Gemini API request failed. Carries the vendor's HTTP `status` and its error
 * `code` (e.g. `INVALID_ARGUMENT`, `RESOURCE_EXHAUSTED`). Deliberately NOT tagged
 * with `statusCode`/`errorKey`, so API middleware answers with its generic 500
 * instead of echoing Google's status to the caller.
 */
export class GeminiEmbeddingsError extends Error {
  /** HTTP status Google answered with. */
  readonly status: number
  /** Google's error status string, when it sent one. */
  readonly code: string | undefined

  /**
   * Creates the error.
   *
   * @param message - Human-readable detail from Google.
   * @param status - HTTP status.
   * @param code - Google's error status string.
   */
  constructor(message: string, status: number, code?: string) {
    super(`Gemini Embeddings API error (HTTP ${status}${code ? ` ${code}` : ''}): ${message}`)
    this.name = 'GeminiEmbeddingsError'
    this.status = status
    this.code = code
  }
}

/**
 * Turn one media source into a Gemini part. Gemini needs the MIME type, so a
 * bare bytes/URL source is rejected with a message that shows the object form.
 *
 * @param source - The media source.
 * @param kind - Which medium (for the error message).
 * @returns The part.
 * @throws {Error} When the MIME type is missing.
 */
function mediaPart(source: EmbedMediaSource, kind: string): GeminiPart {
  if (typeof source === 'string' || source instanceof Uint8Array) {
    throw new Error(
      `Gemini embeddings need the ${kind}'s MIME type — pass { data, mimeType } (e.g. { data: bytes, mimeType: '${kind === 'image' ? 'image/png' : kind === 'audio' ? 'audio/wav' : 'video/mp4'}' }).`,
    )
  }
  if (typeof source.data === 'string') {
    return { file_data: { mime_type: source.mimeType, file_uri: source.data } }
  }
  return {
    inline_data: { mime_type: source.mimeType, data: Buffer.from(source.data).toString('base64') },
  }
}

/**
 * Gemini API embeddings provider.
 */
class GeminiEmbeddingsProvider implements AIEmbeddingsProvider {
  readonly name = 'gemini'
  readonly modalities: ReadonlyArray<EmbeddingModality> = ['text', 'image', 'audio', 'video']
  private config: GeminiEmbeddingsConfig

  /**
   * Creates the provider. Env vars are read per request, so late-resolved
   * secrets are honoured.
   *
   * @param config - Provider configuration.
   */
  constructor(config: GeminiEmbeddingsConfig = {}) {
    this.config = config
  }

  /**
   * Embed texts; each text gets its own vector. Inputs are treated as documents
   * unless `inputType: 'query'` is passed.
   *
   * @param params - Texts, model, dimensions, task, input type.
   * @returns One vector per text with usage.
   */
  async embed(params: EmbedParams): Promise<EmbeddingResult> {
    const texts = Array.isArray(params.input) ? params.input : [params.input]
    const task = params.task ?? this.config.task ?? 'search'
    const inputType = params.inputType ?? 'document'
    return this.run(
      texts.map((text) => [{ text: this.prefix(text, task, inputType) }]),
      params.model,
      params.dimensions,
    )
  }

  /**
   * Embed one search query (query-side prefix).
   *
   * @param text - The query.
   * @returns Its vector.
   */
  async embedQuery(text: string): Promise<number[]> {
    const result = await this.embed({ input: text, inputType: 'query' })
    return result.embeddings[0] ?? []
  }

  /**
   * Embed documents for an index (document-side prefix).
   *
   * @param texts - The documents.
   * @returns One vector per document.
   */
  async embedDocuments(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return []
    const result = await this.embed({ input: texts, inputType: 'document' })
    return result.embeddings
  }

  /**
   * Embed text and/or media; every field of one input becomes ONE vector.
   *
   * @param params - Inputs, model, dimensions, task, input type.
   * @returns One vector per input with usage.
   */
  async embedContent(params: EmbedContentParams): Promise<EmbeddingResult> {
    const task = params.task ?? this.config.task ?? 'search'
    const inputType = params.inputType ?? 'document'
    const parts = params.inputs.map((input) => this.contentParts(input, task, inputType))
    return this.run(parts, params.model, params.dimensions)
  }

  /**
   * Build the parts for one content input.
   *
   * @param input - The input.
   * @param task - Task for the text prefix.
   * @param inputType - Query or document.
   * @returns The parts.
   * @throws {Error} When the input is empty.
   */
  private contentParts(
    input: EmbedContentInput,
    task: EmbeddingTask,
    inputType: EmbeddingInputType,
  ): GeminiPart[] {
    const parts: GeminiPart[] = []
    if (input.text !== undefined) {
      const text = input.text.replace(MEDIA_PLACEHOLDERS, '').trim()
      if (text) parts.push({ text: this.prefix(text, task, inputType) })
    }
    if (input.image !== undefined) parts.push(mediaPart(input.image, 'image'))
    if (input.audio !== undefined) parts.push(mediaPart(input.audio, 'audio'))
    if (input.video !== undefined) parts.push(mediaPart(input.video, 'video'))
    if (parts.length === 0) {
      throw new Error('Gemini embeddings: an embedContent input needs text, image, audio or video')
    }
    return parts
  }

  /**
   * Apply the task prefix unless disabled.
   *
   * @param text - Raw text.
   * @param task - Task.
   * @param inputType - Side.
   * @returns The text to send.
   */
  private prefix(text: string, task: EmbeddingTask, inputType: EmbeddingInputType): string {
    return this.config.applyPrefixes === false ? text : applyTaskPrefix(text, task, inputType)
  }

  /**
   * Send the requests in batches and merge the results.
   *
   * @param contents - Parts per request (one vector each).
   * @param modelOverride - Model for this call.
   * @param dimensionsOverride - Output size for this call.
   * @returns The merged result.
   * @throws {Error} On a missing key, invalid dimensions, or an API error.
   */
  private async run(
    contents: GeminiPart[][],
    modelOverride: string | undefined,
    dimensionsOverride: number | undefined,
  ): Promise<EmbeddingResult> {
    const model = modelOverride ?? this.config.defaultModel ?? GEMINI_EMBEDDINGS_DEFAULT_MODEL
    if (contents.length === 0) {
      return { embeddings: [], model, usage: { promptTokens: 0, totalTokens: 0 } }
    }
    const dimensions = dimensionsOverride ?? this.config.dimensions
    if (
      dimensions !== undefined &&
      (!Number.isInteger(dimensions) || dimensions < MIN_DIMENSIONS || dimensions > MAX_DIMENSIONS)
    ) {
      throw new Error(
        `Gemini embeddings: dimensions must be an integer from ${MIN_DIMENSIONS} to ${MAX_DIMENSIONS} (got ${dimensions})`,
      )
    }

    const customBaseUrl = this.config.baseUrl ?? process.env.GOOGLE_AI_BASE_URL
    const baseUrl = (customBaseUrl ?? GEMINI_EMBEDDINGS_DEFAULT_BASE_URL).replace(/\/+$/, '')
    const apiKey =
      this.config.apiKey ?? process.env.GOOGLE_AI_API_KEY ?? process.env.GEMINI_API_KEY ?? ''
    // A key is required for Google's endpoint; a custom base URL may be a keyless gateway.
    if (!apiKey && !customBaseUrl) {
      throw configNotConfiguredError('GOOGLE_AI_API_KEY', 'Gemini embeddings')
    }

    const configuredBatch = this.config.maxBatchSize ?? 100
    const batchSize = configuredBatch >= 1 ? Math.floor(configuredBatch) : 100
    const embeddings: number[][] = []
    let promptTokens = 0
    for (let start = 0; start < contents.length; start += batchSize) {
      const requests: GeminiEmbedRequest[] = contents
        .slice(start, start + batchSize)
        .map((parts) => ({
          model: `models/${model}`,
          content: { parts },
          ...(dimensions !== undefined ? { output_dimensionality: dimensions } : {}),
        }))
      const data = await this.post(baseUrl, apiKey, model, requests)
      const vectors = (data.embeddings ?? []).map((embedding) => embedding.values ?? [])
      if (vectors.length !== requests.length) {
        throw new GeminiEmbeddingsError(
          `expected ${requests.length} embeddings, got ${vectors.length}`,
          200,
        )
      }
      embeddings.push(...vectors)
      promptTokens += data.usageMetadata?.promptTokenCount ?? 0
    }
    return { embeddings, model, usage: { promptTokens, totalTokens: promptTokens } }
  }

  /**
   * POST one `batchEmbedContents` call, retrying 429/500/503 with backoff.
   *
   * @param baseUrl - API base URL.
   * @param apiKey - API key ('' for a keyless gateway).
   * @param model - Model id.
   * @param requests - The batch.
   * @returns The parsed response.
   * @throws {GeminiEmbeddingsError} On a non-2xx answer after retries.
   */
  private async post(
    baseUrl: string,
    apiKey: string,
    model: string,
    requests: GeminiEmbedRequest[],
  ): Promise<GeminiBatchResponse> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (apiKey) headers['x-goog-api-key'] = apiKey
    const url = `${baseUrl}/models/${encodeURIComponent(model)}:batchEmbedContents`
    const body = JSON.stringify({ requests })

    const MAX_RETRIES = 3
    let response: Response | null = null
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      response = await fetch(url, { method: 'POST', headers, body })
      const retryable =
        response.status === 429 || response.status === 500 || response.status === 503
      if (!retryable || attempt === MAX_RETRIES) break
      const retryAfter = Number.parseInt(response.headers.get('retry-after') ?? '', 10)
      const delayMs =
        Number.isFinite(retryAfter) && retryAfter >= 0
          ? Math.min(retryAfter * 1000, 60_000)
          : Math.min(1000 * 2 ** attempt, 30_000)
      await new Promise<void>((resolve) => setTimeout(resolve, delayMs))
    }

    if (!response!.ok) {
      const text = await response!.text()
      let message = text.length > 0 && text.length < 300 ? text : `HTTP ${response!.status}`
      let code: string | undefined
      try {
        const parsed = JSON.parse(text) as GeminiErrorBody
        if (parsed.error?.message) message = parsed.error.message
        code = parsed.error?.status
      } catch (_error) {
        // Not JSON (e.g. an HTML gateway page) — keep the raw-text message set above.
      }
      throw new GeminiEmbeddingsError(message, response!.status, code)
    }
    return (await response!.json()) as GeminiBatchResponse
  }
}

/**
 * Creates a Gemini API embeddings provider.
 *
 * @param config - Optional configuration (key, model, base URL, dimensions, task).
 * @returns An `AIEmbeddingsProvider` backed by `gemini-embedding-2`.
 */
export function createProvider(config?: GeminiEmbeddingsConfig): AIEmbeddingsProvider {
  return new GeminiEmbeddingsProvider(config)
}

/** Lazily-initialized provider singleton. Defers creation until first use so that env vars are resolved. */
let _provider: AIEmbeddingsProvider | null = null

/**
 * The provider implementation (reads `GOOGLE_AI_API_KEY` per request). Bond it
 * with the ai-embeddings core's `setProvider`.
 */
export const provider: AIEmbeddingsProvider = new Proxy({} as AIEmbeddingsProvider, {
  get(_, prop, receiver) {
    if (!_provider) _provider = createProvider()
    return Reflect.get(_provider, prop, receiver)
  },
})
