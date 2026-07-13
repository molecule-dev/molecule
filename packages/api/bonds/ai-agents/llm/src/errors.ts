/**
 * Typed error for a failed agent run.
 *
 * @module
 */

import type { TokenUsage } from '@molecule/api-ai'
import type { AgentStep } from '@molecule/api-ai-agents'

/**
 * Thrown by `run()` when the agentic loop fails partway through — a provider
 * API error (rate limit, auth, overload, network), an abort, or any other
 * exception raised while draining a model turn or executing a tool.
 *
 * @remarks
 * A plain rejected `run()` promise has no channel to deliver partial
 * metering: the `Promise<AgentRunResult>` contract only carries `usage` on
 * the RESOLVED path, so a long run that dies on step 8 used to silently
 * under-meter the 7 turns of real, already-billed spend that came before it.
 * `AgentRunError` carries the `usage` totaled across every turn that
 * completed before the failure, plus the `steps` recorded so far, so a
 * caller that meters spend can book the partial usage instead of losing it.
 *
 * `error.message` is unchanged from the plain `Error` this replaces —
 * existing `catch (error) { … error.message … }` call sites keep working
 * without any change. Only callers that want the partial usage/steps need to
 * check `error instanceof AgentRunError`.
 *
 * @example
 * ```ts
 * import { AgentRunError } from '@molecule/api-ai-agents-llm'
 *
 * try {
 *   const result = await requireProvider().run({ task, tools })
 *   meterUsage(result.usage)
 * } catch (error) {
 *   if (error instanceof AgentRunError) {
 *     meterUsage(error.usage) // book whatever was billed before the failure
 *   }
 *   throw error
 * }
 * ```
 */
export class AgentRunError extends Error {
  /** Token usage summed across every turn that completed before the failure. */
  readonly usage: TokenUsage
  /** Every intermediate step (with its tool calls) recorded before the failure. */
  readonly steps: AgentStep[]

  /**
   * @param message - The error message (same text a plain `Error` would carry).
   * @param usage - Token usage accumulated across turns completed before the failure.
   * @param steps - Steps recorded before the failure.
   * @param options - Standard `Error` options — `cause` preserves the original thrown value.
   */
  constructor(
    message: string,
    usage: TokenUsage,
    steps: AgentStep[],
    options?: { cause?: unknown },
  ) {
    super(message, options)
    this.name = 'AgentRunError'
    this.usage = usage
    this.steps = steps
  }
}
