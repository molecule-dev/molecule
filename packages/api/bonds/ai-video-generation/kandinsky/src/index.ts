/**
 * Kandinsky 6.0 video-generation provider for `@molecule/api-ai-video-generation`.
 *
 * Generates short video clips with a synchronized audio track on your own
 * vLLM-Omni server (`vllm serve kandinskylab/Kandinsky-6.0-… --omni`) through
 * its `/v1/videos` job API: submit (multipart), poll, then download the MP4
 * from `/v1/videos/{id}/content`. The default model is the 3B Lite distilled
 * checkpoint; the same bond serves the Pro and base checkpoints the server
 * hosts — set `KANDINSKY_MODEL` or pass `model`.
 *
 * @example
 * ```typescript
 * import { requireProvider, setProvider } from '@molecule/api-ai-video-generation'
 * import { provider } from '@molecule/api-ai-video-generation-kandinsky'
 *
 * // Reads KANDINSKY_BASE_URL (e.g. http://localhost:8091) on each call.
 * setProvider(provider)
 *
 * const job = await requireProvider().generate({
 *   prompt: 'A golden retriever runs along a sunny beach, waves crashing',
 *   durationSeconds: 5,
 * })
 * let status = await requireProvider().getStatus(job.id)
 * while (status.status === 'pending' || status.status === 'processing') {
 *   await new Promise((resolve) => setTimeout(resolve, 5000))
 *   status = await requireProvider().getStatus(job.id)
 * }
 * // status.result?.url — fetch it before the server evicts the output.
 * ```
 *
 * @remarks
 * - **You run the server; it needs a GPU.** `vllm serve
 *   kandinskylab/Kandinsky-6.0-Pro-5s-Diffusers --omni --host 127.0.0.1
 *   --port 8091 --num-gpus 1 --enable-cpu-offload` (the 29B Pro needs CPU
 *   offload even on 80 GB GPUs; the default 3B Lite-distill is the practical
 *   single-GPU checkpoint). `KANDINSKY_BASE_URL` is required and has no
 *   default — a missing one throws the tagged `config.notConfigured` error.
 *   Give it WITHOUT `/v1` (a trailing `/v1` is stripped). `KANDINSKY_API_KEY`
 *   is optional and sent as `Authorization: Bearer …` only when set.
 *   Generation is SLOW: the repo's benchmark table spans 356–3080 s per 5-s
 *   clip depending on GPU — budget poll loops accordingly.
 * - **Distilled checkpoints are pinned to guidance 1.0 + 10 steps here.**
 *   Kandinsky `-distill` checkpoints ship a `PiflowScheduler` that produces
 *   silently wrong results at the base checkpoints' CFG 5.0 — the model card
 *   calls this out. When the resolved model id contains `-distill` and you
 *   set neither control, the bond sends `guidance_scale=1.0` and
 *   `num_inference_steps=10` itself; explicitly passing a `guidanceScale`
 *   other than 1 for a `-distill` model throws BEFORE any request. Base
 *   checkpoints pass your values through and default to the server's
 *   registered 5.0 / 50 steps.
 * - **Geometry is snapped, not rejected.** Kandinsky's VAE forces dimensions
 *   divisible by 16 and frame counts of the form `4k+1`: `width`/`height`
 *   are snapped to the nearest multiple of 16 (481→480) and
 *   `durationSeconds` becomes `num_frames = 4k+1` at the effective fps (5 s
 *   at 24 fps → 121 frames — the model's native 5-s clip shape). Pass
 *   `resolution` (`"864x480"`) to bypass snapping. With none of the three,
 *   the server's registered production geometry 864×480 applies. The
 *   built-in super-resolution cascade is NOT reachable through this port
 *   ("not supported" in the recipe), so `upscale` is absent —
 *   feature-detect as the core prescribes.
 * - **Audio is ON by default** (unlike most vLLM-Omni models): Kandinsky
 *   samples a 44 kHz track whenever it generates. `generateAudio: false`
 *   sends `sample_audio=false` for video-only. `cameraMotion` is not
 *   forwarded (the Videos API has no camera control); `negativePrompt`
 *   forwards as `negative_prompt`.
 * - **Job ids are the server's own; statuses are normalized.** `queued` →
 *   `pending`, `in_progress` → `processing`, `completed`/`failed` as-is; an
 *   unrecognized status word throws instead of polling forever. A completed
 *   job's `result.url` points at the server's own
 *   `/v1/videos/{id}/content` — download it promptly: the server reports an
 *   `expires_at` for stored outputs and may evict them. `image` becomes the
 *   `input_reference` multipart file part (first frame, image-to-video).
 * - **Kandinsky 6.0 code AND weights are MIT** — no revenue cap or use
 *   restrictions, safe to expose to any app. (The LTX-2.5 weights this
 *   category's other bond calls are NOT: they carry the LTX-2.x Community
 *   License with a $10M revenue cap.)
 * - Errors are `KandinskyVideoError` with `status` (400 bad params, 503
 *   engine not initialised, 413 oversized upload; 0 = unreachable or timed
 *   out) and `code` when the server sent one. Nothing is retried; the
 *   default timeout is 300 s per HTTP call.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './kandinsky.js'
export * from './provider.js'
export * from './secrets.js'
export * from './types.js'
