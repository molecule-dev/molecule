/**
 * LTX video-generation provider for `@molecule/api-ai-video-generation`.
 *
 * Generates short video clips with a synchronized audio track through
 * Lightricks' hosted LTX API (LTX-2.5 / LTX-2.3, `ltx-2-5-fast` by default)
 * over its asynchronous V2 job flow: submit, poll, download. Raw first-frame
 * bytes are uploaded through the API's own `/v1/upload` ticket flow.
 *
 * @example
 * ```typescript
 * import { requireProvider, setProvider } from '@molecule/api-ai-video-generation'
 * import { provider } from '@molecule/api-ai-video-generation-ltx'
 *
 * // Reads LTXV_API_KEY (from console.ltx.video) on each call.
 * setProvider(provider)
 *
 * const job = await requireProvider().generate({
 *   prompt: 'A majestic eagle soaring through clouds at sunset',
 *   model: 'ltx-2-5-pro',
 *   durationSeconds: 8,
 *   resolution: '1920x1080',
 * })
 * let status = await requireProvider().getStatus(job.id)
 * while (status.status === 'pending' || status.status === 'processing') {
 *   await new Promise((resolve) => setTimeout(resolve, 5000))
 *   status = await requireProvider().getStatus(job.id)
 * }
 * // status.result?.url — it EXPIRES; download and re-host it now.
 * ```
 *
 * @remarks
 * - **Only the async V2 job API is used.** The synchronous V1 endpoints
 *   (`POST /v1/text-to-video` returning the MP4 body directly) are
 *   deprecated and stop working after October 26, 2026 — this bond never
 *   touches them. Submit is `POST /v2/text-to-video` or `/v2/image-to-video`
 *   (202 + `{id, created_at}`); poll `GET /v2/{endpoint}/{id}` — the docs
 *   recommend waiting at least 5 seconds between polls (vary 5–6 s).
 * - **`duration` is required but nullable — omitting `durationSeconds` sends
 *   `null`, which ONLY ltx-2-5 tiers accept** (automatic duration: the model
 *   picks the length from the prompt). With no `durationSeconds` on an
 *   `ltx-2-3-*` model this bond throws before any request. On a prepaid
 *   account, `duration: null` HOLDS credits for the maximum (20 s on fast,
 *   10 s on pro) even if the clip comes out shorter.
 * - **`resolution` is a `"WxH"` string** (landscape `"1920x1080"`, portrait
 *   `"1080x1920"`), never an enum, and model ids (`ltx-2-5-fast`,
 *   `ltx-2-5-pro`, `ltx-2-3-fast`, `ltx-2-3-pro`) ride in the body, not the
 *   URL. With no resolution the bond sends `"1280x720"` (720p landscape).
 *   Supported resolutions are per model tier — 720p/1080p/1440p/4K on 2.5.
 * - **Output URLs expire on their own, independently of job status** (which
 *   itself is only kept ≤24 h after completion): download the finished MP4
 *   and re-host it (e.g. via the uploads bond) immediately — never store the
 *   `result.url` as if it were permanent.
 * - **Job ids this bond returns are prefixed** — `ltx/<endpoint>/<model>/<api id>`
 *   — because the poll path embeds the submit endpoint. Pass the id exactly
 *   as `generate()` returned it; a bare API id is rejected with a clear error.
 *   An API id this bond could never poll back (dot segments, empty segments,
 *   `?`, `#`) is refused at submit time instead of minted into a handle
 *   `getStatus()` would reject.
 * - **Auth is `Authorization: Bearer` with `LTXV_API_KEY`** (the env-var name
 *   the LTX docs themselves use; create the key at console.ltx.video). A
 *   missing key throws the tagged `config.notConfigured` error. `LTX_BASE_URL`
 *   overrides `https://api.ltx.io` for brokers/tests.
 * - **First frames: URIs pass through, bytes upload.** An `image` that is an
 *   http(s) or `ltx:` URI is sent as `image_uri` unchanged; a Buffer, base64
 *   string or data URL is uploaded via `POST /v1/upload` (pre-signed PUT;
 *   uploads expire after 1 h and stored files after 24 h) and the returned
 *   `storage_uri` is used.
 * - **Diffusion controls do not exist here.** `negativePrompt`, `seed`,
 *   `steps` and `guidanceScale` are silently NOT forwarded — the V2 API has
 *   no such fields (they are Diffusers-pipeline knobs, not hosted-API ones).
 *   `fps` (default 24) and `generateAudio` (default true, → `generate_audio`)
 *   do forward, as does `cameraMotion` (→ `camera_motion`, validated against
 *   the eight documented motions).
 * - **Errors are `LtxVideoError`** carrying the HTTP `status` (400 invalid,
 *   401 auth, 402 insufficient credits, 422 content filtered, 429
 *   concurrency, 500/503/504 server; 0 = unreachable/timeout) and the API's
 *   error `type` as `code` (`content_filtered_error`, …). A failed JOB
 *   surfaces through `getStatus()` as `status: 'failed'` with the same error
 *   shape, not as a throw. Nothing is retried; the default timeout is 120 s.
 * - **License asymmetry vs the sibling bond:** LTX-2.5 model weights are NOT
 *   open source — the LTX-2.x Community License excludes ≥$10M-revenue
 *   entities and bans building competing products; you are responsible for
 *   your own compliance when reselling access (outputs themselves are
 *   unencumbered — "Licensor claims no rights in the Output"). Kandinsky
 *   6.0 (the `-kandinsky` bond) is MIT with no such limits.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './secrets.js'
export * from './types.js'
