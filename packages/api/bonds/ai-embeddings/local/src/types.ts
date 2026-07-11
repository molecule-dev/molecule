/**
 * Configuration for the local (Transformers.js) ai-embeddings provider.
 *
 * @module
 */

/** Pooling strategy applied to the model's token embeddings to produce one vector per input. */
export type LocalEmbeddingsPooling = 'cls' | 'mean' | 'none'

/**
 * Configuration for the local embeddings provider. Every field is optional and
 * has an env-var fallback, so the provider works with zero configuration.
 */
export interface LocalEmbeddingsConfig {
  /**
   * Model id (Transformers.js / HuggingFace). Defaults to `Xenova/bge-small-en-v1.5`
   * (384-dim) or the `MOL_EMBEDDINGS_LOCAL_MODEL` env var.
   */
  model?: string
  /** Pooling strategy. Defaults to `cls` — bge models are trained for CLS pooling. */
  pooling?: LocalEmbeddingsPooling
  /** L2-normalize outputs so a dot product equals cosine similarity. Defaults to `true`. */
  normalize?: boolean
  /**
   * Directory Transformers.js caches downloaded weights in (or the
   * `MOL_EMBEDDINGS_LOCAL_CACHE_DIR` env var). Use a persistent path so the
   * one-time download survives restarts.
   */
  cacheDir?: string
  /**
   * Directory holding a pre-bundled model for fully-offline / air-gapped use (or
   * the `MOL_EMBEDDINGS_LOCAL_MODEL_PATH` env var). Setting it disables remote
   * fetch unless {@link allowRemoteModels} is explicitly `true`.
   */
  localModelPath?: string
  /**
   * Allow downloading the model from HuggingFace on first use. Defaults to `true`,
   * or `false` when {@link localModelPath} is set.
   */
  allowRemoteModels?: boolean
}
