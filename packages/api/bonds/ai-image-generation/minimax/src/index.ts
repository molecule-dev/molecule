/**
 * MiniMax H3-Image generation provider for `@molecule/api-ai-image-generation`.
 *
 * Generates and edits images through MiniMax's hosted H3-Image API on
 * `api.minimax.io` (`MiniMax-H3-Image` by default, `MiniMax-H3-Image-Highspeed`
 * for the fast tier): synchronous text-to-image and reference-guided editing
 * with up to 16 reference images and ~16 MP output, using the SAME
 * `MINIMAX_API_KEY` as the `@molecule/api-ai-minimax` chat bond.
 *
 * @example
 * ```typescript
 * import { requireProvider, setProvider } from '@molecule/api-ai-image-generation'
 * import { provider } from '@molecule/api-ai-image-generation-minimax'
 *
 * // Reads MINIMAX_API_KEY (from platform.minimax.io) on each call.
 * setProvider(provider)
 *
 * const { images } = await requireProvider().generate({
 *   prompt: 'A watercolor fox reading a book, warm afternoon light',
 *   size: '5472x3072',
 * })
 * // images[0].url — download and re-host it (e.g. via the uploads bond).
 *
 * // Reference editing: image + images map to <Picture 1>, <Picture 2>, …
 * const edited = await requireProvider().edit({
 *   prompt: 'Replace the cat in image 1 with the dog in image 2',
 *   image: catBytes, // Buffer, base64, data: URI or a public URL
 *   images: [dogBytes],
 * })
 * ```
 *
 * @remarks
 * - **The API is SYNCHRONOUS and NOT idempotent.** The server waits up to
 *   600 s and then answers with all images at once (`stream` is off) — do not
 *   wrap `generate()`/`edit()` in a poll loop, and do not time out below the
 *   bond's default 610 s. This bond NEVER retries, on any status: the server
 *   finishes the generation and charges for successful images even if the
 *   client disconnects, so a retry generates and charges AGAIN.
 * - **Per-item failures ride inside HTTP 200.** `data[]` always has `n`
 *   entries; an entry can be `{ error: { code, message } }` (e.g. `1027`
 *   content-safety) while its siblings succeed. A partial failure is NOT a
 *   request failure: successful images are returned and every failed item is
 *   logged (warn). An answer where EVERY item failed throws `MinimaxImageError`
 *   (status 502) naming each item's code and message. Only successful images
 *   are charged.
 * - **Same key and host as the MiniMax chat bond.** `MINIMAX_API_KEY` from
 *   platform.minimax.io (Account Management > API Keys); `MINIMAX_BASE_URL`
 *   overrides `https://api.minimax.io` (MiniMax scopes keys per host — a
 *   mainland-China deployment needs its own key AND
 *   `MINIMAX_BASE_URL=https://api.minimaxi.com`). A missing key throws the
 *   tagged `config.notConfigured` error.
 * - **Sizes are ~16 MP, not 1024-class.** `size` is a `WIDTHxHEIGHT` string
 *   (`3072x5472`, …) or `'auto'`; the H3-Image native grid runs from
 *   `4096x4096` (1:1) to `6272x2688` (21:9) with a working range of about
 *   4–20 MP. There is no seed, step count or guidance scale on this API — the
 *   checkpoint is distilled to 6 steps with no classifier-free guidance, and
 *   those core params are silently not forwarded.
 * - **Prompts are rewritten by default** (prompt enhancement): the rewritten
 *   text comes back as each image's `revisedPrompt`. Turn it off for EVERY
 *   request with `createProvider({ disablePromptEnhanced: true })`. Prompts
 *   are capped at 32 000 chars but only the first ~4096 tokens are used
 *   without enhancement, and the model expects detailed ENGLISH descriptions —
 *   short prompts underperform.
 * - **The default output format is jpeg, not png.** Ask for
 *   `responseFormat: 'base64'` to get `b64_json` instead of a URL, and mind
 *   the base64 area caps: png ≤ 20 000 000 px, jpeg/webp ≤ 80 000 000 px
 *   total output area (`n` × width × height).
 * - **Editing has no mask.** H3-Image edits are reference-guided, not
 *   inpainting: describe the edit in the prompt (`Replace the cat in image 1
 *   …`) and pass up to 16 references (`image` + `images`, in order =
 *   `<Picture 1>`, `<Picture 2>`, …). A `mask` throws before any request (the
 *   API answers a mask with HTTP 400). References accept a public URL, an
 *   `mm_file://{file_id}` URI or raw bytes (Buffer/base64 — wrapped in a
 *   `data:` URI; prefer URLs for large files).
 * - **Model ids are exactly** `MiniMax-H3-Image` and
 *   `MiniMax-H3-Image-Highspeed` — anything else throws before any request.
 * - **Errors are `MinimaxImageError`** carrying the HTTP `status` (401 auth,
 *   402 quota, 429 rate limit; 0 = unreachable/timeout; 502 = every image
 *   item failed or the 2xx body was not JSON) and the API's error code as
 *   `code`. `n` is 1–10 and validated locally.
 * - **License note:** calling MiniMax's hosted API is ordinary API usage
 *   (MiniMax is the hosting party). The open H3-Image WEIGHTS are under a
 *   custom community license — see the vLLM-Omni bond before self-hosting
 *   them.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './secrets.js'
export * from './types.js'
