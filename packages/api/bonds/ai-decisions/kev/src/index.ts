/**
 * Kev decisions provider for molecule.dev — typed decisions from the
 * open-weights Kev models on a `kev.serve` host you run.
 *
 * Kev (github.com/jaredpalmer/kev; code and weights Apache-2.0) is a family of
 * Qwen-based decision models — Kev-0.8B, 4B and 9B (LoRA adapters on
 * Qwen3.5-*-Base) and Kev-27B (a full fine-tune of Qwen3.8-27B) — that answer
 * `choice`, `score` and yes/no questions with calibrated probabilities and
 * generate no text. Its README recommends Kev-4B as the default. `kev.serve`
 * speaks TypeSafe Jev's `/v1/systemone` protocol, so swapping to
 * `@molecule/api-ai-decisions-jev`, `-laya` or `-jeff` is a one-line change.
 *
 * @example
 * ```bash
 * # Run the model server (NVIDIA/AMD GPU, or Apple silicon via MLX; Python 3.12/3.13)
 * git clone https://github.com/jaredpalmer/kev.git && cd kev && uv sync --extra serve
 * KEV_API_KEY=change-me uv run --extra serve python -m kev.serve --run jaredpalmer/kev-4b@v1.0
 * ```
 *
 * ```typescript
 * import { setProvider, requireProvider } from '@molecule/api-ai-decisions'
 * import { provider } from '@molecule/api-ai-decisions-kev'
 *
 * setProvider(provider) // reads KEV_URL + KEV_API_KEY on first use
 *
 * const { answers } = await requireProvider().decide({
 *   state: 'My card was charged twice, please refund one of them',
 *   questions: {
 *     queue: { type: 'choice', instructions: 'Which team?', criteria: { billing: 'charges, refunds', tech: 'bugs, login' } },
 *     refund: { type: 'yesNo', instructions: 'The customer wants a refund.' },
 *   },
 * })
 * answers.queue.choice       // 'billing'
 * answers.refund.probability // 0.93
 * ```
 *
 * @remarks
 * - **You run the model.** `KEV_URL` (default `http://localhost:8008`, the
 *   server's own default port) points at a `kev.serve` host; its README
 *   examples use `--port 8009`, so set `KEV_URL` to match. `kev.serve` binds
 *   `127.0.0.1` unless you pass `--host 0.0.0.0` — and it is OPEN by default:
 *   set `KEV_API_KEY` on BOTH sides before exposing it, or you publish an
 *   unauthenticated GPU endpoint.
 * - **Validated context.** The server accepts states up to 65,536 tokens, but
 *   accuracy holds only to 8,192 tokens for Kev-0.8B/4B/9B (trained mostly on
 *   states ≤384 tokens) and 65,536 for Kev-27B. A longer state is REFUSED with
 *   a 422 naming its token count (unless the server runs
 *   `KEV_TRUNCATE_STATES=1`); this bond surfaces it verbatim and never retries
 *   a 422. Shorten the state instead.
 * - **`model` never selects a checkpoint.** Any string is echoed back; the
 *   server answers with the one checkpoint it loaded via `--run`. Run a second
 *   server for a second size.
 * - **1–255 options or levels per question** (Kev's own limit — not Jeff's
 *   26). This bond refuses more before sending. Option order can change an
 *   answer: questions are isolated from each other, options within one are not.
 * - **Text only.** There is no `images` field; this bond throws if you pass
 *   any. Use `@molecule/api-ai-decisions-intern-decision` or `-llm` for images.
 * - **Never use Kev-0.8B for tool routing** — it scores below chance on
 *   When2Call (0.133). Date arithmetic is weak below 27B: start the server with
 *   `KEV_DATE_FACTS=1`. Knowledge questions are capped by the base model, and
 *   smaller sizes trail Jev by 13–31 points out of domain.
 * - **bf16 vs fp32.** Serving runs in bf16, so probabilities differ from the
 *   published fp32 numbers by up to ~0.03 (GPU) / ~0.05 (Mac) and the top
 *   answer flips on ~1 question in 300. `KEV_DTYPE=fp32` on the server gives
 *   the exact evaluation path.
 * - **Ignore the wire `confidence`.** The server sends TypeSafe's dispersion
 *   statistic, not an accuracy rate; this bond recomputes `confidence` as the
 *   probability of the reported answer. Tune `minConfidence` on your own
 *   labelled data — Kev-0.8B can automate far fewer decisions at a fixed error
 *   budget than 4B/9B/27B.
 * - **Not a CPU model.** It runs on CUDA/ROCm or Apple MLX (Kev-4B: ~42 ms on
 *   an L40S, ~721 ms on an M5). There is no `/health` route: probe
 *   `GET /v1/models`. A scale-to-zero host (Modal) takes ~35 s on the first
 *   call after idle; `createProvider({ timeoutMs })` defaults to 120 s for that.
 * - **Hosted on rented compute?** Pass `headers: () => hosting.authHeaders(endpoint.id)`
 *   (`@molecule/api-model-hosting`) when the host's auth expires or is not a
 *   bearer token — e.g. Modal proxy auth. It runs before every request and is
 *   merged over the defaults.
 * - **Other `/v1/systemone` servers.** Point `baseUrl` at any server of the
 *   same protocol and lower `maxOptions` to its limit (a self-hosted Nimble:
 *   `model: 'nimble-latest'`, `maxOptions: 26` — check its license first).
 * - Use the core's `setProvider`, not `bond('ai-decisions', …)` directly.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './secrets.js'
export * from './types.js'
export * from './wire.js'
