/**
 * Local (offline) ai-embeddings provider for molecule.dev.
 *
 * Runs a small sentence-embedding model (default `bge-small-en-v1.5`, 384-dim)
 * in a worker thread via Transformers.js (onnxruntime) — no API key, no per-call cost, and
 * no network at query time. Bond it once at startup, then use the
 * `@molecule/api-ai-embeddings` core anywhere.
 *
 * @example
 * ```ts
 * import { setProvider } from '@molecule/api-ai-embeddings'
 * import { provider } from '@molecule/api-ai-embeddings-local'
 *
 * setProvider(provider) // at startup
 *
 * // anywhere after:
 * import { requireProvider } from '@molecule/api-ai-embeddings'
 * const vector = await requireProvider().embedQuery('some text') // number[] (384 dims)
 * const vectors = await requireProvider().embedDocuments(['a', 'b']) // number[][]
 * ```
 *
 * @remarks
 * - **The model loads lazily on the first embed call** (~a few seconds) and then
 *   stays resident (~200–300 MB RAM). Nothing loads if you never embed.
 * - **Model loading, tokenization and inference run off the caller's event loop.**
 *   One worker per provider serializes requests, with one ONNX inference thread
 *   by default. Call `close()` to release it; an idle worker does not keep Node alive.
 *   Requests time out after five minutes (including queue time), rejecting pending
 *   work and allowing the next call to retry with a fresh worker. Configure
 *   `inferenceThreads` / `requestTimeoutMs` or `MOL_EMBEDDINGS_LOCAL_THREADS` /
 *   `MOL_EMBEDDINGS_LOCAL_TIMEOUT_MS` to override those bounds.
 * - **First use downloads the model (~34 MB) and caches it.** For fully-offline /
 *   air-gapped deployments, bundle the model and set `localModelPath` (or the
 *   `MOL_EMBEDDINGS_LOCAL_MODEL_PATH` env var) — that disables the remote fetch.
 * - Configure via `createProvider({ model, pooling, cacheDir, localModelPath })` or
 *   the `MOL_EMBEDDINGS_LOCAL_*` env vars. Outputs are L2-normalized, so a dot
 *   product equals cosine similarity.
 * - Pulls `@huggingface/transformers` + `onnxruntime-node` (~350 MB installed) — a
 *   real third-party dependency, unlike most `@molecule/*` packages. Add it only
 *   where you actually embed.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './types.js'
