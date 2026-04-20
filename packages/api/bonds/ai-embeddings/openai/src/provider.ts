/**
 * OpenAI implementation of AIEmbeddingsProvider.
 *
 * Uses the OpenAI Embeddings API to generate vector embeddings
 * from text inputs. Supports text-embedding-3-small, text-embedding-3-large,
 * and text-embedding-ada-002 models.
 *
 * @module
 */

import type {
  AIEmbeddingsProvider,
  EmbeddingResult,
  EmbedParams,
} from '@molecule/api-ai-embeddings'

import type { OpenaiEmbeddingsConfig } from './types.js'

/** Shape of a single embedding object in the OpenAI API response. */
interface OpenAIEmbeddingObject {
  object: 'embedding'
  index: number
  embedding: number[]
}

/** Shape of the OpenAI Embeddings API response. */
interface OpenAIEmbeddingsResponse {
  object: 'list'
  data: OpenAIEmbeddingObject[]
  model: string
  usage: {
    prompt_tokens: number
    total_tokens: number
  }
}

/** Shape of an OpenAI API error response. */
interface OpenAIErrorResponse {
  error?: {
    message?: string
    type?: string
    code?: string
  }
}

/**
 * OpenAI embeddings provider that implements the `AIEmbeddingsProvider` interface
 * using the OpenAI Embeddings API with support for configurable models, dimensions,
 * and automatic batching.
 */
class OpenaiEmbeddingsProvider implements AIEmbeddingsProvider {
  readonly name = 'openai'
  private apiKey: string
  private defaultModel: string
  private baseUrl: string
  private maxBatchSize: number
  private defaultDimensions: number | undefined

  /**
   * Creates a new OpenAI embeddings provider.
   *
   * @param config - Provider configuration. API key defaults to OPENAI_API_KEY env var.
   */
  constructor(config: OpenaiEmbeddingsConfig = {}) {
    this.apiKey = config.apiKey ?? process.env.OPENAI_API_KEY ?? ''
    this.defaultModel = config.defaultModel ?? 'text-embedding-3-small'
    this.baseUrl = config.baseUrl ?? 'https://api.openai.com'
    this.maxBatchSize = config.maxBatchSize ?? 2048
    this.defaultDimensions = config.dimensions
  }

  /**
   * Generate embeddings for one or more text inputs via the OpenAI Embeddings API.
   *
   * Automatically batches large input arrays according to `maxBatchSize`.
   * Supports the `dimensions` parameter for text-embedding-3 models.
   *
   * @param params - Embedding parameters including input text(s), model, and dimensions.
   * @returns Embedding vectors with model name and token usage metadata.
   */
  async embed(params: EmbedParams): Promise<EmbeddingResult> {
    const model = params.model ?? this.defaultModel
    const dimensions = params.dimensions ?? this.defaultDimensions
    const inputs = Array.isArray(params.input) ? params.input : [params.input]

    if (inputs.length === 0) {
      return { embeddings: [], model, usage: { promptTokens: 0, totalTokens: 0 } }
    }

    // Batch large inputs
    if (inputs.length > this.maxBatchSize) {
      return this.embedBatched(inputs, model, dimensions)
    }

    return this.callApi(inputs, model, dimensions)
  }

  /**
   * Generate a single embedding vector for a query string.
   *
   * @param text - The query text to embed.
   * @returns A single embedding vector.
   */
  async embedQuery(text: string): Promise<number[]> {
    const result = await this.embed({ input: text })
    return result.embeddings[0]
  }

  /**
   * Generate embedding vectors for multiple documents in batch.
   *
   * @param texts - The document texts to embed.
   * @returns An array of embedding vectors, one per document.
   */
  async embedDocuments(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return []
    const result = await this.embed({ input: texts })
    return result.embeddings
  }

  /**
   * Handles inputs that exceed `maxBatchSize` by splitting into chunks
   * and aggregating results.
   *
   * @param inputs - All input texts.
   * @param model - Model to use.
   * @param dimensions - Optional dimension count.
   * @returns Aggregated embedding result.
   */
  private async embedBatched(
    inputs: string[],
    model: string,
    dimensions: number | undefined,
  ): Promise<EmbeddingResult> {
    const allEmbeddings: number[][] = []
    let totalPromptTokens = 0
    let totalTotalTokens = 0
    let resultModel = model

    for (let i = 0; i < inputs.length; i += this.maxBatchSize) {
      const batch = inputs.slice(i, i + this.maxBatchSize)
      const result = await this.callApi(batch, model, dimensions)
      allEmbeddings.push(...result.embeddings)
      totalPromptTokens += result.usage.promptTokens
      totalTotalTokens += result.usage.totalTokens
      resultModel = result.model
    }

    return {
      embeddings: allEmbeddings,
      model: resultModel,
      usage: { promptTokens: totalPromptTokens, totalTokens: totalTotalTokens },
    }
  }

  /**
   * Makes a single API call to the OpenAI Embeddings endpoint.
   *
   * Implements retry with exponential backoff for rate-limit (429)
   * and server error (500, 503, 529) responses.
   *
   * @param inputs - Array of texts to embed.
   * @param model - Model identifier.
   * @param dimensions - Optional dimension count for text-embedding-3 models.
   * @returns Parsed embedding result.
   * @throws {Error} on non-retryable API errors.
   */
  private async callApi(
    inputs: string[],
    model: string,
    dimensions: number | undefined,
  ): Promise<EmbeddingResult> {
    const body: Record<string, unknown> = {
      model,
      input: inputs,
      encoding_format: 'float',
    }

    if (dimensions !== undefined) {
      body.dimensions = dimensions
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.apiKey}`,
    }

    const MAX_RETRIES = 3
    let response: Response | null = null

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      response = await fetch(`${this.baseUrl}/v1/embeddings`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      })

      if (response.status === 429 || response.status === 503 || response.status === 529) {
        if (attempt < MAX_RETRIES) {
          const retryAfter = response.headers.get('retry-after')
          const delayMs = retryAfter
            ? Math.min(parseInt(retryAfter, 10) * 1000, 60_000)
            : Math.min(1000 * 2 ** attempt, 30_000)
          await new Promise<void>((resolve) => setTimeout(resolve, delayMs))
          continue
        }
      }
      break
    }

    if (!response!.ok) {
      const errorBody = await response!.text()
      let detail = `HTTP ${response!.status}`
      try {
        const parsed = JSON.parse(errorBody) as OpenAIErrorResponse
        if (parsed.error?.message) detail = parsed.error.message
      } catch {
        if (errorBody.length > 0 && errorBody.length < 200) detail = errorBody
      }

      throw new Error(`OpenAI Embeddings API error: ${detail}`)
    }

    const data = (await response!.json()) as OpenAIEmbeddingsResponse

    // Sort by index to ensure correct ordering
    const sorted = data.data.sort((a, b) => a.index - b.index)

    return {
      embeddings: sorted.map((item) => item.embedding),
      model: data.model,
      usage: {
        promptTokens: data.usage.prompt_tokens,
        totalTokens: data.usage.total_tokens,
      },
    }
  }
}

/**
 * Creates an OpenAI embeddings provider instance.
 *
 * @param config - OpenAI-specific configuration (API key, model, base URL, dimensions).
 * @returns An `AIEmbeddingsProvider` backed by the OpenAI Embeddings API.
 */
export function createProvider(config?: OpenaiEmbeddingsConfig): AIEmbeddingsProvider {
  return new OpenaiEmbeddingsProvider(config)
}
