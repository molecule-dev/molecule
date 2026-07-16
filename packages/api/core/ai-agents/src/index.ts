/**
 * AI agents core for molecule.dev — the swappable tool-calling agent contract.
 *
 * Interface-only core: it defines the `AIAgentsProvider` interface (a
 * batteries-included tool-calling agent) plus the bond accessor
 * (`setProvider`/`getProvider`/`requireProvider`/…). The default implementation
 * — a model↔tool loop over the swappable `ai` chat bond (`@molecule/api-ai`) —
 * ships in the `@molecule/api-ai-agents-llm` bond package. Bond a provider once
 * at startup, then drive it from anywhere.
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
 * tool use — the agent has no model of its own; it orchestrates the `ai` bond.
 *
 * This package is the abstract contract only. To get a working agent, also bond
 * the `@molecule/api-ai-agents-llm` provider (or your own `AIAgentsProvider`)
 * via `bond('ai-agents', provider)` — nothing else changes.
 *
 * - **`setProvider(name, provider)` ambiguity:** the FIRST named provider you
 *   register also auto-promotes to the singleton (so plain
 *   `getProvider()`/`requireProvider()` work without the caller knowing the
 *   name) — but that promotion is a single-provider convenience, not a
 *   permanent pick. The moment a SECOND, differently-named provider is
 *   registered, `getProvider()` stops returning the first one and declines
 *   (`null`) instead — `requireProvider()` throws pointing at
 *   `getProviderByName(name)`. Call the explicit `setProvider(provider)` (no
 *   name) form if you want one provider to always win regardless of how many
 *   named providers you also register.
 *
 * @e2e
 * Integration checklist — drive the real UI (live preview, no mocks), give the
 * agent a task that genuinely needs several tool calls, adapt each item to this
 * app's actual agent surface + its registered tools, and check every box off one
 * by one. A box you can't check is an integration bug to fix — not a skip:
 * - [ ] A multi-step task drives a real agentic LOOP, not one shot: `run()`
 *   records more than one entry in `result.steps`, and each `toolCalls[]` names a
 *   tool the agent was actually given. Confirm each tool's `execute()` truly RAN
 *   via its own side effect / log / the resource it touched — not that the model
 *   narrated calling it — and that `result.output` is a final answer that USES
 *   those tool results to complete the task.
 * - [ ] The loop TERMINATES cleanly: it either reaches a done state (the model
 *   stops calling tools, so `run()` returns the final `output`) or hits the
 *   `maxSteps` cap (default 10) and stops with the step-budget note as `output`.
 *   It never spins forever or ping-pongs the same tool endlessly — a step cap
 *   exists and is honored: `result.steps.length <= maxSteps`, and a task built to
 *   loop past the budget stops AT the cap rather than running away.
 * - [ ] A tool that fails mid-loop is handled, not fatal: when a tool's
 *   `execute()` throws (or the model names a tool that was never registered), that
 *   call is caught and fed back to the model as an error tool result — the
 *   matching `toolCalls[]` has `isError: true`, the loop continues, and the run
 *   still returns a result. The request never crashes. (Only an `ai`-provider
 *   failure rejects — as `AgentRunError` carrying the partial `usage`/`steps` —
 *   and it surfaces as a handled error, not an unhandled throw.)
 * - [ ] If the run streams (the default), the UI shows progress INCREMENTALLY:
 *   the `onEvent` hook fires per `ChatEvent` (thinking `text`, `tool_use`, `done`)
 *   as they arrive, so the user watches the agent think + call tools live — not a
 *   long freeze then one blob at the end.
 * - [ ] SECURITY — the agent can call ONLY the tools handed to this run: a tool
 *   name the model invents (or one injected via the task or a tool's own output)
 *   that was never in `input.tools` is refused as an `unknown tool` error, not
 *   executed. Tool execution stays server-side under its backend's guards (e.g.
 *   the `@molecule/api-ai-tools` `pathGuards`/`redactSecrets`/`blockCommand`), and
 *   the `ai` provider key lives on the API, never the client. Feed a
 *   prompt-injected instruction (in the task, or in data a tool returns) telling
 *   the agent to escape the workspace, run a privileged command, or exfiltrate a
 *   secret, and confirm it CANNOT do anything the user couldn't do directly.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './types.js'
