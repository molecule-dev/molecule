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
  /**
   * How many texts to run through the model per forward pass (or the
   * `MOL_EMBEDDINGS_LOCAL_BATCH_SIZE` env var). Defaults to 32.
   *
   * This is a MEMORY bound, not a throughput knob. Inference is in-process, so
   * the whole batch's activations are resident at once and attention allocates
   * on the order of `batch × heads × sequence²`. Handing the model an entire
   * corpus in one call therefore scales peak RSS with the corpus: indexing 898
   * documents unbatched peaked at ~3.8 GiB and was OOM-killed under a 1–2 GiB
   * container limit — and since the kernel delivers that kill, no `catch` in
   * the calling code can degrade gracefully.
   *
   * Raise it if you have headroom and want fewer, larger passes; lower it for a
   * tighter memory ceiling. Values below 1 are clamped to 1.
   */
  batchSize?: number
}
