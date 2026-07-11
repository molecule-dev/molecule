import { beforeEach, describe, expect, it } from 'vitest'

import type { AIProvider, AITool, ChatEvent, ChatParams } from '@molecule/api-ai'
import { setProvider as setAiProvider } from '@molecule/api-ai'
import { configure, reset } from '@molecule/api-bond'

import {
  getAllProviders,
  getProvider,
  getProviderByName,
  hasProvider,
  provider as agents,
  requireProvider,
  setProvider,
} from '../provider.js'
import type { AIAgentsProvider } from '../types.js'

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

const stubProvider = (name = 'mock'): AIAgentsProvider => ({
  name,
  run: async () => ({ output: '', steps: [], usage: { inputTokens: 0, outputTokens: 0 } }),
})

// ---------------------------------------------------------------------------
// Accessor (bond-registry) tests — mirrors the `ai` core accessor.
// ---------------------------------------------------------------------------

describe('ai-agents provider bond accessor', () => {
  beforeEach(() => {
    reset()
    configure({ strict: false, verbose: false })
  })

  it('returns null / false when nothing is bonded', () => {
    expect(getProvider()).toBeNull()
    expect(hasProvider()).toBe(false)
    expect(getAllProviders().size).toBe(0)
  })

  it('requireProvider throws when nothing is bonded', () => {
    expect(() => requireProvider()).toThrow(/AI agents provider not configured/)
  })

  it('setProvider (singleton) then getProvider returns the instance', () => {
    const p = stubProvider()
    setProvider(p)
    expect(getProvider()).toBe(p)
    expect(hasProvider()).toBe(true)
    expect(requireProvider()).toBe(p)
  })

  it('setProvider (named) registers and falls back to singleton', () => {
    const p = stubProvider('named')
    setProvider('named', p)
    expect(getProviderByName('named')).toBe(p)
    expect(getProvider()).toBe(p)
  })

  it('getProvider declines when multiple named providers are ambiguous', () => {
    setProvider('a', stubProvider('a'))
    bondSecondNamed()
    expect(getProviderByName('a')?.name).toBe('a')
    expect(getProviderByName('b')?.name).toBe('b')
    // Two named, singleton still resolves to the first (fallback set on first
    // named registration), so getProvider() is unambiguous here.
    expect(getProvider()?.name).toBe('a')
  })

  it('the default export is a usable provider named "default"', () => {
    expect(agents.name).toBe('default')
    expect(typeof agents.run).toBe('function')
  })

  function bondSecondNamed(): void {
    setProvider('b', stubProvider('b'))
  }
})

// ---------------------------------------------------------------------------
// Agentic loop tests
// ---------------------------------------------------------------------------

describe('ai-agents default provider run()', () => {
  beforeEach(() => {
    reset()
    configure({ strict: false, verbose: false })
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
