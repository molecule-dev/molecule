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

/** One drained chat stream: accumulated text, tool calls, and token usage. */
interface DrainedStream {
  text: string
  toolUses: Array<{ id: string; name: string; input: unknown }>
  usage: TokenUsage
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
  const toolUses: Array<{ id: string; name: string; input: unknown }> = []
  const usage: TokenUsage = { inputTokens: 0, outputTokens: 0 }

  for await (const event of stream) {
    onEvent?.(event)
    switch (event.type) {
      case 'text':
        text += event.content
        break
      case 'tool_use':
        toolUses.push({ id: event.id, name: event.name, input: event.input })
        break
      case 'done':
        addUsage(usage, event.usage)
        break
      default:
        break
    }
  }

  return { text, toolUses, usage }
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

    for (let step = 0; step < maxSteps; step++) {
      const turn = await drainStream(
        ai.chat({
          messages,
          system: input.system,
          tools: input.tools,
          model: input.model,
          temperature: input.temperature,
          stream: false,
          signal: input.signal,
        }),
        input.onEvent,
      )
      addUsage(usage, turn.usage)
      if (turn.text) lastText = turn.text

      // Append the assistant turn: a text block (if any) + one tool_use block
      // per requested tool call.
      const assistantContent: ContentBlock[] = []
      if (turn.text) assistantContent.push({ type: 'text', text: turn.text })
      for (const tu of turn.toolUses) {
        assistantContent.push({ type: 'tool_use', id: tu.id, name: tu.name, input: tu.input })
      }
      messages.push({ role: 'assistant', content: assistantContent })

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

        toolCalls.push({ id: tu.id, name: tu.name, input: tu.input, result, isError })
        resultBlocks.push({
          type: 'tool_result',
          tool_use_id: tu.id,
          content: stringifyResult(result),
        })
      }

      messages.push({ role: 'user', content: resultBlocks })
      steps.push({ text: turn.text || undefined, toolCalls })
    }

    // Step budget exhausted while the model was still calling tools.
    const output =
      lastText ||
      t('ai-agents.stepBudgetExhausted', undefined, {
        defaultValue: 'Agent stopped: step budget exhausted before a final answer.',
      })
    return { output, steps, usage }
  },
}
