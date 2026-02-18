/**
 * Model-agnostic AI chat interface for molecule.dev.
 *
 * Defines the `AIProvider` interface that bond packages (Anthropic, OpenAI, etc.)
 * implement, plus types for messages, streaming events, tool use, and token usage.
 *
 * @example
 * ```typescript
 * import { requireProvider } from '@molecule/api-ai'
 * import type { ChatParams } from '@molecule/api-ai'
 *
 * const ai = requireProvider()
 * const params: ChatParams = {
 *   messages: [{ role: 'user', content: 'Hello!' }],
 *   stream: true,
 * }
 * for await (const event of ai.chat(params)) {
 *   if (event.type === 'text') process.stdout.write(event.content)
 * }
 * ```
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'
