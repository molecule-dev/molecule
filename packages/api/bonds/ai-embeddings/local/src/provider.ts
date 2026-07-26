/**
 * Local ai-embeddings provider for molecule.dev.
 *
 * Runs a small sentence-embedding model (default `bge-small-en-v1.5`, 384-dim)
 * in-process via Transformers.js (onnxruntime) — no API key, no per-call cost,
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

import type {
  AIEmbeddingsProvider,
  EmbeddingResult,
  EmbedParams,
} from '@molecule/api-ai-embeddings'

import type { LocalEmbeddingsConfig } from './types.js'

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

/** Minimal structural view of a Transformers.js feature-extraction result tensor. */
interface EmbeddingTensor {
  tolist(): number[][]
}

/** Text → vectors function backed by a loaded model. */
type Extractor = (texts: string[]) => Promise<number[][]>

/**
 * Load the Transformers.js pipeline and wrap it as a plain text→vectors function.
 * Dynamically imported so consumers that never embed don't pay the model/runtime
 * load cost, and so this module imports even where the native addon is absent
 * (the error then surfaces only when an embedding is actually requested).
 *
 * The returned extractor embeds in fixed-size batches. Chunking lives HERE, not
 * in the individual provider methods, so every path through the provider is
 * bounded by construction — `embed`, `embedQuery` and `embedDocuments` all
 * funnel through this one function, and a method added later inherits the bound
 * instead of having to remember it.
 *
 * Sequence length needs no equivalent guard: the feature-extraction pipeline
 * tokenizes with `truncation: true`, so an arbitrarily long input is cut to the
 * model's maximum rather than widening the batch. Batch size is therefore the
 * only unbounded dimension, and this closes it.
 *
 * @param config - Provider configuration.
 * @param model - Resolved model id.
 * @param pooling - Resolved pooling strategy.
 * @param normalize - Whether to L2-normalize outputs.
 * @param batchSize - Texts per forward pass (already resolved and clamped).
 * @returns An extractor function.
 */
async function initExtractor(
  config: LocalEmbeddingsConfig,
  model: string,
  pooling: NonNullable<LocalEmbeddingsConfig['pooling']>,
  normalize: boolean,
  batchSize: number,
): Promise<Extractor> {
  const { pipeline, env } = await import('@huggingface/transformers')

  const localModelPath = config.localModelPath ?? process.env.MOL_EMBEDDINGS_LOCAL_MODEL_PATH
  if (localModelPath) {
    env.localModelPath = localModelPath
    env.allowRemoteModels = config.allowRemoteModels ?? false
  } else if (config.allowRemoteModels !== undefined) {
    env.allowRemoteModels = config.allowRemoteModels
  }
  const cacheDir = config.cacheDir ?? process.env.MOL_EMBEDDINGS_LOCAL_CACHE_DIR
  if (cacheDir) env.cacheDir = cacheDir

  const pipe = await pipeline('feature-extraction', model)
  return async (texts: string[]): Promise<number[][]> => {
    const vectors: number[][] = []
    for (let start = 0; start < texts.length; start += batchSize) {
      // Sequential, not Promise.all: concurrent passes would each hold their own
      // activations and reinstate exactly the peak this batching removes.
      // Transformers.js types the pipeline call as a broad task union; narrow to
      // the feature-extraction tensor shape we know we get. (Boundary cast, not
      // an error suppression — skipLibCheck already trusts the lib's own types.)
      const tensor = (await pipe(texts.slice(start, start + batchSize), {
        pooling,
        normalize,
      })) as unknown as EmbeddingTensor
      // Push per row rather than concat-ing arrays, so one output array grows in
      // place instead of reallocating a copy of everything embedded so far.
      for (const vector of tensor.tolist()) vectors.push(vector)
    }
    return vectors
  }
}

/**
 * Create a local embeddings provider. Config falls back to env vars, so
 * `createProvider()` with no arguments works out of the box.
 *
 * @param config - Optional model / pooling / cache configuration.
 * @returns An {@link AIEmbeddingsProvider} backed by an in-process ONNX model.
 */
export function createProvider(config: LocalEmbeddingsConfig = {}): AIEmbeddingsProvider {
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

  // Single-flight lazy init: the model + onnxruntime load only on the first
  // embedding request, and only once for the life of the provider.
  let extractorPromise: Promise<Extractor> | null = null
  const getExtractor = (): Promise<Extractor> => {
    if (!extractorPromise) {
      extractorPromise = initExtractor(config, model, pooling, normalize, batchSize).catch(
        (error) => {
          // Reset so a later call can retry a transient init failure (e.g. a
          // first-run download hiccup) rather than being stuck on the rejection.
          extractorPromise = null
          throw error
        },
      )
    }
    return extractorPromise
  }

  return {
    name: 'local',

    async embed(params: EmbedParams): Promise<EmbeddingResult> {
      const inputs = Array.isArray(params.input) ? params.input : [params.input]
      // Local inference is not billed; usage is always zero.
      if (inputs.length === 0)
        return { embeddings: [], model, usage: { promptTokens: 0, totalTokens: 0 } }
      const extractor = await getExtractor()
      const embeddings = await extractor(inputs)
      return { embeddings, model, usage: { promptTokens: 0, totalTokens: 0 } }
    },

    async embedQuery(text: string): Promise<number[]> {
      const extractor = await getExtractor()
      const [vector] = await extractor([text])
      return vector ?? []
    },

    async embedDocuments(texts: string[]): Promise<number[][]> {
      if (texts.length === 0) return []
      const extractor = await getExtractor()
      return extractor(texts)
    },
  }
}

/** Lazily-initialized provider singleton (defers the model load until first use). */
let _provider: AIEmbeddingsProvider | null = null

/**
 * The provider implementation. Bond it with the ai-embeddings core's
 * `setProvider`. Model loading is deferred until the first embedding call.
 */
export const provider: AIEmbeddingsProvider = new Proxy({} as AIEmbeddingsProvider, {
  get(_target, prop, receiver) {
    if (!_provider) _provider = createProvider()
    return Reflect.get(_provider, prop, receiver)
  },
})
