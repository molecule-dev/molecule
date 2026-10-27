/**
 * LLM-backed AI agents provider for molecule.dev — the batteries-included
 * tool-calling loop that implements the `@molecule/api-ai-agents` core contract.
 *
 * Ships a default `provider` (`name: 'llm'`) that drives a model↔tool loop over
 * the swappable `ai` chat bond (`@molecule/api-ai`): it calls the model,
 * executes any tools the model requests via each `AITool.execute()`, feeds the
 * results back, and repeats until the model stops calling tools (or the
 * `maxSteps` budget is exhausted). Bond it once at startup, then drive it from
 * anywhere via the `@molecule/api-ai-agents` accessor.
 *
 * @example
 * ```typescript
 * import { bond } from '@molecule/api-bond'
 * import { requireProvider } from '@molecule/api-ai-agents'
 * import { provider as agents } from '@molecule/api-ai-agents-llm'
 * import type { AITool } from '@molecule/api-ai'
 *
 * // Wire at startup (an `ai` provider must already be bonded).
 * bond('ai-agents', agents)
 *
 * const myTool: AITool = {
 *   name: 'add',
 *   description: 'Add two numbers',
 *   parameters: {
 *     type: 'object',
 *     properties: { a: { type: 'number' }, b: { type: 'number' } },
 *     required: ['a', 'b'],
 *   },
 *   execute: async (input) => {
 *     const { a, b } = input as { a: number; b: number }
 *     return a + b
 *   },
 * }
 *
 * const result = await requireProvider().run({
 *   task: 'What is 1 + 2? Use the add tool.',
 *   tools: [myTool],
 * })
 * console.log(result.output) // final assistant answer
 * console.log(result.steps)  // intermediate tool calls + results
 * console.log(result.usage)  // token usage summed across all model calls
 * ```
 *
 * @remarks
 * **Requires a bonded `ai` provider** (`bond('ai', provider)` or a named
 * provider selected via `run({ provider: 'anthropic' })`) whose model supports
 * tool use — this agent has no model of its own; it orchestrates the `ai` bond.
 *
 * The loop executes your tools: each model `tool_use` runs the matching
 * `AITool.execute(input)` and the return value is fed back as a `tool_result`.
 * A thrown tool error or an unknown tool name becomes an error `tool_result`
 * (recorded with `isError: true`) instead of aborting the run, so the model can
 * recover. `run()` requires exactly one of `task` (a single user turn) or
 * `messages` (a full history); it throws if neither — or both — is supplied.
 *
 * Every model turn streams by default (`input.stream` — set `false` to force
 * non-streaming) and, when `input.cacheControl` is set, is passed through to
 * `ai.chat()` on every turn so a provider that supports prompt caching (e.g.
 * `@molecule/api-ai-anthropic`) doesn't re-bill the identical `system` + `tools`
 * prefix on each of up to `maxSteps` turns. Note `onEvent` is only an
 * INCREMENTAL live hook while streaming — with `stream: false` it fires once
 * per turn with the whole response.
 *
 * `input.thinking` forwards the core chat contract's native thinking settings
 * on every turn. Streamed reasoning is retained in `ChatMessage.reasoning`
 * across tool calls, separately from assistant text and tool arguments.
 * Omitting the option does not enable thinking or manufacture reasoning.
 *
 * Two further options are OPT-IN and change nothing when omitted:
 *
 * - `input.maxToolResultChars` bounds the `tool_result` copy sent to the model
 *   (a whole-file or log dump otherwise crowds out the instruction that asked
 *   for it) and appends an explicit truncation note telling the model the value
 *   was cut and how to recover. The step record keeps the complete tool result.
 * - `input.finalSynthesisOnBudgetExhaustion` spends ONE tool-free turn after
 *   the `maxSteps` budget is exhausted, so a run that ended on a tool
 *   invocation still returns a final answer instead of the budget note. That
 *   turn carries the same history, system, model, thinking, cache, streaming
 *   and signal settings plus one short generic instruction to answer now from
 *   the evidence already gathered (without it a model mid-investigation can
 *   keep planning). Its events reach `onEvent`, its usage is metered, and it
 *   cannot call tools: a tool request on that turn is never executed and is not
 *   accepted as a final answer. If the turn produces no answer text, `run()`
 *   rejects with `AgentRunError` instead of returning the budget note, and the
 *   message says whether the turn requested another tool or returned no
 *   content (e.g. only reasoning).
 *
 * Failure semantics (how to tell failure modes apart):
 * - **Tool failure** (throwing `execute()`, unknown tool name) — NON-fatal:
 *   recorded on the step with `isError: true` and fed back to the model.
 * - **AI provider API failure** (rate limit, bad key, overload, network — the
 *   `ai` bond emits an in-band `error` ChatEvent), **an abort, or any other
 *   mid-run exception** — FATAL: `run()` rejects with an `AgentRunError`
 *   (message text unchanged from a plain `Error`) carrying the `usage` and
 *   `steps` accumulated across every turn that completed before the failure —
 *   a caller that meters spend can book that partial usage instead of losing
 *   it. `run()` never resolves with a silently empty `output`, so an empty
 *   `result.output` means the model genuinely produced no text, not that the
 *   API failed.
 * - **Step budget exhausted** — resolves normally; `output` is the last
 *   assistant text or an explicit "step budget exhausted" note. With
 *   `input.finalSynthesisOnBudgetExhaustion` the output is instead the answer
 *   from one final tool-free turn, and a synthesis that produced no answer
 *   rejects (as an `AgentRunError`) rather than resolving with the note.
 *
 * Swappable like any bond: replace this LLM agent with your own
 * `AIAgentsProvider` via `bond('ai-agents', myProvider)` — nothing else changes.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './errors.js'
export * from './provider.js'
export * from './types.js'
