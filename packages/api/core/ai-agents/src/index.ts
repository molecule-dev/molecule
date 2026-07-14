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
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './types.js'
