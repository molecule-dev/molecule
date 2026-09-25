/**
 * molecule.dev hosted embeddings provider for `@molecule/api-ai-embeddings`.
 *
 * Embeddings run on molecule.dev and are billed to your molecule project, so
 * the app needs no OpenAI account. It is an ordinary bond: swap it for
 * `@molecule/api-ai-embeddings-openai` (your own key) or
 * `@molecule/api-ai-embeddings-local` (self-hosted) without changing code that
 * calls the core.
 *
 * @example
 * ```typescript
 * import { setProvider, requireProvider } from '@molecule/api-ai-embeddings'
 * import { provider } from '@molecule/api-ai-embeddings-molecule'
 *
 * setProvider(provider) // reads MOLECULE_API_KEY from the environment
 *
 * const { embeddings, usage } = await requireProvider().embed({
 *   input: ['first document', 'second document'],
 * })
 * const queryVector = await requireProvider().embedQuery('what is molecule?')
 * ```
 *
 * @remarks
 * - Config: `MOLECULE_API_KEY` (SERVER-side only) — a molecule project API key
 *   (`mk_…`) with scope `broker` or `broker:embeddings`. In the molecule.dev IDE
 *   the platform can write it for you. Optional `MOLECULE_SERVICES_URL`
 *   (default `https://api.molecule.dev/api/v1/services`).
 * - Models: `text-embedding-3-small` (default, 1536 dims) and
 *   `text-embedding-3-large` (3072). Other model ids are refused with a 400 —
 *   the service never runs a model it cannot price. `dimensions` (1–3072)
 *   shortens vectors.
 * - Vectors from different models (or different `dimensions`) are NOT
 *   comparable. Store the model id next to each vector, and re-embed everything
 *   if you change it. Swapping this bond for the OpenAI bond with the same
 *   model keeps vectors compatible; swapping to the local bond does not.
 * - Large inputs are split automatically into requests of at most 256 texts /
 *   400,000 characters; one text over 32,000 characters throws — chunk long
 *   documents first (you should anyway, for retrieval quality).
 * - Errors are `MoleculeServiceError` with `status` and `errorKey`. 401: bad or
 *   revoked key. 402: the project owner's included allowance is used up —
 *   usage billing must be enabled on molecule.dev. 429: too many requests for
 *   the project. 503: the platform paused the service briefly (retry later).
 *   None of these are retried for you.
 * - Never import this from browser code: the key would ship to every visitor.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './secrets.js'
export * from './types.js'

import type { AIEmbeddingsProvider } from '@molecule/api-ai-embeddings'

import { createProvider } from './provider.js'

/** Lazily-initialized provider singleton. Defers creation until first use so that env vars are resolved. */
let _provider: AIEmbeddingsProvider | null = null

/**
 * The provider implementation.
 */
export const provider: AIEmbeddingsProvider = new Proxy({} as AIEmbeddingsProvider, {
  get(_, prop, receiver) {
    if (!_provider) _provider = createProvider()
    return Reflect.get(_provider, prop, receiver)
  },
  // set trap: methods run with `this` bound to the proxy — without it, instance-state writes land on the dummy target and are lost (see api-push-notifications-web-push)
  set(_, prop, value) {
    if (!_provider) _provider = createProvider()
    return Reflect.set(_provider, prop, value)
  },
})
