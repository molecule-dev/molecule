/**
 * The default LLM-backed AI agents provider: a tool-calling loop over the
 * bonded `ai` chat provider.
 *
 * This provider owns the agentic loop that used to live in the
 * `@molecule/api-ai-agents` core. It composes the swappable `ai` chat bond
 * (`@molecule/api-ai`): it calls the model, executes any tools the model
 * requests, feeds the results back, and repeats until the model stops calling
 * tools (or the `maxSteps` budget is exhausted). Living in a bond package (not
 * the core) keeps the core interface-only.
 *
 * @module
 */

// Side-effect import: augments AgentRunInput with this bond's typed request
// options (see types.ts).
import './types.js'

import type { ChatEvent, ContentBlock, TokenUsage } from '@molecule/api-ai'
import {
  getProviderByName as getAiProviderByName,
  requireProvider as requireAiProvider,
} from '@molecule/api-ai'
import type {
  AgentRunInput,
  AgentRunResult,
  AgentStep,
  AgentToolCall,
  AIAgentsProvider,
} from '@molecule/api-ai-agents'
import { t } from '@molecule/api-i18n'

import { AgentRunError } from './errors.js'

/** One drained chat stream: accumulated text, reasoning, tools, and usage. */
interface DrainedStream {
  text: string
  reasoning?: string
  toolUses: Array<{ id: string; name: string; input: unknown }>
  usage: TokenUsage
  /**
   * The message of the FIRST `error` ChatEvent, if the provider emitted one.
   * Provider bonds surface API failures (401/429/529, network errors) as an
   * in-band `error` event followed by a graceful return — NOT a throw — so a
   * drain that ignored them turned "the API errored" into a successful-looking
   * empty turn. The caller uses this to reject the run instead.
   */
  errorMessage?: string
}

/**
 * Adds one usage delta into a running total (input/output summed, cache fields
 * carried when present).
 *
 * @param total - The running total, mutated in place.
 * @param delta - The usage to add.
 */
function addUsage(total: TokenUsage, delta: TokenUsage): void {
  total.inputTokens += delta.inputTokens ?? 0
  total.outputTokens += delta.outputTokens ?? 0
  if (delta.cacheCreationInputTokens != null) {
    total.cacheCreationInputTokens =
      (total.cacheCreationInputTokens ?? 0) + delta.cacheCreationInputTokens
  }
  if (delta.cacheReadInputTokens != null) {
    total.cacheReadInputTokens = (total.cacheReadInputTokens ?? 0) + delta.cacheReadInputTokens
  }
}

/**
 * Stringifies a tool result for a `tool_result` content block.
 *
 * @param result - The value returned by a tool's `execute()`.
 * @returns A string representation suitable for the model.
 */
function stringifyResult(result: unknown): string {
  if (typeof result === 'string') return result
  try {
    // JSON.stringify returns `undefined` for `undefined`/functions/symbols —
    // fall back to String() so the block content is always a string.
    return JSON.stringify(result) ?? String(result)
  } catch (_error) {
    // Circular structures throw; a plain String() is the best available
    // representation for the model. Intentionally not fatal to the run.
    return String(result)
  }
}

/**
 * Bounds a serialized tool result for the MODEL-FACING conversation and, when
 * it has to cut, appends an explicit truncation + recovery note.
 *
 * @remarks
 * Only the copy sent to the model is bounded: the step record keeps the
 * complete value (see `AgentToolCall.result`). The note is appended after the
 * budget, so it is not counted against it, and the cut never splits a
 * surrogate pair (an unpaired half is not valid text).
 *
 * @param serialized - The complete serialized tool result.
 * @param maxChars - The character budget, or `undefined` for unbounded.
 * @returns The content for the `tool_result` block.
 */
function boundToolResult(serialized: string, maxChars: number | undefined): string {
  if (maxChars === undefined || serialized.length <= maxChars) return serialized
  let end = maxChars
  const lastCode = serialized.charCodeAt(end - 1)
  // Drop a split surrogate pair rather than send half a code point.
  if (lastCode >= 0xd800 && lastCode <= 0xdbff) end -= 1
  return (
    serialized.slice(0, end) +
    t(
      'ai-agents.toolResultTruncated',
      { shown: end, total: serialized.length },
      {
        defaultValue:
          '\n\n[Truncated: {{shown}} of {{total}} characters shown. The complete result is retained outside this conversation; call the tool again with a narrower range or smaller scope to read the rest.]',
      },
    )
  )
}

/**
 * Drains a single chat stream, accumulating text and tool calls, forwarding
 * every event to `onEvent`, and summing `done.usage`.
 *
 * @param stream - The async iterable of chat events from `ai.chat()`.
 * @param onEvent - Optional hook invoked for every event.
 * @returns The accumulated text, tool calls, and usage for this turn.
 */
async function drainStream(
  stream: AsyncIterable<ChatEvent>,
  onEvent?: (event: ChatEvent) => void,
): Promise<DrainedStream> {
  let text = ''
  let reasoning: string | undefined
  const toolUses: Array<{ id: string; name: string; input: unknown }> = []
  const usage: TokenUsage = { inputTokens: 0, outputTokens: 0 }
  let errorMessage: string | undefined
  let sawDone = false
  let lastSnapshot: TokenUsage | undefined

  for await (const event of stream) {
    onEvent?.(event)
    switch (event.type) {
      case 'text':
        text += event.content
        break
      case 'thinking':
        reasoning = (reasoning ?? '') + event.content
        break
      case 'tool_use':
        toolUses.push({ id: event.id, name: event.name, input: event.input })
        break
      case 'usage':
        // Incremental snapshot (latest wins) — booked below if the stream ends
        // without a `done` (metering contract in @molecule/api-ai ChatEvent).
        lastSnapshot = event.usage
        break
      case 'error':
        // Keep the FIRST error; providers emit one sanitized error then return.
        errorMessage ??= event.message
        break
      case 'done':
        sawDone = true
        addUsage(usage, event.usage)
        break
      default:
        break
    }
  }

  // METERING CONTRACT: a stream cut without a `done` (provider error event,
  // upstream disconnect) still billed the tokens reported so far — book the
  // latest snapshot instead of silently dropping the turn's spend.
  if (!sawDone && lastSnapshot) {
    addUsage(usage, lastSnapshot)
  }

  return { text, reasoning, toolUses, usage, errorMessage }
}

/**
 * The LLM-backed AI agents provider: a tool-calling loop over the bonded `ai`
 * chat provider.
 *
 * Bond it with `bond('ai-agents', provider)` and drive it with
 * `requireProvider().run({ task, tools })`. Requires a bonded `ai` provider
 * whose model supports tool use.
 */
export const provider: AIAgentsProvider = {
  name: 'llm',

  async run(input: AgentRunInput): Promise<AgentRunResult> {
    if (!input.task && !(input.messages && input.messages.length > 0)) {
      throw new Error(
        t('ai-agents.error.noTaskOrMessages', undefined, {
          defaultValue: 'AgentRunInput requires a `task` string or a non-empty `messages` array.',
        }),
      )
    }
    // The contract is EXACTLY one of task/messages (see AgentRunInput). The old
    // behavior silently discarded `task` when both were passed — an executor's
    // task vanished with no signal. Fail loudly instead.
    if (input.task && input.messages && input.messages.length > 0) {
      throw new Error(
        t('ai-agents.error.bothTaskAndMessages', undefined, {
          defaultValue:
            'AgentRunInput accepts either `task` or `messages`, not both. Put the task in the `messages` history (as the last user message) or drop one of the two.',
        }),
      )
    }

    // Validate the opt-in tool-result budget up front: a bad number would
    // otherwise surface mid-loop as a truncation bug instead of a caller error.
    const toolResultLimit =
      input.maxToolResultChars === undefined ? undefined : Math.floor(input.maxToolResultChars)
    if (
      toolResultLimit !== undefined &&
      (!Number.isFinite(toolResultLimit) || toolResultLimit < 1)
    ) {
      throw new Error(
        t(
          'ai-agents.error.invalidMaxToolResultChars',
          { value: String(input.maxToolResultChars) },
          {
            defaultValue:
              '`maxToolResultChars` must be a finite number of at least 1 character (received {{value}}; fractional values are floored).',
          },
        ),
      )
    }

    const ai = input.provider ? getAiProviderByName(input.provider) : requireAiProvider()
    if (!ai) {
      throw new Error(
        t(
          'ai-agents.error.aiProviderNotFound',
          { name: input.provider ?? '' },
          { defaultValue: `AI provider "${input.provider}" is not bonded.` },
        ),
      )
    }

    const messages = input.messages
      ? [...input.messages]
      : [{ role: 'user' as const, content: input.task! }]

    const maxSteps = input.maxSteps ?? 10
    const steps: AgentStep[] = []
    const usage: TokenUsage = { inputTokens: 0, outputTokens: 0 }
    let lastText = ''

    /**
     * Sends ONE model turn over the bonded chat provider, forwarding every
     * event to `onEvent`, booking its usage, and rejecting on an in-band
     * provider error (so "the API failed" never looks like an empty answer).
     *
     * @param offerTools - When `false` the request carries NO `tools` field,
     *   so the provider cannot ask for a tool call (the final synthesis turn).
     * @returns The drained turn.
     */
    const modelTurn = async (offerTools: boolean): Promise<DrainedStream> => {
      const turn = await drainStream(
        ai.chat({
          messages,
          system: input.system,
          ...(offerTools ? { tools: input.tools } : {}),
          model: input.model,
          maxTokens: input.maxTokens,
          temperature: input.temperature,
          // Keep the caller's native thinking settings on every tool turn.
          ...(input.thinking === undefined ? {} : { thinking: input.thinking }),
          // Defaults to streaming (see the `stream` augmentation in
          // types.ts): onEvent is a LIVE hook, and non-streaming requests
          // with large outputs (a big tool input at a raised maxTokens) are
          // exactly what provider docs warn will time out over HTTP.
          // drainStream already folds streamed events correctly, so there
          // is no extra cost to defaulting streaming on. Set
          // `input.stream: false` to force non-streaming.
          stream: input.stream !== false,
          // Prompt-cache breakpoint hint: the system+tools prefix is
          // identical across turns, so passing this through avoids
          // re-billing the full (growing) prompt on every one of up to
          // maxSteps turns. Providers without cache support ignore it.
          cacheControl: input.cacheControl,
          signal: input.signal,
        }),
        input.onEvent,
      )
      addUsage(usage, turn.usage)

      // A provider API failure (rate limit, auth, overload, network) arrives
      // as an in-band `error` ChatEvent — the stream ends without text or
      // tools. Rejecting here disambiguates "the AI provider failed" from
      // "the model legitimately answered nothing": the old fall-through
      // returned { output: '', steps, usage } as if the run succeeded, and
      // callers debugging the empty output had no signal that the API ever
      // errored.
      if (turn.errorMessage !== undefined) {
        throw new Error(
          t(
            'ai-agents.error.providerError',
            { message: turn.errorMessage },
            { defaultValue: `AI provider error during agent run: ${turn.errorMessage}` },
          ),
        )
      }
      return turn
    }

    // Everything below can fail partway through a multi-turn run (a provider
    // API error, an abort, or an unexpected throw from ai.chat() itself —
    // e.g. a signal-aborted fetch). A plain rejection would silently drop
    // every prior turn's `usage`/`steps`: a run that dies on step 8 would
    // under-meter 7 turns of real billed spend. Wrap the whole loop so ANY
    // failure re-throws as an AgentRunError carrying what was accumulated so
    // far — `error.message` is unchanged, so existing catch sites keep
    // working; only callers that want the partial usage/steps need to check
    // `instanceof AgentRunError`.
    try {
      for (let step = 0; step < maxSteps; step++) {
        const turn = await modelTurn(true)

        if (turn.text) lastText = turn.text

        // Append the assistant turn: a text block (if any) + one tool_use block
        // per requested tool call.
        const assistantContent: ContentBlock[] = []
        if (turn.text) assistantContent.push({ type: 'text', text: turn.text })
        for (const tu of turn.toolUses) {
          assistantContent.push({ type: 'tool_use', id: tu.id, name: tu.name, input: tu.input })
        }
        messages.push({
          role: 'assistant',
          content: assistantContent,
          ...(turn.reasoning === undefined ? {} : { reasoning: turn.reasoning }),
        })

        if (turn.toolUses.length === 0) {
          // No tools requested — the model is done.
          return { output: turn.text, steps, usage }
        }

        // Execute each requested tool and build the tool_result turn.
        const resultBlocks: ContentBlock[] = []
        const toolCalls: AgentToolCall[] = []
        for (const tu of turn.toolUses) {
          if (input.signal?.aborted) {
            throw new Error(
              t('ai-agents.error.aborted', undefined, {
                defaultValue: 'Agent run aborted before tool execution completed.',
              }),
            )
          }

          const tool = input.tools?.find((candidate) => candidate.name === tu.name)
          let result: unknown
          let isError = false
          if (!tool) {
            result = `Error: unknown tool "${tu.name}".`
            isError = true
          } else {
            try {
              result = await tool.execute(tu.input)
            } catch (error) {
              // The model can recover from a failed tool call; surface the error
              // back to it as a tool_result rather than aborting the whole run.
              result = `Error: ${error instanceof Error ? error.message : String(error)}`
              isError = true
            }
          }

          // `result` (above) is retained COMPLETE on the step record; only the
          // copy the model reads is bounded when `maxToolResultChars` is set.
          toolCalls.push({ id: tu.id, name: tu.name, input: tu.input, result, isError })
          resultBlocks.push({
            type: 'tool_result',
            tool_use_id: tu.id,
            content: boundToolResult(stringifyResult(result), toolResultLimit),
          })
        }

        messages.push({ role: 'user', content: resultBlocks })
        steps.push({ text: turn.text || undefined, toolCalls })
      }

      // Step budget exhausted while the model was still calling tools. With
      // `finalSynthesisOnBudgetExhaustion`, buy exactly ONE tool-free turn to
      // answer from what the run already saw — the loop ended on a tool
      // invocation, so there is no final assistant text to return otherwise.
      if (input.finalSynthesisOnBudgetExhaustion === true) {
        const finalTurn = await modelTurn(false)
        // Never pass the budget note off as an answer: a tool-free turn that
        // produced no text means the model gave no final response.
        if (!finalTurn.text.trim()) {
          throw new Error(
            t('ai-agents.error.finalSynthesisEmpty', undefined, {
              defaultValue:
                'Agent step budget exhausted and the final synthesis turn produced no answer.',
            }),
          )
        }
        return { output: finalTurn.text, steps, usage }
      }

      const output =
        lastText ||
        t('ai-agents.stepBudgetExhausted', undefined, {
          defaultValue: 'Agent stopped: step budget exhausted before a final answer.',
        })
      return { output, steps, usage }
    } catch (error) {
      throw new AgentRunError(
        error instanceof Error ? error.message : String(error),
        usage,
        steps,
        { cause: error },
      )
    }
  },
}
