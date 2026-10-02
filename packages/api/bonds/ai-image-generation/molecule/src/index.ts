/**
 * molecule.dev hosted image generation provider for
 * `@molecule/api-ai-image-generation`.
 *
 * Generates images from text prompts on molecule.dev and bills each image to
 * your molecule project, so the app needs no image-vendor account. It is an
 * ordinary bond: swap it for `@molecule/api-ai-image-generation-openai` (your
 * own key) or `@molecule/api-ai-image-generation-stability` without changing
 * code that calls the core.
 *
 * @example
 * ```typescript
 * import { setProvider, requireProvider } from '@molecule/api-ai-image-generation'
 * import { provider as images } from '@molecule/api-ai-image-generation-molecule'
 *
 * setProvider(images) // reads MOLECULE_API_KEY from the environment
 *
 * const { images: results } = await requireProvider().generate({
 *   prompt: 'A flat vector logo of a molecule, teal on white',
 *   size: '1024x1024',
 *   quality: 'high',
 * })
 * // results[i].base64 is png bytes — save it (uploads bond) before serving;
 * // there is no URL field to hotlink.
 * ```
 *
 * @remarks
 * - Config: `MOLECULE_API_KEY` (SERVER-side only) — a molecule project API key
 *   (`mk_…`) with scope `broker` or `broker:image-generation`. Optional
 *   `MOLECULE_SERVICES_URL` (default `https://api.molecule.dev/api/v1/services`;
 *   required — plain-http is refused unless the host is loopback or a private-network endpoint (RFC 1918 / *.docker.internal, e.g. the sandbox gateway host.docker.internal)).
 * - **Every image passed molecule.dev's moderation classifier before it was
 *   returned.** A refused prompt or image throws `MoleculeServiceError` (400,
 *   `hostedServices.error.contentFlagged`) and nothing is billed for the call.
 * - **`quality` is explicit and priced: `low`, `medium` (default) or `high`.**
 *   `"auto"` is refused (400) because OpenAI publishes no per-image price for
 *   it — every served call must have a deterministic cost. Sizes:
 *   `1024x1024`, `1024x1536`, `1536x1024`; `n` caps at 4; prompts at 2000
 *   characters (413 above that). Local pre-checks mirror these limits, so an
 *   invalid call fails before any request.
 * - **Generation is SLOW — the default timeout is 120 seconds**, not the other
 *   hosted bonds' 15: a 1536x1024 `high` image can take tens of seconds. Queue
 *   generation behind a job for interactive UIs instead of awaiting it in a
 *   request that also holds a browser connection.
 * - Results are base64 png only — `responseFormat` is not forwarded and the
 *   provider URL field is stripped (it is molecule's and short-lived). Persist
 *   what you keep via the uploads bond.
 * - Only `generate` is implemented (`edit`/`imageToImage`/`upscale` are not
 *   served) — feature-detect optional methods as the core's remarks prescribe.
 * - Metered per image and billed to the project at OpenAI's published
 *   per-image price for the model/size/quality used. Errors are
 *   `MoleculeServiceError` with `status` and `errorKey` (401 bad key, 402
 *   allowance used up, 429 / 503 retry later). Nothing is retried.
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './secrets.js'
export * from './types.js'

import type { AIImageGenerationProvider } from '@molecule/api-ai-image-generation'

import { createProvider } from './provider.js'

/** Lazily-initialized provider. Defers creation until first use so env vars are resolved. */
let _provider: AIImageGenerationProvider | null = null

/**
 * The provider implementation (wire with `setProvider`).
 */
export const provider: AIImageGenerationProvider = new Proxy({} as AIImageGenerationProvider, {
  get(_, prop, receiver) {
    if (!_provider) _provider = createProvider()
    return Reflect.get(_provider, prop, receiver)
  },
  set(_, prop, value) {
    if (!_provider) _provider = createProvider()
    return Reflect.set(_provider, prop, value)
  },
})
