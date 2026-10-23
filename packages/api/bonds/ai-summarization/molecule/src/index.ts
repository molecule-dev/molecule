/**
 * molecule.dev hosted AI summarization provider for `@molecule/api-ai-summarization`.
 *
 * Turns a block of text into a concise summary — a paragraph, a bulleted list
 * or a one-sentence TL;DR, with a hard word cap enforced in code — on
 * molecule.dev, billed to your molecule project, no AI-vendor account. It is
 * an ordinary bond: swap it for `@molecule/api-ai-summarization-llm` (your own
 * AI key) without changing code that calls the core.
 *
 * @example
 * ```typescript
 * import { requireProvider, setProvider } from '@molecule/api-ai-summarization'
 * import { provider as summarization } from '@molecule/api-ai-summarization-molecule'
 *
 * setProvider(summarization) // reads MOLECULE_API_KEY from the environment
 *
 * const { summary, withinCap } = await requireProvider().summarize({
 *   text: longArticle,
 *   format: 'tldr',
 *   maxWords: 25,
 * })
 * ```
 *
 * @remarks
 * - Config: `MOLECULE_API_KEY` (SERVER-side only) — a molecule project API key
 *   (`mk_…`) or the in-sandbox token (`mbk_…`) with scope `broker` or
 *   `broker:ai-summarization`. Optional `MOLECULE_SERVICES_URL` (default
 *   `https://api.molecule.dev/api/v1/services`; https required — plain-http is
 *   refused unless the host is loopback or a private-network endpoint such as
 *   the sandbox gateway `host.docker.internal` (RFC 1918 / *.docker.internal)).
 * - Limits mirrored locally: 100k characters of text, `maxWords` ≤ 500,
 *   `sentences` ≤ 10, `attempts` ≤ 5, 2k characters of `focus` — oversized
 *   calls are refused locally and never leave the process.
 * - **`SummarizeInput.model` and `.provider` are NOT forwarded**: the hosted
 *   model is the service's choice. The fields stay meaningful for self-hosted
 *   bonds only.
 * - Metered per request and billed to the project at the model's real token
 *   spend (the same verified catalog every other hosted AI service prices
 *   from). A capped summary may take several model round trips (the service
 *   re-asks when an attempt runs long) — all of them are part of the one
 *   billed request.
 * - HTTP refusals and malformed responses throw `MoleculeServiceError` with
 *   `status` and `errorKey` (401 bad key,
 *   402 allowance used up, 413 over limits, 429 / 503 retry later). Nothing is
 *   retried. Network and cancellation errors propagate unchanged.
 */
export * from './browser-guard.js'
export * from './provider.js'
export * from './secrets.js'
export * from './types.js'

import type { AISummarizationProvider } from '@molecule/api-ai-summarization'

import { createProvider } from './provider.js'

/** Lazily-initialized provider. Defers creation until first use so env vars are resolved. */
let _provider: AISummarizationProvider | null = null

/**
 * The provider implementation (wire with `setProvider`).
 */
export const provider: AISummarizationProvider = new Proxy({} as AISummarizationProvider, {
  get(_, prop, receiver) {
    if (!_provider) _provider = createProvider()
    return Reflect.get(_provider, prop, receiver)
  },
  set(_, prop, value) {
    if (!_provider) _provider = createProvider()
    return Reflect.set(_provider, prop, value)
  },
})
