/**
 * Laya decisions provider for molecule.dev — typed decisions from the
 * open-weights Laya model (Apache-2.0) on a `laya-serve` host you run.
 *
 * Laya is a ~421M-parameter encoder (ModernBERT-large; a 322M multilingual
 * checkpoint covers 100+ languages) that answers `choice`, `score` and yes/no
 * questions in one forward pass — about 33–40 ms per question on a T4 GPU,
 * with no text generation. This bond speaks `laya-serve`'s `/v1/systemone`
 * route, the same wire protocol as TypeSafe's Jev, so swapping to
 * `@molecule/api-ai-decisions-jev` is a one-line change.
 *
 * @example
 * ```bash
 * # Run the model server (CPU works; a GPU is ~10x faster)
 * pip install "laya[serve]"
 * LAYA_API_KEY=change-me laya-serve        # http://0.0.0.0:8000
 * # or: docker compose up   (compose.yaml in github.com/NandhaKishorM/laya)
 * ```
 *
 * ```typescript
 * import { setProvider, requireProvider } from '@molecule/api-ai-decisions'
 * import { provider } from '@molecule/api-ai-decisions-laya'
 *
 * setProvider(provider) // reads LAYA_URL + LAYA_API_KEY on first use
 *
 * const { answers } = await requireProvider().decide({
 *   state: 'My card was charged twice, please refund one of them',
 *   questions: {
 *     queue: { type: 'choice', instructions: 'Which team?', criteria: { billing: 'charges, refunds', tech: 'bugs, login' } },
 *     refund: { type: 'yesNo', instructions: 'The customer wants a refund.' },
 *   },
 * })
 * answers.queue.choice       // 'billing'
 * answers.refund.probability // 0.96
 * ```
 *
 * @remarks
 * - **You run the model.** `LAYA_URL` (default `http://localhost:8000`) points
 *   at a `laya-serve` host; set `LAYA_API_KEY` on BOTH sides to require a
 *   bearer token — without it the server is open to anyone who can reach it,
 *   so never expose an unauthenticated one publicly.
 * - **Any `/v1/systemone` server works.** `LAYA_URL` can point at another
 *   self-hosted server of the same protocol — e.g. Kev
 *   (github.com/jaredpalmer/kev, Apache-2.0 LoRA adapters on Qwen, 0.8B–27B,
 *   needs a GPU or Apple MLX) — with no code change.
 * - **Checkpoints:** pass `model: 'english' | 'multilingual' | 'typed-decisions'`
 *   (per call or `createProvider({ model })`); omit it and the server routes by
 *   the input's script/language. Any other value (e.g. a Jev id) is ignored by
 *   the server, not rejected.
 * - **Server limits (each a 413):** 64 questions/request, 100 options per
 *   `choice`, 32 levels per `score`, 512 options total, 50,000-char state,
 *   2 MiB body. Option texts must also fit a ~192-token window (else 422) —
 *   keep descriptions short. Busy servers answer 503 + `Retry-After`; this
 *   bond retries 429/503/529 up to 3 times.
 * - **Accuracy is yours to measure.** Base checkpoints are near chance on
 *   unfamiliar decision sets and ship over-confident; fine-tune (the repo has
 *   a free Kaggle notebook) and calibrate on your own labelled data, and gate
 *   on `minConfidence`. See the core's remarks.
 * - Use the core's `setProvider`, not `bond('ai-decisions', …)` directly.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './secrets.js'
export * from './types.js'
export * from './wire.js'
