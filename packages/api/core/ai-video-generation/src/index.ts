/**
 * AI video-generation core interface for molecule.dev.
 *
 * Defines the `AIVideoGenerationProvider` contract — generate short video
 * clips (with a synchronized audio track, when the model supports it) from
 * text prompts and optional first-frame images, as submit→poll jobs — and the
 * accessor (`setProvider`/`getProvider`/`hasProvider`/`requireProvider`).
 * Interface-only: bond a provider package (e.g.
 * `@molecule/api-ai-video-generation-ltx`,
 * `@molecule/api-ai-video-generation-kandinsky`).
 *
 * @remarks
 * - **Wire it at startup with `setProvider(...)` — or the equivalent
 *   `bond('ai-video-generation', provider)`.** This core routes through the
 *   shared `@molecule/api-bond` registry, so either call registers the same
 *   provider and `validateBonds()` reports it as missing when unwired.
 * - **Generation is asynchronous everywhere — this is a job API, not a
 *   one-call API.** `generate()` submits and returns a `VideoJob`; poll
 *   `getStatus(job.id)` until `status` is `'completed'` or `'failed'` (leave
 *   seconds between polls — hosted providers document 5 s+; a diffusion clip
 *   takes tens of seconds to minutes). There is no synchronous variant, and
 *   there is no `-llm` degradation bond: a chat model cannot approximate
 *   video generation, so an unbonded app fails fast with the "not bonded"
 *   error above.
 * - **Only `prompt` is fully portable.** `model`, resolution/dimensions,
 *   `durationSeconds`, `steps` and `guidanceScale` map differently per
 *   provider (some snap dimensions, some require exact step/guidance
 *   pairings); `cameraMotion` is ignored by providers without camera
 *   control. Check the bonded provider's docs before relying on anything
 *   beyond `prompt`.
 * - **Feature-detect `upscale`.** Only `generate()` and `getStatus()` are
 *   required; `upscale` is optional — guard with `if (provider.upscale)`
 *   instead of calling unconditionally (an absent method is a runtime
 *   TypeError that type-checks).
 * - **Handle every result shape, and persist what you must keep.** A
 *   completed job's `result` carries `url` and/or raw `data` bytes — provider
 *   URLs are typically short-lived (LTX's expire on their own; a self-hosted
 *   server may evict them; some providers report the deadline as
 *   `result.expiresAt`), so download and store (e.g. via the uploads bond)
 *   anything the app needs to keep, promptly after completion.
 * - **Server-side only, gated and budgeted.** Keep the provider key on the
 *   API; require auth and rate-limit user-triggered generation — every clip
 *   is billed or GPU-expensive.
 *
 * @example
 * ```typescript
 * import { setProvider, requireProvider } from '@molecule/api-ai-video-generation'
 * import { provider } from '@molecule/api-ai-video-generation-kandinsky'
 *
 * // Wire at startup. See the bond package for its config/env (e.g. KANDINSKY_BASE_URL).
 * setProvider(provider)
 *
 * // Submit, then poll the job to a terminal state.
 * const job = await requireProvider().generate({
 *   prompt: 'A drone shot over a foggy pine forest at dawn',
 *   durationSeconds: 5,
 * })
 * let status = await requireProvider().getStatus(job.id)
 * while (status.status === 'pending' || status.status === 'processing') {
 *   await new Promise((resolve) => setTimeout(resolve, 5000))
 *   status = await requireProvider().getStatus(job.id)
 * }
 * // status.result?.url — provider URLs can expire; download and store it now.
 * ```
 *
 * @e2e
 * Integration checklist — drive the real UI (live preview, no mocks), adapt
 * each item to this app's actual screens/flows, and check every box off one
 * by one. A box you can't check is an integration bug to fix — not a skip:
 * - [ ] Entering a prompt in the UI and submitting produces a REAL playable
 *   video in the live preview once the job completes — not a broken video
 *   element, a spinner that never ends, or an error toast. Confirm the video
 *   element actually loaded (its `readyState`/`duration` are set) and the
 *   clip visibly reflects the prompt (a "waves on a beach" prompt shows
 *   waves, not a placeholder).
 * - [ ] Two different prompts produce two visibly different clips — a fixed
 *   stub, or a cached first result that never changes, is a broken
 *   integration.
 * - [ ] The video is STORED AND SERVED FROM THE APP'S OWN ORIGIN: the played
 *   `source`/`src` (and any saved record) points at the app's
 *   uploads/storage, not the provider's temporary URL. Provider `url`
 *   results expire — reload the page (or revisit the record later) and the
 *   video must still play. Download the provider result server-side and
 *   persist it (uploads bond) once the job completes; never hotlink the
 *   provider URL. (`data` results must likewise be saved, not held only in
 *   the response.)
 * - [ ] Job progress is visible while polling: the UI shows the job is
 *   pending/processing (not frozen), and a failed job surfaces the provider's
 *   error message clearly so the user can recover and try another prompt.
 * - [ ] Any exposed generation options take effect: changing
 *   durationSeconds/resolution yields a different-length/-sized clip. If the
 *   UI exposes no such options, this box is n/a — say so.
 * - [ ] Generation is server-side and authorized: the provider API key never
 *   reaches the browser (check the network tab / built client bundle — no
 *   key, no direct provider call from the page), the generate endpoint
 *   requires auth, and a caller cannot run unbounded costly generations
 *   through an open or unrate-limited route. Every clip is billed or
 *   GPU-expensive.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './types.js'
