/**
 * Jev decisions provider for molecule.dev — typed decisions from TypeSafe AI's
 * hosted Jev "System One" model.
 *
 * Jev answers `choice`, `score` and yes/no questions about text or JSON with a
 * probability distribution instead of generated text. This bond calls
 * `POST https://api.typesafe.ai/v1/systemone` with your `TYPESAFE_API_KEY`.
 * The open-weights Laya server speaks the same protocol, so
 * `@molecule/api-ai-decisions-laya` is a drop-in self-hosted swap.
 *
 * @example
 * ```typescript
 * import { setProvider, requireProvider } from '@molecule/api-ai-decisions'
 * import { provider } from '@molecule/api-ai-decisions-jev'
 *
 * setProvider(provider) // reads TYPESAFE_API_KEY on first use
 *
 * const { answers } = await requireProvider().decide({
 *   state: { from: 'ana@example.com', body: 'Your app deleted my notes!!' },
 *   questions: {
 *     severity: { type: 'score', instructions: 'How severe is the problem?', criteria: ['cosmetic', 'annoying', 'blocking', 'data loss'] },
 *     churnRisk: { type: 'yesNo', instructions: 'The customer is likely to cancel.' },
 *   },
 * })
 * answers.severity.level        // 3
 * answers.churnRisk.probability // 0.81
 * ```
 *
 * @remarks
 * - Config: `TYPESAFE_API_KEY` (required — sent as `Authorization: Bearer …`),
 *   `TYPESAFE_BASE_URL` (optional; a gateway, or a `laya-serve` host), and
 *   `createProvider({ model })` (default `'jev-latest'`, or pass `model` per call).
 * - **Limits (TypeSafe docs):** up to 255 options per `choice`, 2–10 levels per
 *   `score`. 429 (rate limit) and 529 (overloaded) are retried up to 3 times
 *   with backoff; 401 and 422 throw immediately with the API's message and a
 *   `status` property.
 * - **English-first.** TypeSafe describes English as Jev's primary training
 *   language; for other languages evaluate carefully or use Laya's
 *   multilingual checkpoint.
 * - **Your data leaves your servers** (TypeSafe processes the `state`). For
 *   data that must stay in your environment, bond the Laya provider instead.
 * - `confidence` in the answers is the probability of the reported answer,
 *   NOT Jev's own `confidence` field (see the core's remarks).
 * - Use the core's `setProvider`, not `bond('ai-decisions', …)` directly.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './secrets.js'
export * from './types.js'
export * from './wire.js'
