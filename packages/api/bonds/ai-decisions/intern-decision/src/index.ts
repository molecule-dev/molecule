/**
 * Intern-Decision decisions provider for molecule.dev — typed decisions about
 * text AND images from the open-weights Intern-Decision models on a server
 * you run.
 *
 * Intern-Decision (github.com/internlm/Intern-Decision, from InternLM) is a
 * family of Qwen3.5 fine-tunes — 0.8B, 2B and 4B — that answer `choice`,
 * `score` and yes/no questions with a probability per option, and can read up
 * to 8 images alongside the text (a screenshot, a photo, a scanned form). Its
 * maker reports 90.0% average accuracy for the 4B (44 ms/request) and 84.7%
 * for the 2B (33 ms on an RTX 4090). This bond speaks the service's
 * `POST /v1/decisions` route; the question and answer shapes match the Jev /
 * Laya / Jeff bonds, so swapping is a one-line change.
 *
 * @example
 * ```bash
 * # Run the service on a GPU host (it binds 127.0.0.1:7860 and has NO auth)
 * git clone https://github.com/internlm/Intern-Decision && cd Intern-Decision
 * python -m venv .venv && . .venv/bin/activate
 * pip install -r requirements-inference.txt
 * MODEL_CHECKPOINT=/models/Intern-Decision-2B bash scripts/demo.sh
 * ```
 *
 * ```typescript
 * import { readFileSync } from 'node:fs'
 *
 * import { setProvider, requireProvider } from '@molecule/api-ai-decisions'
 * import { provider } from '@molecule/api-ai-decisions-intern-decision'
 *
 * setProvider(provider) // reads INTERN_DECISION_URL (+ INTERN_DECISION_API_KEY for a proxy) on first use
 *
 * const { answers } = await requireProvider().decide({
 *   state: 'A screenshot of the app preview after deploy.',
 *   images: [{ mimeType: 'image/png', data: readFileSync('preview.png').toString('base64') }],
 *   questions: {
 *     blank: { type: 'yesNo', instructions: 'The page is blank or shows only an error.' },
 *     layout: { type: 'choice', instructions: 'What does the page show?', criteria: { landing: 'a marketing page', app: 'an app screen', error: 'an error page' } },
 *   },
 * })
 * answers.blank.probability // 0.04
 * answers.layout.choice     // 'landing'
 * ```
 *
 * @remarks
 * - **The service has NO authentication** and binds `127.0.0.1` by default.
 *   Never publish its port: reach it over a private network, or put an
 *   authenticating reverse proxy in front and set `INTERN_DECISION_API_KEY`
 *   (sent as `Authorization: Bearer …` — the service itself ignores it).
 * - **Default port is 7860**, not 8000: `INTERN_DECISION_URL` defaults to
 *   `http://127.0.0.1:7860`.
 * - **One checkpoint per server; `model` is ignored.** The service answers with
 *   whatever `MODEL_CHECKPOINT` it loaded (`result.model` is always
 *   `'intern-decision'`). Run a second server for a second size.
 * - **Limits (checked here before sending, else a 422):** 1–16 questions per
 *   request, 1–62 options per `choice` or levels per `score`, up to 8 images of
 *   PNG / JPEG / WebP / still GIF, each ≤12 MB decoded and ≤32 MB total (and
 *   ≤16 million pixels — checked by the server only). `images[].data` is raw
 *   base64 — no `data:` prefix.
 * - **Input is capped at 8,192 tokens** by default (`MAX_INPUT_LENGTH` on the
 *   server). Put the decisive text first.
 * - **Requests are serialized** on the server (one model lock); concurrent
 *   calls queue rather than fail. A loading server answers 503; this bond
 *   retries 429/502/503/504/529 up to 3 times. Errors carry the HTTP `status`.
 * - **Calibration:** each checkpoint ships a fitted temperature (2B: 2.1),
 *   applied only when the server is configured with its calibration file —
 *   and the HF and XTuner backends give slightly different probabilities.
 *   Calibrate on labelled samples of your inputs and gate on `minConfidence`.
 * - **Not a chat model and does not reason.** It picks among the options you
 *   describe; the service's optional "thinking" handoff to an external LLM is
 *   not used by this bond.
 * - **License:** the code is Apache-2.0; the weights' Hugging Face cards say
 *   Apache-2.0 while the repo README says Qwen model terms apply — check
 *   LICENSE-QWEN before offering it to third parties.
 * - Use the core's `setProvider`, not `bond('ai-decisions', …)` directly.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './secrets.js'
export * from './types.js'
export * from './wire.js'
