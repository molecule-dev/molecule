/**
 * Module augmentation: extends the core `@molecule/api-ai-agents` contract's
 * `AgentRunInput` with options this bond's `run()` honors.
 *
 * @remarks
 * These fields are ADDITIVE ONLY — they never widen or erase an existing
 * `AgentRunInput` field — and are consumed exclusively by this bond's `run()`
 * implementation; a different `AIAgentsProvider` bond is free to ignore them.
 * Any file that imports `@molecule/api-ai-agents-llm` (directly, or
 * transitively by bonding its `provider`) sees the merged `AgentRunInput`
 * type, matching the shape `@molecule/api-ai`'s `ChatParams` already accepts
 * for `stream`, `cacheControl`, and `thinking`.
 *
 * @module
 */

// Side-effect import: makes this file a module augmenting
// `@molecule/api-ai-agents` rather than a standalone global script.
import '@molecule/api-ai-agents'

import type { ChatParams } from '@molecule/api-ai'

declare module '@molecule/api-ai-agents' {
  interface AgentRunInput {
    /**
     * Native thinking settings forwarded unchanged on every model turn.
     * Streamed thinking is retained as `ChatMessage.reasoning` when a tool
     * call continues, so providers that replay reasoning receive it intact.
     * Omitting this option does not enable thinking.
     */
    thinking?: ChatParams['thinking']
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
    /**
     * Caps how many characters of a serialized tool result are placed in the
     * model-facing conversation (default: unbounded).
     *
     * A tool that returns a whole file, log, or search dump can consume most
     * of the context window in one step and crowd out the instruction that
     * asked for it, so a bounded run can "forget" what it was doing and answer
     * from the dump instead. When set, each `tool_result` block sent to the
     * model carries at most this many characters of the serialized result,
     * followed by an explicit note stating that the value was truncated and
     * how to recover (re-run the tool with a narrower range or scope). The
     * step record's `AgentToolCall.result` keeps the COMPLETE value — only the
     * copy the model sees is bounded, so a caller reading the steps (a report,
     * a diff, an assertion) still gets everything the tool returned.
     *
     * The limit applies to the result body; the truncation note is appended
     * after it and is not counted against the budget. Results at or under the
     * limit — including the loop's own error strings — pass through unchanged.
     * A cut never splits a surrogate pair. Must be a finite number of at least
     * 1 character (fractional values are floored); any other value rejects the
     * run before a model call is made. Omit it for the previous unbounded
     * behavior.
     */
    maxToolResultChars?: number
    /**
     * After the `maxSteps` budget is exhausted while the model was still
     * calling tools, spend ONE final synthesis turn with NO tools and return
     * its text as `output` (default `false`).
     *
     * Without it, a run that ends on a tool invocation has no final assistant
     * text: `output` falls back to the "step budget exhausted" note and any
     * report the model was about to write is lost, even though the work that
     * filled the budget succeeded. Opting in buys the model one tool-free turn
     * to answer from what it has already seen.
     *
     * The synthesis turn preserves everything the loop was using: the full
     * message history (including retained reasoning), `system`, `model`,
     * `maxTokens`, `temperature`, `thinking`, `stream`, `cacheControl`,
     * `provider`, and `signal`. It also carries ONE short, generic instruction
     * (a user message appended after the history, for that request only)
     * stating that the step budget is exhausted, that no further tool calls
     * are allowed, and to answer now from the evidence already gathered.
     * Without it a tool-free turn is just the same conversation with no tools,
     * and a model mid-investigation can keep planning instead of answering.
     * Its events reach `onEvent` and its usage is added to `result.usage`, so
     * live monitoring and metering see the extra call. The instruction is
     * never sent on any other turn, so normal runs are byte- and
     * cost-identical.
     *
     * It offers no tools and never executes a tool call: a tool request on that
     * turn cannot be executed and is NOT accepted as a final answer (even when
     * the turn also emitted text), because it is a plan to keep going rather
     * than an answer. The recorded `steps` stay exactly the tool-invoking
     * rounds — `steps.length >= maxSteps` still means "budget exhausted".
     *
     * The response is returned as-is (not trimmed). A turn that produces no
     * answer text is NOT papered over with the exhausted-budget note: `run()`
     * rejects with an `AgentRunError` carrying the accumulated `usage`/`steps`,
     * and the message distinguishes a content-free turn (including one that
     * returned only reasoning) from a turn that requested another tool. A
     * provider error on that turn rejects the same way. Only the literal `true`
     * enables this; omit it for the previous behavior and cost.
     */
    finalSynthesisOnBudgetExhaustion?: boolean
  }
}
