/**
 * Liquid d1 decisions provider for molecule.dev — typed choice/score/yes-no
 * answers, with images, from Liquid AI's d1 decision models, hosted or
 * self-hosted.
 *
 * d1 answers `choice`, `score` and yes/no questions about text, JSON or images
 * with a probability distribution instead of generated text, in one forward
 * pass. This bond calls `POST https://api.liquid.ai/decisions/v1/systemone`
 * with your `LIQUID_API_KEY` — or, when `LIQUID_DECISIONS_URL` is set, the
 * identical `/v1/systemone` route of a `llama-server` running the open d1
 * weights, so the same bond covers hosted and self-hosted.
 *
 * @example
 * ```bash
 * # Self-host instead of paying for the API (no key needed):
 * llama-server -hf LiquidAI/d1-3B-GGUF:Q8_0   # serves /v1/systemone on :8080
 * # then set LIQUID_DECISIONS_URL=http://127.0.0.1:8080
 * ```
 *
 * ```typescript
 * import { setProvider, requireProvider } from '@molecule/api-ai-decisions'
 * import { provider } from '@molecule/api-ai-decisions-liquid-d1'
 *
 * setProvider(provider) // reads LIQUID_API_KEY on first use
 *
 * const { answers } = await requireProvider().decide({
 *   state: 'I was charged twice this month, please refund one of them.',
 *   questions: {
 *     refund: { type: 'yesNo', instructions: 'The customer is asking for a refund.' },
 *     team: { type: 'choice', instructions: 'Which team should handle this?', criteria: { billing: 'charges, refunds, invoices', technical: 'app or site faults' } },
 *     urgency: { type: 'score', instructions: 'How urgent is this?', criteria: ['Can wait', 'Today', 'Blocking the customer now'] },
 *   },
 * })
 * answers.refund.probability // 0.999
 * answers.team.choice        // 'billing'
 * answers.urgency.score      // 2.9995
 * ```
 *
 * @remarks
 * - Config: `LIQUID_API_KEY` (required for the hosted API — sent as
 *   `Authorization: Bearer …`, created at console.liquid.ai; keys start with
 *   `liquid_`), `LIQUID_DECISIONS_URL` (self-hosted `llama-server` base URL,
 *   no key needed), `LIQUID_BASE_URL` (gateway in front of the hosted API),
 *   and `createProvider({ model })` (default `'d1'`, or pass `model` per
 *   call).
 * - **`d1:free` is text-only.** Passing `images` with model `d1:free` throws
 *   before any request (the API's answer is "The model 'd1:free' does not
 *   accept images."). Paid `d1` reads images.
 * - **Image rules** (count and format are checked here before sending): up to
 *   8 images per request of JPEG / PNG / WebP / GIF, base64 only — remote URLs
 *   are rejected. The API itself also enforces: whole request body under
 *   4.5 MB, ≤10,000 patches of 32×32 px across all images (1.5 tokens per
 *   patch), and the longer side at most 100× the shorter.
 * - **Billing quirk: every question is charged for its text AND all images
 *   again** (a 1024×1024 image is 1,536 tokens per question). Batch questions
 *   over one state instead of one call per question. Billed on input tokens
 *   only ($0.04/M at launch); `usage.outputTokens` is always 0.
 * - **Score questions take 2–10 levels, lowest first** (checked here before
 *   sending).
 * - `confidence` in the answers is the probability of the reported answer,
 *   NOT d1's own `confidence` field (see the core's remarks).
 * - **License — the open weights are NOT Apache-2.0.** `d1-3B` and
 *   `d1-omni-600M` ship the LFM Open License v1.0: commercial use by a legal
 *   entity over $10,000,000 annual revenue is NOT licensed — buy a commercial
 *   license from Liquid AI or pick another provider (the hosted API is
 *   unaffected; this bond's code is Apache-2.0).
 * - **d1-omni-600M is an early research release** (Decision Index 15.95 vs
 *   d1-3B's 48.57) and its audio input is not served over HTTP — this bond
 *   sends text and images only.
 * - **Your data leaves your servers** when hosted (Liquid processes the
 *   `state`). For data that must stay in your environment, run
 *   `llama-server -hf LiquidAI/d1-3B-GGUF:Q8_0` and set
 *   `LIQUID_DECISIONS_URL` — a llama-server has NO authentication, so keep it
 *   on a private network or behind an authenticating proxy (set
 *   `LIQUID_API_KEY`/`apiKey` and it is sent as the bearer token).
 * - 429 (rate limit) and 5xx-busy are retried up to 3 times with backoff —
 *   an aborting `signal` cuts the backoff short; other errors throw
 *   immediately with the API's message and a `status` property.
 * - Use the core's `setProvider`, not `bond('ai-decisions', …)` directly.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './secrets.js'
export * from './types.js'
export * from './wire.js'
