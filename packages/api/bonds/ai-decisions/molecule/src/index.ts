/**
 * molecule.dev hosted AI decisions provider for `@molecule/api-ai-decisions`.
 *
 * Answers typed questions (pick an option, score on a scale, yes/no) about a
 * piece of text or JSON — with probability distributions — on molecule.dev,
 * billed to your molecule project, no AI-vendor account. It is an ordinary
 * bond: swap it for `@molecule/api-ai-decisions-llm` (your own AI key)
 * without changing code that calls the core.
 *
 * @example
 * ```typescript
 * import { setProvider } from '@molecule/api-ai-decisions'
 * import { provider as decisions } from '@molecule/api-ai-decisions-molecule'
 *
 * setProvider(decisions) // reads MOLECULE_API_KEY from the environment
 *
 * const { answers } = await requireProvider().decide({
 *   state: supportTicket.body,
 *   questions: {
 *     department: {
 *       type: 'choice',
 *       instructions: 'Which team should handle this ticket?',
 *       criteria: { billing: 'invoices, refunds', tech: 'bugs, outages' },
 *     },
 *     urgent: { type: 'yesNo', instructions: 'Is the customer angry?' },
 *   },
 *   minConfidence: 0.6,
 * })
 * ```
 *
 * @remarks
 * - Config: `MOLECULE_API_KEY` (SERVER-side only) — a molecule project API key
 *   (`mk_…`) or the in-sandbox token (`mbk_…`) with scope `broker` or
 *   `broker:ai-decisions`. Optional `MOLECULE_SERVICES_URL` (default
 *   `https://api.molecule.dev/api/v1/services`; https required — plain-http is
 *   refused unless the host is loopback or a private-network endpoint such as
 *   the sandbox gateway `host.docker.internal` (RFC 1918 / *.docker.internal)).
 * - Limits mirrored locally: 100k characters of text state, 10 questions,
 *   3 images of 2 MB each — oversized calls are refused with 413 and never
 *   leave the process.
 * - **`DecideInput.model` is NOT forwarded**: the hosted model is the
 *   service's choice. The field stays meaningful for self-hosted bonds only.
 * - The hosted path reads images only if the service's model sees them; the
 *   service documents its current model's vision support.
 * - Metered per request and billed to the project at the model's real token
 *   spend (the same verified catalog every other hosted AI service prices
 *   from).
 * - Errors are `MoleculeServiceError` with `status` and `errorKey` (401 bad key,
 *   402 allowance used up, 413 over limits, 429 / 503 retry later). Nothing is
 *   retried.
 */
export * from './browser-guard.js'
export * from './provider.js'
export * from './secrets.js'
export * from './types.js'

import type { AIDecisionsProvider } from '@molecule/api-ai-decisions'

import { createProvider } from './provider.js'

/** Lazily-initialized provider. Defers creation until first use so env vars are resolved. */
let _provider: AIDecisionsProvider | null = null

/**
 * The provider implementation (wire with `setProvider`).
 */
export const provider: AIDecisionsProvider = new Proxy({} as AIDecisionsProvider, {
  get(_, prop, receiver) {
    if (!_provider) _provider = createProvider()
    return Reflect.get(_provider, prop, receiver)
  },
  set(_, prop, value) {
    if (!_provider) _provider = createProvider()
    return Reflect.set(_provider, prop, value)
  },
})
