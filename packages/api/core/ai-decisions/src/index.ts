/**
 * Typed AI decisions for molecule.dev.
 *
 * Ask typed questions about a piece of text or JSON and get probabilities back,
 * not generated text: pick one option (`choice`), rate on an ordered scale
 * (`score`), or test a statement (`yesNo`). Use it for routing and triage
 * (which queue, how urgent), guardrails and moderation (is this spam, a
 * jailbreak, a refund request), and any branch in your code that needs a
 * judgment call about language. Many questions share one call.
 *
 * This core defines the `AIDecisionsProvider` contract and its bond accessor
 * only. Bond one provider:
 *
 * | Bond | What answers | When |
 * |---|---|---|
 * | `@molecule/api-ai-decisions-laya` | the open-weights Laya model (Apache-2.0) on a `laya-serve` host you run — or any other self-hosted `/v1/systemone` server | self-hosted, ~30–40 ms/question on a GPU (Laya), data stays with you |
| `@molecule/api-ai-decisions-kev` | the open-weights Kev models (Apache-2.0; Qwen-based, 0.8B/4B/9B/27B) on a `kev.serve` host you run | self-hosted on a GPU or Apple MLX (Kev-4B ~42 ms on an L40S); text only; ≤255 options; calibrated probabilities |
 * | `@molecule/api-ai-decisions-jeff` | the open-weights Jeff models (Qwen3.5 0.8B/2B, Gemma 4 E2B fine-tunes) on a `jeff-serve` host you run | self-hosted on a GPU or Apple MLX, ~20–30 ms/request; English only; ≤26 options |
 * | `@molecule/api-ai-decisions-intern-decision` | the open-weights Intern-Decision models (0.8B/2B/4B) on the Intern-Decision FastAPI service you run | self-hosted on a GPU; the only bond here whose model also reads `images` besides the LLM bond |
 * | `@molecule/api-ai-decisions-jev` | TypeSafe's hosted Jev API | no model to host; English-first |
 * | `@molecule/api-ai-decisions-llm` | whatever `ai` chat bond is bonded | no extra service; slower and costlier per call; passes `images` to vision chat models |
 *
 * @example
 * ```typescript
 * import { setProvider, requireProvider } from '@molecule/api-ai-decisions'
 * import { provider as laya } from '@molecule/api-ai-decisions-laya'
 *
 * setProvider(laya) // at startup — reads LAYA_URL / LAYA_API_KEY on first use
 *
 * const { answers } = await requireProvider().decide({
 *   state: { subject: 'Charged twice', body: 'I was billed twice this month, I want my money back' },
 *   questions: {
 *     queue: {
 *       type: 'choice',
 *       instructions: 'Which team should handle this?',
 *       criteria: { billing: 'invoices, refunds, charges', tech: 'bugs, login, outages', other: 'anything else' },
 *     },
 *     urgency: { type: 'score', instructions: 'How upset is the customer?', criteria: ['calm', 'firm', 'angry', 'furious'] },
 *     refund: { type: 'yesNo', instructions: 'The customer is asking for a refund.' },
 *   },
 *   minConfidence: 0.7,
 * })
 *
 * answers.queue.choice        // 'billing'
 * answers.urgency.level       // 2  (answers.urgency.score is the expected level, e.g. 2.64)
 * answers.refund.probability  // 0.97
 * if (answers.queue.lowConfidence) {
 *   // send to a human instead of auto-routing
 * }
 * ```
 *
 * @remarks
 * - **Interface + accessor only.** Use the core's `setProvider(provider)` /
 *   `setProvider('name', provider)`, then `requireProvider()` or
 *   `getProviderByName('name')`.
 * - **`confidence` is the probability of the reported answer** (`max` of the
 *   distribution), computed the same way by every bond. Vendors define their
 *   own `confidence` differently (Jev: `(n·pmax − 1)/(n − 1)`; Laya: normalized
 *   entropy), so a threshold copied from a vendor's docs does not transfer —
 *   pick thresholds on your own data.
 * - **Base models are not a finished classifier for your domain.** Laya's own
 *   benchmarks put its base checkpoints near chance (0.36) on the
 *   typed-decisions set zero-shot; its fine-tuned checkpoint reaches 0.77.
 *   Measure accuracy on a labelled sample of YOUR inputs before letting an
 *   answer act unattended, and gate on `minConfidence` → a human or an LLM
 *   fallback for the rest.
 * - **Probabilities ship over-confident** until calibrated on your traffic (Laya
 *   reports ECE 0.47 → 0.08 after temperature fitting). A 0.95 is not "right 95%
 *   of the time" until you have checked.
 * - **Keep option lists short.** Accuracy drops past ~20 `choice` options on
 *   Laya (the option texts share a ~192-token window); Jev accepts up to 255,
 *   `laya-serve` refuses >100. `score` takes 2–10 levels on Jev.
 * - **Keep state short.** Laya's English checkpoint reads 512 tokens (the
 *   multilingual one 1,024); longer state is truncated, not refused. Put the
 *   decisive text first.
 * - **`images` is opt-in per bond.** Pass `images: [{ mimeType: 'image/png',
 *   data: '<base64, no data: prefix>' }]` only with a bond whose model sees
 *   images (Intern-Decision, Jeff's PyTorch backend, the LLM bond over a
 *   vision model). Laya and Jev throw when `images` is set — they never
 *   answer from the text alone as if the image had been read.
 * - **Never use it to generate text** — there is no text output. For a
 *   free-text label set that changes per request, use
 *   `@molecule/api-ai-classification`.
 * - **Server-side only.** The provider key and the model host never belong in
 *   browser code.
 *
 * @e2e
 * Integration checklist — drive the real UI (live preview, no mocks), adapt
 * each item to this app's actual screens/flows, and check every box off one
 * by one. A box you can't check is an integration bug to fix — not a skip:
 * - [ ] Each flow that makes a decision (routing, triage, moderation, a
 *   guardrail) runs it from the real UI, and the answer DRIVES what happens
 *   next (the item lands in the chosen queue, the badge shows, the action is
 *   blocked) — not just printed.
 * - [ ] Both directions: a clearly-billing input routes to billing AND a
 *   clearly-technical one routes elsewhere. One label for every input is a
 *   broken integration.
 * - [ ] A low-confidence answer takes the app's fallback path (human review,
 *   "unsure" state) instead of being acted on.
 * - [ ] Provider errors (service down, bad key) show a visible, recoverable
 *   state — never a blank screen or an unhandled rejection.
 * - [ ] The call runs server-side: no provider request or key in the browser's
 *   Network tab.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './types.js'
