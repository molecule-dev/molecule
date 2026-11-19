/**
 * MiniMax H3 video-generation provider for `@molecule/api-ai-video-generation`.
 *
 * Generates short video clips with NATIVE synchronized stereo audio (dialogue,
 * SFX and music in one pass — no separate TTS or soundtrack step) through
 * MiniMax's hosted H3 API (`MiniMax-H3` by default, plus `-Highspeed`,
 * `-Lite` and `-Max` tiers) over its asynchronous task flow: submit, poll
 * every ~10 s, download. Uses the SAME `MINIMAX_API_KEY` as the
 * `@molecule/api-ai-minimax` chat bond.
 *
 * @example
 * ```typescript
 * import { requireProvider, setProvider } from '@molecule/api-ai-video-generation'
 * import { provider } from '@molecule/api-ai-video-generation-minimax'
 *
 * // Reads MINIMAX_API_KEY (from platform.minimax.io) on each call.
 * setProvider(provider)
 *
 * const job = await requireProvider().generate({
 *   prompt: 'A boy playing basketball by the sea, crowd cheering',
 *   resolution: '1920x1080', // snapped to the nearest 480P/768P/2K bucket
 *   durationSeconds: 5,
 * })
 * let status = await requireProvider().getStatus(job.id)
 * while (status.status === 'pending' || status.status === 'processing') {
 *   await new Promise((resolve) => setTimeout(resolve, 10000))
 *   status = await requireProvider().getStatus(job.id)
 * }
 * // status.result?.url — it EXPIRES; download and re-host it now.
 * ```
 *
 * @remarks
 * - **Audio is always generated — there is no audio switch.** `generateAudio`
 *   is accepted in the core's params for other providers and silently NOT
 *   forwarded here; set it to `false` elsewhere, not on this bond. `seed`,
 *   `steps`, `guidanceScale`, `negativePrompt` and `fps` do not exist on this
 *   API either and are not forwarded (output is 24 FPS / 32 kHz stereo).
 * - **Resolutions are buckets, not pixel sizes.** `resolution`/`width`/`height`
 *   are snapped to the nearest of `480P`, `768P`, `2K` (short-edge buckets at
 *   480/768/1440) — `1920x1080` becomes `768P`. `2K` exists ONLY on base
 *   `MiniMax-H3`; base H3 has no `480P`. With nothing set, `768P` is sent.
 * - **`ratio` rules differ by mode.** Text-to-video requires a CONCRETE ratio
 *   (`adaptive` is rejected): one is derived from the dimensions you pass, or
 *   `16:9` when there are none. Image-to-video is ALWAYS `adaptive` (the
 *   ratio follows the input image; any other value is ignored by the API) —
 *   and `MiniMax-H3-Lite` has no `adaptive` support yet, so image-to-video on
 *   Lite is refused before any request.
 * - **`duration` is required by the API** (an integer 4–15 s; `MiniMax-H3-Max`
 *   starts at 5). Omitting `durationSeconds` sends the bond default of 5;
 *   out-of-range values throw before any request.
 * - **First frames: URLs pass through, bytes become data URIs.** An `image`
 *   that is an http(s) URL, `mm_file://{file_id}` or `data:` URI is sent
 *   unchanged (role `first_frame`); a Buffer or bare base64 string is wrapped
 *   in a `data:` URI. The whole request body is capped at 64 MB — prefer
 *   public URLs for large images.
 * - **Output URLs are time-limited and tasks expire.** Download the finished
 *   MP4 and re-host it (e.g. via the uploads bond) immediately — re-querying
 *   yields a FRESH URL, not the old one, and only the last 7 days of tasks
 *   are queryable at all.
 * - **Same key and host as the MiniMax chat bond.** `MINIMAX_API_KEY` from
 *   platform.minimax.io (Account Management > API Keys); `MINIMAX_BASE_URL`
 *   overrides `https://api.minimax.io` (MiniMax scopes keys per host — a
 *   mainland-China deployment needs its own key AND
 *   `MINIMAX_BASE_URL=https://api.minimaxi.com`). A missing key throws the
 *   tagged `config.notConfigured` error.
 * - **Model ids are exactly** `MiniMax-H3`, `MiniMax-H3-Highspeed`,
 *   `MiniMax-H3-Lite`, `MiniMax-H3-Max` — anything else throws before any
 *   request. `MiniMax-H3-Max` alone takes `extra.prompt_expansion_mode`
 *   (`disabled` | `balanced` | `quality`, API default `balanced`), exposed as
 *   `createProvider({ promptExpansionMode })` and refused on other models.
 * - **Job ids are the API's task ids** (numeric strings). Pass the id exactly
 *   as `generate()` returned it. An id this bond could never poll back (dot
 *   segments — literal or `%2e`-encoded —, empty segments, `?`, `#`) is
 *   refused at submit time instead of minted into a handle `getStatus()`
 *   would reject; `getStatus()` re-checks and percent-encodes every segment.
 * - **Errors are `MinimaxVideoError`** carrying the HTTP `status` (401 auth,
 *   402 quota, 429 rate limit; 0 = unreachable/timeout; 502 = unusable 2xx
 *   answer) and the API's error code as `code`. A FAILED or CANCELLED task
 *   surfaces through `getStatus()` as `status: 'failed'` with the API's error
 *   code as `error.type`, not as a throw. Nothing is retried — a retried
 *   submit would create a SECOND chargeable task. The default timeout is
 *   120 s; the API recommends a ~10 s polling interval.
 * - **License note:** calling MiniMax's hosted API is ordinary API usage
 *   (MiniMax is the hosting party). The open H3 video WEIGHTS are under a
 *   custom community license — check it before self-hosting them.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './secrets.js'
export * from './types.js'
