/**
 * Module augmentation: extends the core `@molecule/api-ai-agents` contract's
 * `AgentRunInput` with two options this bond's `run()` honors.
 *
 * @remarks
 * Both fields are ADDITIVE ONLY — they never widen or erase an existing
 * `AgentRunInput` field — and are consumed exclusively by this bond's `run()`
 * implementation; a different `AIAgentsProvider` bond is free to ignore them.
 * Any file that imports `@molecule/api-ai-agents-llm` (directly, or
 * transitively by bonding its `provider`) sees the merged `AgentRunInput`
 * type, matching the shape `@molecule/api-ai`'s `ChatParams` already accepts
 * for `stream` and `cacheControl`.
 *
 * @module
 */

// Side-effect import: makes this file a module augmenting
// `@molecule/api-ai-agents` rather than a standalone global script.
import '@molecule/api-ai-agents'

declare module '@molecule/api-ai-agents' {
  interface AgentRunInput {
    /**
     * Whether each model turn streams its response (default `true`).
     *
     * The loop previously hardcoded `stream: false` on every turn even
     * though `onEvent` exists specifically as a live hook — with streaming
     * off, every provider bond parses the FULL response in one shot, so
     * `onEvent` only ever fires once per turn instead of incrementally.
     * That also risks HTTP timeouts on a large non-streamed turn (e.g. a
     * big tool input at a raised `maxTokens`) — exactly the case provider
     * docs recommend streaming to avoid. `drainStream` already handles
     * streamed events correctly (text accumulation, `tool_use`, `done` all
     * fold the same way), so there is no extra work to opt in. Set `false`
     * to force non-streaming (e.g. a provider/proxy that cannot forward
     * SSE) — `onEvent` then only fires once per turn.
     */
    stream?: boolean
    /**
     * Prompt-cache breakpoint hint passed through to `ai.chat()` on every
     * turn. The loop's `system` + `tools` prefix is identical across turns,
     * so caching it avoids re-billing the full (growing) prompt on each of
     * up to `maxSteps` turns. Only providers that support prompt caching
     * (e.g. `@molecule/api-ai-anthropic`) act on it; others ignore it.
     */
    cacheControl?: { type: 'ephemeral' }
  }
}
