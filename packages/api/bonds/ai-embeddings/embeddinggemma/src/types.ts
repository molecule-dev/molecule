/**
 * Configuration for the EmbeddingGemma 2 (Transformers.js) ai-embeddings provider.
 *
 * @module
 */

import type { EmbeddingModality, EmbeddingTask } from '@molecule/api-ai-embeddings'

/** ONNX weight precision. `q8` matches fp32 to ~0.9997 cosine; `q4` to ~0.975 (text ~0.988). */
export type EmbeddingGemmaDtype = 'fp32' | 'fp16' | 'q8' | 'q4' | 'q4f16'

/** Where inference runs. Node uses `cpu`; `webgpu`/`wasm` are browser backends. */
export type EmbeddingGemmaDevice = 'cpu' | 'webgpu' | 'wasm'

/** The Matryoshka sizes the model was trained for. Any other size is rejected. */
export type EmbeddingGemmaDimensions = 768 | 512 | 256 | 128

/** Modalities this bond can load in Node. Video needs a browser (see the package remarks). */
export type EmbeddingGemmaModality = Exclude<EmbeddingModality, 'video'>

/**
 * Configuration for the EmbeddingGemma 2 provider. Every field is optional and
 * has an env-var fallback (`MOL_EMBEDDINGS_EMBEDDINGGEMMA_*`), so the provider
 * works with zero configuration.
 */
export interface EmbeddingGemmaConfig {
  /**
   * Model repo id. Defaults to `onnx-community/embeddinggemma-2-ONNX` or the
   * `MOL_EMBEDDINGS_EMBEDDINGGEMMA_MODEL` env var (e.g. a private mirror).
   */
  model?: string
  /** Weight precision. Defaults to `q8` or `MOL_EMBEDDINGS_EMBEDDINGGEMMA_DTYPE`. */
  dtype?: EmbeddingGemmaDtype
  /** Inference device. Defaults to `cpu` or `MOL_EMBEDDINGS_EMBEDDINGGEMMA_DEVICE`. */
  device?: EmbeddingGemmaDevice
  /**
   * Encoders to load. Defaults to `['text']` or the comma-separated
   * `MOL_EMBEDDINGS_EMBEDDINGGEMMA_MODALITIES` (e.g. `text,image,audio`). Each
   * extra encoder costs memory and download size (q8: vision 195 MB, audio 340 MB),
   * so load only what you embed. `text` is always loaded.
   */
  modalities?: EmbeddingGemmaModality[]
  /**
   * Default output size (Matryoshka truncation + re-normalization). Defaults to
   * 768 or `MOL_EMBEDDINGS_EMBEDDINGGEMMA_DIMENSIONS`.
   */
  dimensions?: EmbeddingGemmaDimensions
  /** Default task for prefixes. Defaults to `search` or `MOL_EMBEDDINGS_EMBEDDINGGEMMA_TASK`. */
  task?: EmbeddingTask
  /**
   * Prepend the model's task prefixes (`task: search result | query: …`,
   * `title: none | text: …`). Defaults to `true`; text that already starts with
   * `task: ` or `title: ` is never prefixed twice.
   */
  applyPrefixes?: boolean
  /** Directory weights are cached in (or `MOL_EMBEDDINGS_EMBEDDINGGEMMA_CACHE_DIR`). */
  cacheDir?: string
  /**
   * Directory holding pre-bundled weights for offline use (or
   * `MOL_EMBEDDINGS_EMBEDDINGGEMMA_MODEL_PATH`). Setting it disables remote fetch
   * unless {@link allowRemoteModels} is explicitly `true`.
   */
  localModelPath?: string
  /** Allow downloading weights on first use. Defaults to `true`, or `false` with {@link localModelPath}. */
  allowRemoteModels?: boolean
  /**
   * Texts per forward pass (or `MOL_EMBEDDINGS_EMBEDDINGGEMMA_BATCH_SIZE`). Defaults
   * to 16. A MEMORY bound: activations for the whole batch are resident at once and
   * attention grows with sequence length (up to 8,192 tokens here). Media inputs
   * always run one per pass. Values below 1 fall back to the default.
   */
  batchSize?: number
}
