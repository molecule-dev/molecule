/**
 * REAL-DEPENDENCY integration tests — no mocks of the wrapped dependencies.
 *
 * This bond wraps the real `@molecule/api-bond` registry and the
 * `@molecule/api-ai` accessor: both are exercised here unmocked, end-to-end
 * (`setProvider` → registry → `requireProvider().run()`), with a deterministic
 * in-process `AIProvider` implementation driving the model side — the same
 * seam every production app swaps at (`bond('ai', provider)`), so nothing the
 * loop depends on is stubbed. What this pins that the unit suite cannot:
 *
 * - CONSUMER EXPERIENCE: a realistic multi-step agent flow — parallel tool
 *   calls in one turn, a mid-run tool failure the model recovers from — works
 *   within the DEFAULT step budget, and tool results are fed back in the exact
 *   shape (ONE user message carrying every tool_result of the turn) that real
 *   provider APIs require.
 * - FAILURE DISAMBIGUATION: every AI bond surfaces API failures (401/429/529,
 *   network) as an in-band `error` ChatEvent + graceful return — NOT a throw.
 *   The loop used to swallow that event and resolve with a successful-looking
 *   empty output, which is indistinguishable from "the model answered
 *   nothing". These tests pin: API error ⇒ REJECTION carrying the provider's
 *   message; genuinely-empty answer ⇒ RESOLUTION with `output: ''`.
 *
 * @module
 */

import type { AIProvider, AITool, ChatEvent, ChatParams, ContentBlock } from '@molecule/api-ai'
import { setProvider as setAiProvider } from '@molecule/api-ai'
import { requireProvider, setProvider as setAgentsProvider } from '@molecule/api-ai-agents'
import { configure, reset } from '@molecule/api-bond'
import { beforeEach, describe, expect, it } from 'vitest'

import { AgentRunError } from '../errors.js'
import { provider as agents } from '../provider.js'

/**
 * Builds a deterministic in-process AIProvider whose `chat()` yields a
 * scripted set of events per successive call, recording the params (with the
 * messages snapshotted at call time) each call received.
 */
function scriptedAi(scripts: ChatEvent[][]): { provider: AIProvider; calls: ChatParams[] } {
  const calls: ChatParams[] = []
  let call = 0
  const provider: AIProvider = {
    name: 'scripted',
    async *chat(params: ChatParams): AsyncIterable<ChatEvent> {
      calls.push({ ...params, messages: [...params.messages] })
      const events = scripts[call] ?? scripts[scripts.length - 1]
      call += 1
      for (const event of events) yield event
    },
  }
  return { provider, calls }
}

const lookupTool: AITool = {
  name: 'lookup',
  description: 'Look up a value by key',
  parameters: { type: 'object', properties: { key: { type: 'string' } }, required: ['key'] },
  execute: async (input) => {
    const { key } = input as { key: string }
    if (key === 'missing') throw new Error(`no such key: ${key}`)
    return { key, value: `${key}-value` }
  },
}

describe('@molecule/api-ai-agents-llm × REAL api-bond + api-ai wiring', () => {
  beforeEach(() => {
    reset()
    configure({ strict: false, verbose: false })
  })

  it('CONSUMER PROPERTY: a realistic 3-turn run (parallel tools + a recovered tool failure) completes within the DEFAULT budget, feeding results back the way real APIs require', async () => {
    const { provider: ai, calls } = scriptedAi([
      // Turn 1: the model calls TWO tools in parallel — one will throw.
      [
        { type: 'text', content: 'Looking both up.' },
        { type: 'tool_use', id: 'tu1', name: 'lookup', input: { key: 'alpha' } },
        { type: 'tool_use', id: 'tu2', name: 'lookup', input: { key: 'missing' } },
        { type: 'done', usage: { inputTokens: 100, outputTokens: 20 } },
      ],
      // Turn 2: recovers from the failed call with a follow-up tool call.
      [
        { type: 'tool_use', id: 'tu3', name: 'lookup', input: { key: 'beta' } },
        { type: 'done', usage: { inputTokens: 150, outputTokens: 10 } },
      ],
      // Turn 3: final answer.
      [
        { type: 'text', content: 'alpha-value and beta-value' },
        { type: 'done', usage: { inputTokens: 200, outputTokens: 15 } },
      ],
    ])
    // The REAL registry + accessor chain, exactly as an app wires it.
    setAiProvider(ai)
    setAgentsProvider(agents)

    const result = await requireProvider().run({
      task: 'look things up',
      tools: [lookupTool],
      // Must reach the provider: the 4096-token provider default truncates
      // file-sized tool inputs mid-JSON (which then parses as an empty {}).
      maxTokens: 32000,
    })

    // The run finished with the DEFAULT maxSteps (no override needed for a
    // normal multi-step flow) and produced the final answer.
    expect(result.output).toBe('alpha-value and beta-value')
    expect(result.steps).toHaveLength(2)

    // Parallel tool calls: BOTH executed; the thrown one is labeled, not fatal.
    const [ok, failed] = result.steps[0].toolCalls
    expect(ok).toMatchObject({
      id: 'tu1',
      name: 'lookup',
      result: { key: 'alpha', value: 'alpha-value' },
    })
    expect(ok.isError).toBeFalsy()
    expect(failed.isError).toBe(true)
    expect(String(failed.result)).toMatch(/no such key: missing/)

    // Wire shape: the turn-2 request must carry an assistant turn with BOTH
    // tool_use blocks followed by ONE user message containing BOTH
    // tool_result blocks (splitting them breaks real provider APIs).
    expect(calls).toHaveLength(3)
    const turn2Messages = calls[1].messages
    const assistantTurn = turn2Messages[turn2Messages.length - 2]
    const resultsTurn = turn2Messages[turn2Messages.length - 1]
    expect(assistantTurn.role).toBe('assistant')
    const assistantBlocks = assistantTurn.content as ContentBlock[]
    expect(assistantBlocks.filter((b) => b.type === 'tool_use')).toHaveLength(2)
    expect(resultsTurn.role).toBe('user')
    const resultBlocks = resultsTurn.content as ContentBlock[]
    expect(resultBlocks.map((b) => b.type)).toEqual(['tool_result', 'tool_result'])
    expect(resultBlocks.map((b) => (b as { tool_use_id: string }).tool_use_id)).toEqual([
      'tu1',
      'tu2',
    ])

    // Usage summed across ALL THREE model calls — nothing dropped.
    expect(result.usage).toEqual({ inputTokens: 450, outputTokens: 45 })

    // maxTokens reached the provider on every turn.
    expect(calls.map((c) => c.maxTokens)).toEqual([32000, 32000, 32000])
  })

  it('FAILURE DISAMBIGUATION: a provider API error (in-band `error` event) REJECTS with the provider message — never a silent empty success', async () => {
    // This is byte-for-byte what every ai bond does on a 429/529: one sanitized
    // error event, then a graceful return. No `done`, no throw.
    const { provider: ai } = scriptedAi([
      [
        {
          type: 'error',
          message: 'AI rate limit exceeded. Please try again shortly.',
          errorKey: 'ai.error.apiError',
        },
      ],
    ])
    setAiProvider(ai)

    await expect(agents.run({ task: 'anything' })).rejects.toThrow(
      /AI provider error during agent run: AI rate limit exceeded/,
    )
  })

  it('FAILURE DISAMBIGUATION: a genuinely empty model answer RESOLVES with output "" (distinguishable from an API failure)', async () => {
    const { provider: ai } = scriptedAi([
      [{ type: 'done', usage: { inputTokens: 5, outputTokens: 0 } }],
    ])
    setAiProvider(ai)

    const result = await agents.run({ task: 'say nothing' })
    expect(result.output).toBe('')
    expect(result.steps).toHaveLength(0)
    expect(result.usage).toEqual({ inputTokens: 5, outputTokens: 0 })
  })

  it('FAILURE DISAMBIGUATION: an API error mid-run still rejects (after tools already executed)', async () => {
    const { provider: ai } = scriptedAi([
      [
        { type: 'tool_use', id: 't1', name: 'lookup', input: { key: 'alpha' } },
        { type: 'done', usage: { inputTokens: 10, outputTokens: 5 } },
      ],
      [
        {
          type: 'error',
          message: 'AI service is temporarily overloaded. Please try again in a moment.',
        },
      ],
    ])
    setAiProvider(ai)

    await expect(agents.run({ task: 'go', tools: [lookupTool] })).rejects.toThrow(
      /temporarily overloaded/,
    )
  })

  it('PARTIAL METERING: a mid-run provider failure rejects with an AgentRunError carrying turn-1 usage + steps, not a plain Error that drops them', async () => {
    const { provider: ai } = scriptedAi([
      [
        { type: 'tool_use', id: 't1', name: 'lookup', input: { key: 'alpha' } },
        { type: 'done', usage: { inputTokens: 10, outputTokens: 5 } },
      ],
      [
        {
          type: 'error',
          message: 'AI service is temporarily overloaded. Please try again in a moment.',
        },
      ],
    ])
    setAiProvider(ai)

    let caught: unknown
    try {
      await agents.run({ task: 'go', tools: [lookupTool] })
    } catch (error) {
      caught = error
    }

    // Pre-fix this was a plain Error with no `usage`/`steps` — the turn-1
    // spend (already billed by the real provider) was silently unrecoverable.
    expect(caught).toBeInstanceOf(AgentRunError)
    const runError = caught as AgentRunError
    expect(runError.message).toMatch(/temporarily overloaded/)
    // Turn 1 completed (tool call + its usage) before turn 2 failed — that
    // must survive on the thrown error, not vanish with the rejection.
    expect(runError.usage).toEqual({ inputTokens: 10, outputTokens: 5 })
    expect(runError.steps).toHaveLength(1)
    expect(runError.steps[0].toolCalls[0]).toMatchObject({ id: 't1', name: 'lookup' })
  })

  it('rejects when BOTH task and messages are supplied instead of silently discarding the task', async () => {
    const { provider: ai, calls } = scriptedAi([
      [
        { type: 'text', content: 'never reached' },
        { type: 'done', usage: { inputTokens: 1, outputTokens: 1 } },
      ],
    ])
    setAiProvider(ai)

    await expect(
      agents.run({ task: 'do X', messages: [{ role: 'user', content: 'do Y' }] }),
    ).rejects.toThrow(/either `task` or `messages`, not both/)
    // The model was never called — the contract violation failed fast.
    expect(calls).toHaveLength(0)
  })

  it('METERING: a stream cut without `done` still books the last usage snapshot', async () => {
    // message_start-style snapshot arrives, then the upstream dies without a
    // terminal `done`. The billed input tokens must not vanish from the sum.
    const { provider: ai } = scriptedAi([
      [
        {
          type: 'usage',
          usage: { inputTokens: 4000, outputTokens: 0, cacheReadInputTokens: 3000 },
        },
        { type: 'text', content: 'partial answer' },
      ],
    ])
    setAiProvider(ai)

    const result = await agents.run({ task: 'hi' })
    expect(result.output).toBe('partial answer')
    expect(result.usage).toEqual({
      inputTokens: 4000,
      outputTokens: 0,
      cacheReadInputTokens: 3000,
    })
  })

  it('an aborted signal stops the run before tool execution with an explicit abort rejection', async () => {
    const { provider: ai } = scriptedAi([
      [
        { type: 'tool_use', id: 't1', name: 'lookup', input: { key: 'alpha' } },
        { type: 'done', usage: { inputTokens: 1, outputTokens: 1 } },
      ],
    ])
    setAiProvider(ai)

    const controller = new AbortController()
    controller.abort()
    let caught: unknown
    try {
      await agents.run({ task: 'go', tools: [lookupTool], signal: controller.signal })
    } catch (error) {
      caught = error
    }
    expect((caught as Error).message).toMatch(/aborted/)
    // PARTIAL METERING: the turn that produced the tool_use already billed
    // its usage before the abort was noticed — it must survive on the error.
    expect(caught).toBeInstanceOf(AgentRunError)
    expect((caught as AgentRunError).usage).toEqual({ inputTokens: 1, outputTokens: 1 })
  })

  it('CACHE + STREAM PASSTHROUGH: cacheControl reaches every turn and stream defaults true (not the old hardcoded false)', async () => {
    const { provider: ai, calls } = scriptedAi([
      [
        { type: 'text', content: 'answer' },
        { type: 'done', usage: { inputTokens: 1, outputTokens: 1 } },
      ],
    ])
    setAiProvider(ai)

    await agents.run({ task: 'hi', cacheControl: { type: 'ephemeral' } })

    expect(calls).toHaveLength(1)
    expect(calls[0].cacheControl).toEqual({ type: 'ephemeral' })
    // Regression: the loop used to hardcode `stream: false` on every turn,
    // which defeats `onEvent` as a live hook and risks HTTP timeouts on large
    // non-streamed tool-input turns.
    expect(calls[0].stream).toBe(true)
  })

  it('CACHE + STREAM PASSTHROUGH: input.stream === false is still honored (opt out of the new default)', async () => {
    const { provider: ai, calls } = scriptedAi([
      [
        { type: 'text', content: 'answer' },
        { type: 'done', usage: { inputTokens: 1, outputTokens: 1 } },
      ],
    ])
    setAiProvider(ai)

    await agents.run({ task: 'hi', stream: false })

    expect(calls[0].stream).toBe(false)
  })
})
