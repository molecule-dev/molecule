/**
 * Local (offline) ai-embeddings provider for molecule.dev.
 *
 * Runs a small sentence-embedding model (default `bge-small-en-v1.5`, 384-dim)
 * in-process via Transformers.js (onnxruntime) — no API key, no per-call cost, and
 * no network at query time. Bond it once at startup, then use the
 * `@molecule/api-ai-embeddings` core anywhere.
 *
 * @example
 * ```typescript
 * import { requireProvider, setProvider } from '@molecule/api-ai-embeddings'
 * import { createProvider } from '@molecule/api-ai-embeddings-local'
 *
 * // Startup: no API key. Options fall back to the MOL_EMBEDDINGS_LOCAL_* env vars.
 * setProvider(createProvider({ model: 'Xenova/bge-small-en-v1.5' }))
 *
 * const docs = ['How do I reset my password?', 'Billing and invoices']
 * const docVectors = await requireProvider().embedDocuments(docs) // number[][], 384 dims each
 * const query = await requireProvider().embedQuery('forgot my password') // number[]
 *
 * // Outputs are L2-normalized, so the dot product IS the cosine similarity.
 * const dot = (a: number[], b: number[]) => a.reduce((sum, x, i) => sum + x * (b[i] ?? 0), 0)
 * const scores = docVectors.map((vector) => dot(vector, query))
 * console.log(docs[scores.indexOf(Math.max(...scores))]) // 'How do I reset my password?'
 * ```
 *
 * @remarks
 * - **The model loads lazily on the first embed call** (~a few seconds) and then
 *   stays resident (~200–300 MB RAM). Nothing loads if you never embed.
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
