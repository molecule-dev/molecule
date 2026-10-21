/**
 * The thinking / reasoning-replay WIRE SEAM of the native DeepSeek bond.
 *
 * DeepSeek's thinking-mode guide (https://api-docs.deepseek.com/guides/thinking_mode/)
 * requires every retained assistant turn's `reasoning_content` to be sent back
 * on a later request that carries `tools` — including a turn where the model
 * made no tool call — and 400s a request that omits one.
 * `ChatMessage.reasoning` is the generic slot Synthase fills from its persisted
 * `thinking` blocks. These cases pin what this bond actually puts on the wire:
 *
 * - `thinking` enabled/disabled and the native `reasoning_effort` value;
 * - the forced-tool-choice relaxation thinking mode requires;
 * - replaying `ChatMessage.reasoning` as `reasoning_content` on every retained
 *   assistant turn while thinking is on (tool-call and plain), the explicit
 *   empty string for a retained turn that recorded none (mixed mode), and the
 *   unchanged non-thinking wire (the experiment behind
 *   `x1-native-thinking-replay-repaired-v1`,
 *   `.experiments/x0/live/main-thinking-replay-repair.findings.md`).
 */

vi.mock('@molecule/api-i18n', () => ({
  t: vi.fn((_key: string, _values?: unknown, options?: { defaultValue?: string }) => {
    return options?.defaultValue ?? _key
  }),
}))

vi.mock('@molecule/api-bond', () => ({
  getLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}))

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { ChatEvent, ChatMessage, ChatParams } from '@molecule/api-ai'

import { createProvider } from '../provider.js'

const ECHO_TOOL = {
  name: 'echo',
  description: 'Return the text it was given.',
  parameters: {
    type: 'object',
    properties: { text: { type: 'string' } },
    required: ['text'],
  },
}

/** Build an SSE response from already-serialized `data:` payloads. */
function sseResponse(chunks: unknown[]): Response {
  const encoder = new TextEncoder()
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`))
      }
      controller.enqueue(encoder.encode('data: [DONE]\n\n'))
      controller.close()
    },
  })
  return new Response(body, {
    status: 200,
    headers: { 'content-type': 'text/event-stream' },
  })
}

/** A completed assistant tool call, as the native stream reports one. */
const TOOL_CALL_CHUNKS = [
  {
    id: 'fake-1',
    model: 'deepseek-flash',
    choices: [{ index: 0, delta: { reasoning_content: 'internal plan' } }],
  },
  {
    choices: [
      {
        index: 0,
        delta: {
          tool_calls: [
            {
              index: 0,
              id: 'call_1',
              type: 'function',
              function: { name: 'echo', arguments: '{"text":"ping"}' },
            },
          ],
        },
      },
    ],
  },
  { choices: [{ index: 0, delta: {}, finish_reason: 'tool_calls' }] },
  { usage: { prompt_tokens: 12, completion_tokens: 7 } },
]

/**
 * Run one request through the real bond and return the parsed outbound body
 * plus the events the bond yielded. `fetch` is the fake transport.
 */
async function capture(
  params: ChatParams,
  chunks: unknown[] = TOOL_CALL_CHUNKS,
): Promise<{ body: Record<string, unknown>; events: ChatEvent[] }> {
  const fetch = globalThis.fetch as ReturnType<typeof vi.fn>
  fetch.mockResolvedValue(sseResponse(chunks))
  const events: ChatEvent[] = []
  for await (const event of createProvider({ apiKey: 'k', baseUrl: 'https://ds.test' }).chat(
    params,
  )) {
    events.push(event)
  }
  const init = fetch.mock.calls.at(-1)?.[1] as RequestInit
  return { body: JSON.parse(init.body as string), events }
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn())
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('thinking block wire shape', () => {
  it('enables thinking and sends the caller-resolved native effort', async () => {
    const { body } = await capture({
      messages: [{ role: 'user', content: 'hi' }],
      tools: [ECHO_TOOL],
      thinking: { type: 'enabled', budgetTokens: 8_000, effort: 'high' },
      temperature: 0.2,
    })
    expect(body.thinking).toEqual({ type: 'enabled' })
    expect(body.reasoning_effort).toBe('high')
    // Thinking mode ignores temperature upstream; the bond does not send it.
    expect('temperature' in body).toBe(false)
  })

  it('disables thinking explicitly when the caller sends no thinking block', async () => {
    const { body } = await capture({
      messages: [{ role: 'user', content: 'hi' }],
      temperature: 0.2,
    })
    expect(body.thinking).toEqual({ type: 'disabled' })
    expect(body.temperature).toBe(0.2)
  })

  it('relaxes a forced tool choice while thinking is enabled (DeepSeek 400s the pair)', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { body } = await capture({
      messages: [{ role: 'user', content: 'hi' }],
      tools: [ECHO_TOOL],
      toolChoice: 'required',
      thinking: { type: 'enabled', budgetTokens: 8_000, effort: 'high' },
    })
    expect('tool_choice' in body).toBe(false)
    expect(warn).toHaveBeenCalled()
  })

  it('keeps a forced tool choice when thinking is off', async () => {
    const { body } = await capture({
      messages: [{ role: 'user', content: 'hi' }],
      tools: [ECHO_TOOL],
      toolChoice: 'required',
    })
    expect(body.tool_choice).toBe('required')
  })
})

describe('reasoning replay seam (ChatMessage.reasoning → reasoning_content)', () => {
  const THINKING = { type: 'enabled' as const, budgetTokens: 8_000, effort: 'high' }

  /** The assistant messages of an outbound body, in order. */
  const assistants = (body: Record<string, unknown>) =>
    (body.messages as Array<Record<string, unknown>>).filter((m) => m.role === 'assistant')

  it('replays reasoning on an assistant tool-call turn while thinking is on', async () => {
    const { body } = await capture({
      messages: [
        { role: 'user', content: 'call the tool' },
        {
          role: 'assistant',
          content: [{ type: 'tool_use', id: 'call_1', name: 'echo', input: { text: 'ping' } }],
          reasoning: 'private chain of thought',
        } as ChatMessage,
        { role: 'user', content: [{ type: 'tool_result', tool_use_id: 'call_1', content: 'ok' }] },
      ],
      tools: [ECHO_TOOL],
      thinking: THINKING,
    })
    const messages = body.messages as Array<Record<string, unknown>>
    const assistant = assistants(body)[0]
    expect(assistant?.tool_calls).toBeDefined()
    expect(assistant?.reasoning_content).toBe('private chain of thought')
    // The tool-result pairing still rides the same call id, in order.
    const toolIndex = messages.findIndex((m) => m.role === 'tool')
    expect(toolIndex).toBeGreaterThan(messages.indexOf(assistant!))
    expect(messages[toolIndex]?.tool_call_id).toBe('call_1')
  })

  it('replays reasoning on a plain assistant turn (string content) while thinking is on', async () => {
    const { body } = await capture({
      messages: [
        { role: 'user', content: 'think' },
        { role: 'assistant', content: 'answer', reasoning: 'private chain of thought' },
        { role: 'user', content: 'continue' },
      ],
      tools: [ECHO_TOOL],
      thinking: THINKING,
    })
    const assistant = assistants(body)[0]
    expect(assistant?.content).toBe('answer')
    expect(assistant?.reasoning_content).toBe('private chain of thought')
  })

  it('replays reasoning on a plain assistant turn built from content blocks', async () => {
    const { body } = await capture({
      messages: [
        { role: 'user', content: 'think' },
        {
          role: 'assistant',
          content: [{ type: 'text', text: 'block answer' }],
          reasoning: 'block reasoning',
        },
        { role: 'user', content: 'continue' },
      ],
      tools: [ECHO_TOOL],
      thinking: THINKING,
    })
    const assistant = assistants(body)[0]
    expect(assistant?.content).toBe('block answer')
    expect(assistant?.reasoning_content).toBe('block reasoning')
  })

  it('replays every retained assistant turn with its own reasoning, in order', async () => {
    const { body } = await capture({
      messages: [
        { role: 'user', content: 'turn one' },
        {
          role: 'assistant',
          content: [{ type: 'tool_use', id: 'call_1', name: 'echo', input: { text: 'ping' } }],
          reasoning: 'first reasoning',
        } as ChatMessage,
        { role: 'user', content: [{ type: 'tool_result', tool_use_id: 'call_1', content: 'ok' }] },
        { role: 'assistant', content: 'plain answer', reasoning: 'second reasoning' },
        { role: 'user', content: 'continue' },
      ],
      tools: [ECHO_TOOL],
      thinking: THINKING,
    })
    expect(assistants(body).map((m) => m.reasoning_content)).toEqual([
      'first reasoning',
      'second reasoning',
    ])
  })

  it('sends an explicit empty reasoning_content for a retained turn that recorded none', async () => {
    const { body } = await capture({
      messages: [
        { role: 'user', content: 'call the tool' },
        {
          role: 'assistant',
          content: [{ type: 'tool_use', id: 'call_1', name: 'echo', input: { text: 'ping' } }],
        } as ChatMessage,
        { role: 'user', content: [{ type: 'tool_result', tool_use_id: 'call_1', content: 'ok' }] },
      ],
      tools: [ECHO_TOOL],
      thinking: THINKING,
    })
    // Mixed-mode compatibility: the vendor requires the field on every retained
    // assistant turn, and nothing was recorded for this (non-thinking) turn.
    expect(assistants(body)[0]?.reasoning_content).toBe('')
  })

  it('sends the same empty string for empty reasoning (absent and empty converge)', async () => {
    const withEmpty = await capture({
      messages: [
        { role: 'user', content: 'think' },
        { role: 'assistant', content: 'answer', reasoning: '' },
      ],
      tools: [ECHO_TOOL],
      thinking: THINKING,
    })
    vi.unstubAllGlobals()
    vi.stubGlobal('fetch', vi.fn())
    const withoutReasoning = await capture({
      messages: [
        { role: 'user', content: 'think' },
        { role: 'assistant', content: 'answer' },
      ],
      tools: [ECHO_TOOL],
      thinking: THINKING,
    })
    expect(assistants(withEmpty.body)[0]?.reasoning_content).toBe('')
    expect(assistants(withoutReasoning.body)[0]?.reasoning_content).toBe('')
  })

  it('never puts reasoning_content on user or system turns and keeps text intact', async () => {
    const { body } = await capture({
      messages: [
        { role: 'system', content: 'system text' },
        { role: 'user', content: 'user text' },
        { role: 'assistant', content: 'answer', reasoning: 'private chain of thought' },
      ],
      system: 'prepended system',
      tools: [ECHO_TOOL],
      thinking: THINKING,
    })
    const messages = body.messages as Array<Record<string, unknown>>
    for (const message of messages.filter((m) => m.role !== 'assistant')) {
      expect(message && 'reasoning_content' in message).toBe(false)
    }
    const assistant = assistants(body)[0]
    // The reasoning is replayed in its own field, never leaked into the answer.
    expect(assistant?.content).toBe('answer')
    expect(assistant?.reasoning_content).toBe('private chain of thought')
    expect(messages.map((m) => m.content)).toEqual(['prepended system', 'user text', 'answer'])
  })

  it('leaves the non-thinking wire unchanged (no reasoning_content anywhere)', async () => {
    const { body } = await capture({
      messages: [
        { role: 'user', content: 'call the tool' },
        {
          role: 'assistant',
          content: [{ type: 'tool_use', id: 'call_1', name: 'echo', input: { text: 'ping' } }],
          reasoning: 'private chain of thought',
        } as ChatMessage,
        { role: 'user', content: [{ type: 'tool_result', tool_use_id: 'call_1', content: 'ok' }] },
        { role: 'assistant', content: 'plain answer', reasoning: 'more reasoning' },
      ],
      tools: [ECHO_TOOL],
      toolChoice: 'required',
      temperature: 0.2,
    })
    expect(body.thinking).toEqual({ type: 'disabled' })
    expect(body.temperature).toBe(0.2)
    // Forced choice is only relaxed FOR thinking mode; this request keeps it.
    expect(body.tool_choice).toBe('required')
    for (const message of body.messages as Array<Record<string, unknown>>) {
      expect(message && 'reasoning_content' in message).toBe(false)
    }
  })

  it('captures reasoning from the response stream (the capture half of the loop)', async () => {
    const { events, body } = await capture({
      messages: [{ role: 'user', content: 'call the tool' }],
      tools: [ECHO_TOOL],
      thinking: THINKING,
    })
    const thinking = events.filter((e) => e.type === 'thinking')
    expect(thinking.map((e) => (e as { content: string }).content).join('')).toBe('internal plan')
    const toolUse = events.find((e) => e.type === 'tool_use') as
      { id: string; name: string; input: unknown } | undefined
    expect(toolUse).toMatchObject({ id: 'call_1', name: 'echo', input: { text: 'ping' } })
    expect(body.thinking).toEqual({ type: 'enabled' })
  })
})
