/**
 * AI image-generation core interface for molecule.dev.
 *
 * Defines the `AIImageGenerationProvider` contract — generate images from text
 * prompts, plus optional edit (inpainting), image-to-image, and upscale
 * operations — and the accessor (`setProvider`/`getProvider`/`hasProvider`/
 * `requireProvider`). Interface-only: bond a provider package (e.g.
 * `@molecule/api-ai-image-generation-openai`,
 * `@molecule/api-ai-image-generation-stability`).
 *
 * @remarks
 * - **Wire it with THIS package's `setProvider()` — NOT `bond('ai-image-generation', …)`.**
 *   This core keeps its own singleton and does not read the `@molecule/api-bond`
 *   registry: a generic `bond(...)` call appears to succeed, but `requireProvider()`
 *   still throws at first use. Call `setProvider(...)` in the app's bond setup.
 * - **Feature-detect the optional methods.** Only `generate()` is required;
 *   `edit`/`imageToImage`/`upscale`/`generateImage` are optional — guard with
 *   `if (provider.edit)` and surface "not supported" instead of calling
 *   unconditionally (an absent method is a runtime TypeError that type-checks).
 * - **Two param dialects exist; only `prompt` (+ `model`) is portable.** The core
 *   ships `ImageGenerateParams` (`size: '1024x1024'`, `quality`, `n`) AND
 *   Stability-style `GenerateImageParams` (`width`/`height`, `negativePrompt`,
 *   `count`, `steps`). A provider honors ITS dialect and silently ignores the
 *   other's fields — check the bonded provider's docs before relying on anything
 *   beyond `prompt`.
 * - **Handle every result shape, and persist what you must keep.** A
 *   `GeneratedImage` may carry `url`, `base64`, or raw `data` bytes — provider URLs
 *   are typically short-lived, so download and store (e.g. via the uploads bond)
 *   anything the app needs to keep.
 * - **Server-side only, gated and budgeted.** Keep the provider key on the API;
 *   require auth and rate-limit user-triggered generation — every image is billed.
 *
 * @example
 * ```typescript
 * import { setProvider, requireProvider } from '@molecule/api-ai-image-generation'
 * import { createProvider } from '@molecule/api-ai-image-generation-openai'
 *
 * // Wire at startup. See the bond package for its config/env (e.g. OPENAI_API_KEY).
 * setProvider(createProvider())
 *
 * // Use anywhere after startup.
 * const { images } = await requireProvider().generate({
 *   prompt: 'A watercolor fox reading a book',
 *   size: '1024x1024',
 *   responseFormat: 'base64',
 * })
 * // images[0] may carry url, base64, or data — handle what the bonded provider returns.
 * ```
 *
 * @e2e
 * Integration checklist — drive the real UI (live preview, no mocks), adapt
 * each item to this app's actual screens/flows, and check every box off one
 * by one. A box you can't check is an integration bug to fix — not a skip:
 * - [ ] Entering a prompt in the UI and submitting produces a REAL rendered
 *   image in the live preview — not a broken img (image icon / alt text), a
 *   grey placeholder, or an error toast. Confirm the `img` element actually
 *   decoded (its `naturalWidth`/`naturalHeight` are non-zero) and the picture
 *   visibly reflects the prompt (a "red bicycle" prompt shows a red bicycle).
 * - [ ] Two different prompts produce two visibly different images — a fixed
 *   stub, or a cached first result that never changes, is a broken integration.
 * - [ ] The image is STORED AND SERVED FROM THE APP'S OWN ORIGIN: the rendered
 *   `img` `src` (and any saved record) points at the app's uploads/storage, not
 *   the provider's temporary URL. Provider `url` results expire — reload the
 *   page (or revisit the record later) and the image must still load. Download
 *   the provider result server-side and persist it (uploads bond); never
 *   hotlink the provider URL — it 404s later and can leak the API request
 *   context. (`base64`/`data` results must likewise be saved, not held only in
 *   the response.)
 * - [ ] Any exposed generation options take effect: changing size/dimensions
 *   yields a differently-sized image; requesting a count (`n`) of N renders N
 *   images. If the UI exposes no such options, this box is n/a — say so.
 * - [ ] A rejected or policy-violating prompt, or a provider/rate-limit error,
 *   surfaces a clear message in the UI — not a crash, a blank screen, or a
 *   silently-broken img. The user can recover and try another prompt.
 * - [ ] Generation is server-side and authorized: the provider API key never
 *   reaches the browser (check the network tab / built client bundle — no key,
 *   no direct provider call from the page), the generate endpoint requires
 *   auth, and a caller cannot run unbounded costly generations through an open
 *   or unrate-limited route. Every image is billed.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './types.js'
