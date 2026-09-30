/**
 * Jeff decisions provider for molecule.dev — typed decisions from the
 * open-weights Jeff models on a `jeff-serve` host you run.
 *
 * Jeff (github.com/firelex/jeff; code MIT, weights Apache-2.0) is a family of
 * fine-tunes of Qwen3.5-0.8B, Qwen3.5-2B and Gemma 4 E2B that answer
 * `choice`, `score` and yes/no questions with a probability per option — no
 * text generation. Its maker reports ~22 ms per request for the 0.8B on an
 * NVIDIA RTX PRO 6000 and ~28 ms on an Apple M4 Max. `jeff-serve` speaks
 * TypeSafe Jev's `/v1/systemone` protocol, so swapping to
 * `@molecule/api-ai-decisions-jev` or `-laya` is a one-line change.
 *
 * @example
 * ```bash
 * # Run the model server (NVIDIA GPU, or Apple silicon with JEFF_BACKEND=mlx)
 * git clone https://github.com/firelex/jeff && cd jeff && uv sync
 * uv hf download mstrasser/Jeff-Qwen3.5-0.8B --local-dir checkpoints/jeff-0.8b
 * JEFF_API_KEY=change-me JEFF_CHECKPOINT=checkpoints/jeff-0.8b PORT=8000 uv run jeff-serve
 * ```
 *
 * ```typescript
 * import { setProvider, requireProvider } from '@molecule/api-ai-decisions'
 * import { provider } from '@molecule/api-ai-decisions-jeff'
 *
 * setProvider(provider) // reads JEFF_URL + JEFF_API_KEY on first use
 *
 * const { answers } = await requireProvider().decide({
 *   state: 'My card was charged twice, please refund one of them',
 *   questions: {
 *     queue: { type: 'choice', instructions: 'Which team?', criteria: { billing: 'charges, refunds', tech: 'bugs, login' } },
 *     refund: { type: 'yesNo', instructions: 'The customer wants a refund.' },
 *   },
 * })
 * answers.queue.choice       // 'billing'
 * answers.refund.probability // 0.95
 * ```
 *
 * @remarks
 * - **You run the model.** `JEFF_URL` (default `http://localhost:8000`) points
 *   at a `jeff-serve` host. Its code defaults to port 8000 but its README
 *   examples use `PORT=8765` — set `JEFF_URL` to match. `jeff-serve` binds
 *   `127.0.0.1` unless you set `JEFF_HOST`. Set `JEFF_API_KEY` on BOTH sides to
 *   require a bearer token; without it anyone who can reach the server can use it.
 * - **`model` is required on the wire and is NOT a checkpoint picker.** The
 *   server accepts only `'jeff'`, `'jeff-latest'` (the default here) or its own
 *   name, rejects anything else with a 422, and always answers with the ONE
 *   checkpoint it loaded (`JEFF_CHECKPOINT`). Never pass a Jev model id. Run a
 *   second server to use a second checkpoint.
 * - **At most 26 `choice` options** with the released checkpoints (options are
 *   coded A–Z; the server refuses more). `score` takes 2–10 levels. This bond
 *   refuses both before sending — shortlist long option lists first. Raise
 *   `createProvider({ maxOptions })` only for a checkpoint whose `/health`
 *   reports a higher `max_options`.
 * - **One request at a time.** A busy server answers 529 + `Retry-After: 1`
 *   and a loading one 503; this bond retries 429/502/503/504/529 up to 3 times.
 *   Errors carry the HTTP `status`.
 * - **English text only.** Use `@molecule/api-ai-decisions-laya`'s multilingual
 *   checkpoint for other languages.
 * - **Images:** up to 4 PNG/JPEG/WebP `images` are forwarded, but only the
 *   PyTorch backend reads them (`/health` → `modalities`); the Apple MLX
 *   backend is text-only, and the maker publishes no image accuracy figures.
 *   For image questions prefer `@molecule/api-ai-decisions-intern-decision`.
 * - **Small models don't reason.** Expect fast choices between options you
 *   describe, not multi-step logic (the 0.8B scores 68% on BIG-Bench Hard vs
 *   Jev's 94%). Describe each option's consequences in plain words.
 * - **Calibrate on your own data.** The checkpoints carry one fitted
 *   temperature from the maker's training mix; recalibrate on labelled samples
 *   of your inputs and gate on `minConfidence`. See the core's remarks.
 * - **Hosted on rented compute?** Pass `headers: () => hosting.authHeaders(endpoint.id)`
 *   (`@molecule/api-model-hosting`) when the host's auth expires or is not a
 *   bearer token — e.g. a Cloud Run ID token or Modal proxy auth. It runs before
 *   every request and is merged over the defaults.
 * - Use the core's `setProvider`, not `bond('ai-decisions', …)` directly.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './secrets.js'
export * from './types.js'
export * from './wire.js'
