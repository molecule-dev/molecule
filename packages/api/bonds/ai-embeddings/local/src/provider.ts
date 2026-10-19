/**
 * Local ai-embeddings provider for molecule.dev.
 *
 * Runs a small sentence-embedding model (default `bge-small-en-v1.5`, 384-dim)
 * in a worker thread via Transformers.js (onnxruntime) — no API key, no per-call cost,
 * and no network at query time. The model is downloaded + cached on first use,
 * or bundled via {@link LocalEmbeddingsConfig.localModelPath} for fully-offline
 * deployments. Ideal for semantic search over a modest corpus without a hosted
 * embeddings dependency.
 *
 * Because inference runs IN-PROCESS, memory is this provider's real constraint
 * rather than rate limits or per-call cost. Every embedding path batches (see
 * {@link LocalEmbeddingsConfig.batchSize}), so peak memory is a function of the
 * batch size and not of how much the caller passes in — handing it a whole
 * corpus is safe.
 *
 * @module
 */

import type { EmbeddingResult, EmbedParams } from '@molecule/api-ai-embeddings'

import type { LocalEmbeddingsConfig, LocalEmbeddingsProvider } from './types.js'
import type { ResolvedLocalEmbeddingsConfig } from './worker-client.js'
import { createWorkerExtractor } from './worker-client.js'

/** Default model — small, fast, strong retrieval quality, 384-dim. */
const DEFAULT_MODEL = 'Xenova/bge-small-en-v1.5'

/**
 * Texts per forward pass when the caller doesn't specify.
 *
 * Small enough that peak memory stays flat on a container with a modest limit,
 * large enough that per-pass overhead stays amortized. See
 * {@link LocalEmbeddingsConfig.batchSize} for why this is a memory bound rather
 * than a tuning preference.
 */
const DEFAULT_BATCH_SIZE = 32

/**
 * Create a local embeddings provider. Config falls back to env vars, so
 * `createProvider()` with no arguments works out of the box.
 *
 * @param config - Optional model / pooling / cache configuration.
 * @returns A {@link LocalEmbeddingsProvider} backed by a worker-hosted ONNX model.
 */
export function createProvider(config: LocalEmbeddingsConfig = {}): LocalEmbeddingsProvider {
  const model = config.model ?? process.env.MOL_EMBEDDINGS_LOCAL_MODEL ?? DEFAULT_MODEL
  const pooling = config.pooling ?? 'cls'
  const normalize = config.normalize ?? true
  // A malformed env var must not silently remove the memory bound, so anything
  // non-numeric falls back to the default and anything under 1 clamps to 1
  // (batchSize 0 would loop forever without embedding anything).
  const configured = config.batchSize ?? Number(process.env.MOL_EMBEDDINGS_LOCAL_BATCH_SIZE)
  const batchSize =
    Number.isFinite(configured) && configured > 0
      ? Math.max(1, Math.floor(configured))
      : DEFAULT_BATCH_SIZE

  const positiveInteger = (value: number | undefined, fallback: number): number =>
    Number.isFinite(value) && value! > 0 ? Math.max(1, Math.floor(value!)) : fallback
  const resolved: ResolvedLocalEmbeddingsConfig = {
    ...config,
    model,
    pooling,
    normalize,
    batchSize,
    localModelPath: config.localModelPath ?? process.env.MOL_EMBEDDINGS_LOCAL_MODEL_PATH,
    cacheDir: config.cacheDir ?? process.env.MOL_EMBEDDINGS_LOCAL_CACHE_DIR,
    inferenceThreads: positiveInteger(
      config.inferenceThreads ?? Number(process.env.MOL_EMBEDDINGS_LOCAL_THREADS),
      1,
    ),
    requestTimeoutMs: Math.min(
      2_147_483_647,
      positiveInteger(
        config.requestTimeoutMs ?? Number(process.env.MOL_EMBEDDINGS_LOCAL_TIMEOUT_MS),
        300_000,
      ),
    ),
  }
  const worker = createWorkerExtractor(resolved)

  return {
    name: 'local',
    close: () => worker.close(),

    async embed(params: EmbedParams): Promise<EmbeddingResult> {
      const inputs = Array.isArray(params.input) ? params.input : [params.input]
      // Local inference is not billed; usage is always zero.
      if (inputs.length === 0)
        return { embeddings: [], model, usage: { promptTokens: 0, totalTokens: 0 } }
      const embeddings = await worker.extract(inputs)
      return { embeddings, model, usage: { promptTokens: 0, totalTokens: 0 } }
    },

    async embedQuery(text: string): Promise<number[]> {
      const [vector] = await worker.extract([text])
      return vector ?? []
    },

    async embedDocuments(texts: string[]): Promise<number[][]> {
      if (texts.length === 0) return []
      return worker.extract(texts)
    },
  }
}

/** Lazily-initialized provider singleton (defers the model load until first use). */
let _provider: LocalEmbeddingsProvider | null = null

/**
 * The provider implementation. Bond it with the ai-embeddings core's
 * `setProvider`. Model loading is deferred until the first embedding call.
 */
export const provider: LocalEmbeddingsProvider = new Proxy({} as LocalEmbeddingsProvider, {
  get(_target, prop, receiver) {
    if (!_provider) _provider = createProvider()
    return Reflect.get(_provider, prop, receiver)
  },
})
