/**
 * AI agents provider interface.
 *
 * A batteries-included tool-calling agent: given a task (or a full message
 * history) and a set of tools, it drives a model↔tool loop over the swappable
 * `ai` chat bond until the model stops calling tools (or the step budget is
 * exhausted). Bond a provider with `bond('ai-agents', provider)` and drive it
 * with `requireProvider().run({ task, tools })`.
 *
 * @module
 */

import type { AITool, ChatEvent, ChatMessage, TokenUsage } from '@molecule/api-ai'

/**
 * Input for a single agent run.
 *
 * Exactly one of `task` or `messages` is required — `task` is a convenience for
 * a single user turn; `messages` supplies a full conversation history.
 */
export interface AgentRunInput {
  /** Convenience: a single user task string (seeds one `user` message). */
  task?: string
  /** A full message history to seed the conversation (mutually exclusive with `task`). */
  messages?: ChatMessage[]
  /** Optional system prompt passed to the model on every turn. */
  system?: string
  /** Tools the agent may call; each call runs the matching tool's `execute()`. */
  tools?: AITool[]
  /** Maximum model↔tool round-trips before the loop stops (default 10). */
  maxSteps?: number
  /** Model identifier passed through to the AI provider. */
  model?: string
  /**
   * Max output tokens per model turn, passed through to the AI provider.
   * Without it the provider's default (typically 4096) applies — too small for
   * turns whose tool input is a whole file; a truncated tool-input JSON parses
   * as an empty `{}` input, which looks like a model bug to the caller.
   */
  maxTokens?: number
  /** Named AI provider to use; falls back to the singleton when omitted. */
  provider?: string
  /** Sampling temperature passed through to the AI provider. */
  temperature?: number
  /** Abort signal to cancel in-flight model requests and stop tool execution. */
  signal?: AbortSignal
  /** Optional live hook invoked for every streamed `ChatEvent`. */
  onEvent?: (event: ChatEvent) => void
}

/**
 * A single tool invocation performed during a run.
 */
export interface AgentToolCall {
  /** Provider-assigned tool-use id, echoed back in the tool result. */
  id: string
  /** Name of the tool the model called. */
  name: string
  /** Raw input the model produced for the tool. */
  input: unknown
  /** Value returned by `execute()`, or an error string when the call failed. */
  result: unknown
  /** `true` when the tool threw or the name was unknown. */
  isError?: boolean
}

/**
 * One round-trip of the agent loop: the assistant text (if any) plus every tool
 * call executed before the next model turn.
 */
export interface AgentStep {
  /** Assistant text emitted on this step, if any. */
  text?: string
  /** Tool calls executed on this step. */
  toolCalls: AgentToolCall[]
}

/**
 * Result of a completed agent run.
 */
export interface AgentRunResult {
  /** Final assistant text (or a note if the step budget was exhausted). */
  output: string
  /** Every intermediate step that invoked tools, in order. */
  steps: AgentStep[]
  /** Token usage summed across all model calls in the run. */
  usage: TokenUsage
}

/**
 * AI agents provider interface.
 *
 * Implemented by the default provider in this package (and swappable via
 * `bond('ai-agents', provider)`). Runs an agentic tool-calling loop over the
 * bonded `ai` chat provider.
 */
export interface AIAgentsProvider {
  /** Provider identifier (the default implementation reports `'default'`). */
  readonly name: string
  /**
   * Runs the agentic loop to completion and returns the final result.
   *
   * @param input - The task/messages, tools, and loop options.
   * @returns The final output, the recorded steps, and total token usage.
   */
  run(input: AgentRunInput): Promise<AgentRunResult>
}

/**
 * Config options for an AI agents bond.
 */
export interface AIAgentsConfig {
  [key: string]: unknown
}
