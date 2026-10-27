import { beforeEach, describe, expect, it } from 'vitest'

import type { AIProvider, AITool, ChatEvent, ChatParams } from '@molecule/api-ai'
import { setProvider as setAiProvider } from '@molecule/api-ai'
import { configure, reset } from '@molecule/api-bond'

import { AgentRunError } from '../errors.js'
import { provider as agents } from '../provider.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Builds a fake AIProvider whose `chat()` yields a scripted set of events for
 * each successive call. Calls beyond the script length repeat the last entry,
 * so a single tool-calling script drives an unbounded loop.
 */
function scriptedAi(scripts: ChatEvent[][]): {
  provider: AIProvider
  calls: ChatParams[]
} {
  const calls: ChatParams[] = []
  let call = 0
  const provider: AIProvider = {
    name: 'fake',
    async *chat(params: ChatParams): AsyncIterable<ChatEvent> {
      // Snapshot the messages as the provider sees them at call time — `run()`
      // reuses and keeps appending to the same array across the loop, so
      // recording the live reference would show later turns' mutations.
      calls.push({ ...params, messages: [...params.messages] })
      const events = scripts[call] ?? scripts[scripts.length - 1]
      call += 1
      for (const event of events) {
        yield event
      }
    },
  }
  return { provider, calls }
}

const addTool: AITool = {
  name: 'add',
  description: 'Add two numbers',
  parameters: {
    type: 'object',
    properties: { a: { type: 'number' }, b: { type: 'number' } },
    required: ['a', 'b'],
  },
  execute: async (input) => {
    const { a, b } = input as { a: number; b: number }
    return a + b
  },
}

// ---------------------------------------------------------------------------
// Agentic loop tests
// ---------------------------------------------------------------------------

describe('ai-agents llm provider run()', () => {
  beforeEach(() => {
    reset()
    configure({ strict: false, verbose: false })
  })

  it('is a usable provider named "llm"', () => {
    expect(agents.name).toBe('llm')
    expect(typeof agents.run).toBe('function')
  })

  it('executes a tool, feeds the result back, and returns the final answer', async () => {
    const { provider: ai, calls } = scriptedAi([
      [
        { type: 'tool_use', id: 't1', name: 'add', input: { a: 1, b: 2 } },
        { type: 'done', usage: { inputTokens: 10, outputTokens: 5 } },
      ],
      [
        { type: 'text', content: 'The sum is 3' },
        { type: 'done', usage: { inputTokens: 20, outputTokens: 7 } },
      ],
    ])
    setAiProvider(ai)

    const result = await agents.run({ task: 'What is 1 + 2?', tools: [addTool] })

    // Final answer.
    expect(result.output).toBe('The sum is 3')

    // Step records the tool call with its executed result.
    expect(result.steps).toHaveLength(1)
    expect(result.steps[0].toolCalls).toHaveLength(1)
    expect(result.steps[0].toolCalls[0]).toMatchObject({
      id: 't1',
      name: 'add',
      input: { a: 1, b: 2 },
      result: 3,
    })
    expect(result.steps[0].toolCalls[0].isError).toBeFalsy()

    // Usage is summed across BOTH model calls.
    expect(result.usage).toEqual({ inputTokens: 30, outputTokens: 12 })

    // The tool result was fed back into the second model call.
    expect(calls).toHaveLength(2)
    const secondCallMessages = calls[1].messages
    expect(secondCallMessages).toHaveLength(3)
    const lastMessage = secondCallMessages[secondCallMessages.length - 1]
    expect(lastMessage.role).toBe('user')
    expect(lastMessage.content).toEqual([{ type: 'tool_result', tool_use_id: 't1', content: '3' }])
  })

  it('forwards every event to the onEvent hook', async () => {
    const { provider: ai } = scriptedAi([
      [
        { type: 'tool_use', id: 't1', name: 'add', input: { a: 1, b: 2 } },
        { type: 'done', usage: { inputTokens: 1, outputTokens: 1 } },
      ],
      [
        { type: 'text', content: 'ok' },
        { type: 'done', usage: { inputTokens: 1, outputTokens: 1 } },
      ],
    ])
    setAiProvider(ai)

    const seen: ChatEvent['type'][] = []
    await agents.run({ task: 'go', tools: [addTool], onEvent: (e) => seen.push(e.type) })
    expect(seen).toContain('tool_use')
    expect(seen).toContain('text')
    expect(seen.filter((t) => t === 'done')).toHaveLength(2)
  })

  it('throws when neither task nor messages is supplied', async () => {
    const { provider: ai } = scriptedAi([
      [
        { type: 'text', content: 'hi' },
        { type: 'done', usage: { inputTokens: 0, outputTokens: 0 } },
      ],
    ])
    setAiProvider(ai)
    await expect(agents.run({})).rejects.toThrow(/task.*or a non-empty `messages`/)
  })

  it('records an unknown tool call as an error without throwing the run', async () => {
    const { provider: ai } = scriptedAi([
      [
        { type: 'tool_use', id: 'x1', name: 'nonexistent', input: {} },
        { type: 'done', usage: { inputTokens: 3, outputTokens: 1 } },
      ],
      [
        { type: 'text', content: 'recovered' },
        { type: 'done', usage: { inputTokens: 2, outputTokens: 1 } },
      ],
    ])
    setAiProvider(ai)

    const result = await agents.run({ task: 'go', tools: [addTool] })
    expect(result.output).toBe('recovered')
    expect(result.steps).toHaveLength(1)
    const call = result.steps[0].toolCalls[0]
    expect(call.name).toBe('nonexistent')
    expect(call.isError).toBe(true)
    expect(String(call.result)).toMatch(/unknown tool/)
  })

  it('surfaces a thrown tool error as an error tool_result', async () => {
    const throwingTool: AITool = {
      name: 'boom',
      description: 'always throws',
      parameters: { type: 'object' },
      execute: async () => {
        throw new Error('kaboom')
      },
    }
    const { provider: ai } = scriptedAi([
      [
        { type: 'tool_use', id: 'b1', name: 'boom', input: {} },
        { type: 'done', usage: { inputTokens: 1, outputTokens: 1 } },
      ],
      [
        { type: 'text', content: 'done' },
        { type: 'done', usage: { inputTokens: 1, outputTokens: 1 } },
      ],
    ])
    setAiProvider(ai)

    const result = await agents.run({ task: 'go', tools: [throwingTool] })
    const call = result.steps[0].toolCalls[0]
    expect(call.isError).toBe(true)
    expect(String(call.result)).toMatch(/kaboom/)
  })

  it('caps the loop at maxSteps when the model keeps calling tools', async () => {
    const { provider: ai, calls } = scriptedAi([
      [
        { type: 'tool_use', id: 'loop', name: 'add', input: { a: 1, b: 1 } },
        { type: 'done', usage: { inputTokens: 4, outputTokens: 2 } },
      ],
    ])
    setAiProvider(ai)

    const result = await agents.run({ task: 'never stops', tools: [addTool], maxSteps: 2 })

    // Exactly maxSteps model calls, each recorded as a step.
    expect(calls).toHaveLength(2)
    expect(result.steps).toHaveLength(2)
    // No final text was produced → the budget-exhausted note is returned.
    expect(result.output).toMatch(/step budget exhausted/)
    // Usage summed across both capped calls.
    expect(result.usage).toEqual({ inputTokens: 8, outputTokens: 4 })
  })

  it('carries cache token fields into the summed usage', async () => {
    const { provider: ai } = scriptedAi([
      [
        {
          type: 'done',
          usage: {
            inputTokens: 5,
            outputTokens: 2,
            cacheReadInputTokens: 100,
            cacheCreationInputTokens: 10,
          },
        },
        { type: 'text', content: 'immediate' },
      ],
    ])
    // The model returns text with no tool calls on the first turn → done.
    setAiProvider(ai)
    const result = await agents.run({ task: 'hi' })
    expect(result.output).toBe('immediate')
    expect(result.usage).toEqual({
      inputTokens: 5,
      outputTokens: 2,
      cacheReadInputTokens: 100,
      cacheCreationInputTokens: 10,
    })
  })

  it('seeds from a full messages history when no task is given', async () => {
    const { provider: ai, calls } = scriptedAi([
      [
        { type: 'text', content: 'answer' },
        { type: 'done', usage: { inputTokens: 1, outputTokens: 1 } },
      ],
    ])
    setAiProvider(ai)
    const result = await agents.run({
      messages: [{ role: 'user', content: 'seeded question' }],
    })
    expect(result.output).toBe('answer')
    expect(calls[0].messages[0]).toEqual({ role: 'user', content: 'seeded question' })
  })

  it('resolves a named AI provider when input.provider is set', async () => {
    const { provider: ai, calls } = scriptedAi([
      [
        { type: 'text', content: 'named' },
        { type: 'done', usage: { inputTokens: 1, outputTokens: 1 } },
      ],
    ])
    setAiProvider('anthropic', ai)
    const result = await agents.run({ task: 'hi', provider: 'anthropic' })
    expect(result.output).toBe('named')
    expect(calls).toHaveLength(1)
  })
})

// ---------------------------------------------------------------------------
// Opt-in budget options (maxToolResultChars / finalSynthesisOnBudgetExhaustion)
// ---------------------------------------------------------------------------

const bigPayload = 'x'.repeat(500)

const echoTool: AITool = {
  name: 'echo',
  description: 'Return a large payload',
  parameters: { type: 'object' },
  execute: async () => bigPayload,
}

/** The content string of the tool_result block in the last message of a call. */
function toolResultContent(params: ChatParams): string {
  const last = params.messages[params.messages.length - 1]
  const blocks = typeof last.content === 'string' ? [] : last.content
  for (const block of blocks) {
    if (block.type === 'tool_result') return String(block.content)
  }
  throw new Error('no tool_result block in the last message')
}

/** Awaits a run that must reject with the provider's typed partial-run error. */
async function agentFailure(run: Promise<unknown>): Promise<AgentRunError> {
  try {
    await run
  } catch (error) {
    if (error instanceof AgentRunError) return error
    throw error
  }
  throw new Error('expected the agent run to reject')
}

describe('ai-agents llm provider opt-in budget options', () => {
  beforeEach(() => {
    reset()
    configure({ strict: false, verbose: false })
  })

  it('sends the complete tool result when maxToolResultChars is not set', async () => {
    const { provider: ai, calls } = scriptedAi([
      [
        { type: 'tool_use', id: 'e1', name: 'echo', input: {} },
        { type: 'done', usage: { inputTokens: 1, outputTokens: 1 } },
      ],
      [
        { type: 'text', content: 'ok' },
        { type: 'done', usage: { inputTokens: 1, outputTokens: 1 } },
      ],
    ])
    setAiProvider(ai)

    const result = await agents.run({ task: 'go', tools: [echoTool] })

    // Default behavior is unchanged: the whole result is model-facing.
    expect(toolResultContent(calls[1])).toBe(bigPayload)
    expect(result.steps[0].toolCalls[0].result).toBe(bigPayload)
  })

  it('bounds the model-facing tool result and keeps the step result complete', async () => {
    const { provider: ai, calls } = scriptedAi([
      [
        { type: 'tool_use', id: 'e1', name: 'echo', input: {} },
        { type: 'done', usage: { inputTokens: 1, outputTokens: 1 } },
      ],
      [
        { type: 'text', content: 'ok' },
        { type: 'done', usage: { inputTokens: 1, outputTokens: 1 } },
      ],
    ])
    setAiProvider(ai)

    const result = await agents.run({ task: 'go', tools: [echoTool], maxToolResultChars: 100 })

    const content = toolResultContent(calls[1])
    expect(content.startsWith(bigPayload.slice(0, 100))).toBe(true)
    // An explicit, actionable truncation note — not a silent cut.
    expect(content).toContain('[Truncated: 100 of 500 characters shown')
    expect(content).toContain('narrower range')
    // The bytes beyond the budget never reach the model.
    expect(content).not.toContain(bigPayload.slice(100))
    // …but the retained step result is still the complete value.
    expect(result.steps[0].toolCalls[0].result).toBe(bigPayload)
  })

  it('leaves a tool result at or under the budget untouched', async () => {
    const smallTool: AITool = {
      name: 'add',
      description: 'Add two numbers',
      parameters: { type: 'object' },
      execute: async () => 3,
    }
    const { provider: ai, calls } = scriptedAi([
      [
        { type: 'tool_use', id: 'a1', name: 'add', input: {} },
        { type: 'done', usage: { inputTokens: 1, outputTokens: 1 } },
      ],
      [
        { type: 'text', content: 'ok' },
        { type: 'done', usage: { inputTokens: 1, outputTokens: 1 } },
      ],
    ])
    setAiProvider(ai)

    await agents.run({ task: 'go', tools: [smallTool], maxToolResultChars: 10 })

    expect(toolResultContent(calls[1])).toBe('3')
    expect(toolResultContent(calls[1])).not.toContain('Truncated')
  })

  it('never splits a surrogate pair when cutting', async () => {
    const emojiPayload = `${'a'.repeat(4)}😀b` // 7 UTF-16 code units
    const emojiTool: AITool = {
      name: 'emoji',
      description: 'Return multi-byte text',
      parameters: { type: 'object' },
      execute: async () => emojiPayload,
    }
    const { provider: ai, calls } = scriptedAi([
      [
        { type: 'tool_use', id: 's1', name: 'emoji', input: {} },
        { type: 'done', usage: { inputTokens: 1, outputTokens: 1 } },
      ],
      [
        { type: 'text', content: 'ok' },
        { type: 'done', usage: { inputTokens: 1, outputTokens: 1 } },
      ],
    ])
    setAiProvider(ai)

    // A 5-unit cut would keep half of the surrogate pair at index 4.
    await agents.run({ task: 'go', tools: [emojiTool], maxToolResultChars: 5 })

    const content = toolResultContent(calls[1])
    expect(content.startsWith('aaaa\n\n[Truncated: 4 of 7 characters shown')).toBe(true)
  })

  it('rejects a non-positive or non-finite maxToolResultChars before calling the model', async () => {
    const { provider: ai, calls } = scriptedAi([
      [
        { type: 'text', content: 'ok' },
        { type: 'done', usage: { inputTokens: 1, outputTokens: 1 } },
      ],
    ])
    setAiProvider(ai)

    // 0.5 floors to 0 characters, which cannot bound a result meaningfully.
    for (const bad of [0, 0.5, -5, Number.NaN, Number.POSITIVE_INFINITY]) {
      await expect(agents.run({ task: 'go', maxToolResultChars: bad })).rejects.toThrow(
        /maxToolResultChars.*at least 1 character/,
      )
    }
    expect(calls).toHaveLength(0)
  })

  it('keeps the budget note and makes no extra call when finalSynthesisOnBudgetExhaustion is unset', async () => {
    const { provider: ai, calls } = scriptedAi([
      [
        { type: 'tool_use', id: 'loop', name: 'add', input: { a: 1, b: 1 } },
        { type: 'done', usage: { inputTokens: 4, outputTokens: 2 } },
      ],
    ])
    setAiProvider(ai)

    const result = await agents.run({ task: 'never stops', tools: [addTool], maxSteps: 1 })

    expect(calls).toHaveLength(1)
    expect(result.output).toMatch(/step budget exhausted/)
    expect(result.usage).toEqual({ inputTokens: 4, outputTokens: 2 })
  })

  it('spends exactly one tool-free synthesis turn after the budget is exhausted', async () => {
    const { provider: ai, calls } = scriptedAi([
      [
        { type: 'thinking', content: 'consider the sum' },
        { type: 'tool_use', id: 't1', name: 'add', input: { a: 1, b: 2 } },
        { type: 'done', usage: { inputTokens: 10, outputTokens: 5 } },
      ],
      [
        { type: 'text', content: 'FINAL REPORT' },
        { type: 'done', usage: { inputTokens: 20, outputTokens: 7 } },
      ],
    ])
    setAiProvider(ai)

    const result = await agents.run({
      task: 'write the report',
      system: 'be brief',
      tools: [addTool],
      maxSteps: 1,
      model: 'test-model',
      maxTokens: 512,
      temperature: 0.2,
      thinking: { type: 'enabled', budgetTokens: 1000 },
      cacheControl: { type: 'ephemeral' },
      finalSynthesisOnBudgetExhaustion: true,
    })

    // Exactly one extra model call, and it offers NO tools…
    expect(calls).toHaveLength(2)
    expect('tools' in calls[1]).toBe(false)
    // …while every other setting and the whole history carry over.
    expect(calls[1].model).toBe('test-model')
    expect(calls[1].maxTokens).toBe(512)
    expect(calls[1].temperature).toBe(0.2)
    expect(calls[1].system).toBe('be brief')
    expect(calls[1].thinking).toEqual({ type: 'enabled', budgetTokens: 1000 })
    expect(calls[1].cacheControl).toEqual({ type: 'ephemeral' })
    expect(calls[1].stream).toBe(true)
    expect(calls[1].messages).toHaveLength(3)
    expect(calls[1].messages[1].reasoning).toBe('consider the sum')
    expect(toolResultContent(calls[1])).toBe('3')

    // The synthesis text is the output; the tool round stays the only step.
    expect(result.output).toBe('FINAL REPORT')
    expect(result.steps).toHaveLength(1)
    // Metering covers both billed turns.
    expect(result.usage).toEqual({ inputTokens: 30, outputTokens: 12 })
  })

  it('forwards synthesis events to the onEvent hook', async () => {
    const { provider: ai } = scriptedAi([
      [
        { type: 'tool_use', id: 't1', name: 'add', input: { a: 1, b: 1 } },
        { type: 'done', usage: { inputTokens: 1, outputTokens: 1 } },
      ],
      [
        { type: 'text', content: 'final' },
        { type: 'done', usage: { inputTokens: 1, outputTokens: 1 } },
      ],
    ])
    setAiProvider(ai)

    const seen: ChatEvent['type'][] = []
    const result = await agents.run({
      task: 'go',
      tools: [addTool],
      maxSteps: 1,
      finalSynthesisOnBudgetExhaustion: true,
      onEvent: (event) => seen.push(event.type),
    })

    expect(result.output).toBe('final')
    expect(seen.filter((type) => type === 'done')).toHaveLength(2)
    expect(seen).toContain('text')
  })

  it('ignores a tool request on the synthesis turn and never extends the loop', async () => {
    let executions = 0
    const countingTool: AITool = {
      name: 'add',
      description: 'Add two numbers',
      parameters: { type: 'object' },
      execute: async () => {
        executions += 1
        return 3
      },
    }
    const { provider: ai, calls } = scriptedAi([
      [
        { type: 'tool_use', id: 't1', name: 'add', input: { a: 1, b: 2 } },
        { type: 'done', usage: { inputTokens: 1, outputTokens: 1 } },
      ],
      [
        { type: 'tool_use', id: 'rogue', name: 'add', input: { a: 1, b: 1 } },
        { type: 'text', content: 'answer' },
        { type: 'done', usage: { inputTokens: 1, outputTokens: 1 } },
      ],
    ])
    setAiProvider(ai)

    const result = await agents.run({
      task: 'go',
      tools: [countingTool],
      maxSteps: 1,
      finalSynthesisOnBudgetExhaustion: true,
    })

    expect(calls).toHaveLength(2)
    expect(executions).toBe(1)
    expect(result.output).toBe('answer')
    expect(result.steps).toHaveLength(1)
  })

  it('rejects honestly when the synthesis produces no answer', async () => {
    const { provider: ai } = scriptedAi([
      [
        { type: 'tool_use', id: 't1', name: 'add', input: { a: 1, b: 1 } },
        { type: 'done', usage: { inputTokens: 4, outputTokens: 2 } },
      ],
      [
        { type: 'text', content: '   ' },
        { type: 'done', usage: { inputTokens: 3, outputTokens: 1 } },
      ],
    ])
    setAiProvider(ai)

    const failure = await agentFailure(
      agents.run({
        task: 'go',
        tools: [addTool],
        maxSteps: 1,
        finalSynthesisOnBudgetExhaustion: true,
      }),
    )

    expect(failure).toBeInstanceOf(AgentRunError)
    expect(failure.message).toMatch(/final synthesis turn produced no answer/)
    // Partial metering and steps survive the failure.
    expect(failure.usage).toEqual({ inputTokens: 7, outputTokens: 3 })
    expect(failure.steps).toHaveLength(1)
  })

  it('rejects when the synthesis turn hits a provider error, keeping its booked usage', async () => {
    const { provider: ai } = scriptedAi([
      [
        { type: 'tool_use', id: 't1', name: 'add', input: { a: 1, b: 1 } },
        { type: 'done', usage: { inputTokens: 4, outputTokens: 2 } },
      ],
      [
        { type: 'usage', usage: { inputTokens: 9, outputTokens: 1 } },
        { type: 'error', message: 'overloaded' },
      ],
    ])
    setAiProvider(ai)

    const failure = await agentFailure(
      agents.run({
        task: 'go',
        tools: [addTool],
        maxSteps: 1,
        finalSynthesisOnBudgetExhaustion: true,
      }),
    )

    expect(failure).toBeInstanceOf(AgentRunError)
    expect(failure.message).toMatch(/AI provider error during agent run: overloaded/)
    // The cut stream's usage snapshot is still booked (metering contract).
    expect(failure.usage).toEqual({ inputTokens: 13, outputTokens: 3 })
    expect(failure.steps).toHaveLength(1)
  })

  it('carries partial usage when the synthesis turn is aborted', async () => {
    let call = 0
    const ai: AIProvider = {
      name: 'aborting',
      async *chat(): AsyncIterable<ChatEvent> {
        call += 1
        if (call === 1) {
          yield { type: 'tool_use', id: 't1', name: 'add', input: { a: 1, b: 1 } }
          yield { type: 'done', usage: { inputTokens: 4, outputTokens: 2 } }
          return
        }
        throw new Error('aborted by caller')
      },
    }
    setAiProvider(ai)

    const failure = await agentFailure(
      agents.run({
        task: 'go',
        tools: [addTool],
        maxSteps: 1,
        finalSynthesisOnBudgetExhaustion: true,
        signal: new AbortController().signal,
      }),
    )

    expect(failure).toBeInstanceOf(AgentRunError)
    expect(failure.message).toBe('aborted by caller')
    expect(failure.usage).toEqual({ inputTokens: 4, outputTokens: 2 })
    expect(failure.steps).toHaveLength(1)
  })
})
