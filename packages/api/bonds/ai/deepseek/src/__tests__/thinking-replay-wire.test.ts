/**
 * The thinking / reasoning-replay WIRE SEAM of the native DeepSeek bond.
 *
 * DeepSeek's thinking-mode guide (2026-10-22) requires an assistant turn's
 * `reasoning_content` to be sent back on every later request that carries
 * `tools`, including turns where the model made no tool call; omitting it is a
 * 400. `ChatMessage.reasoning` is the generic slot Synthase fills from its
 * persisted `thinking` blocks. These cases pin what this bond actually puts on
 * the wire today, so a change in either direction is deliberate and visible:
 *
 * - `thinking` enabled/disabled and the native `reasoning_effort` value;
 * - the forced-tool-choice relaxation thinking mode requires;
 * - whether `ChatMessage.reasoning` is replayed (`reasoning_content`) on tool
 *   calls and on plain assistant turns, and how absent vs empty reasoning is
 *   handled (the investigation behind `x1-native-thinking-replay-capability-v1`,
 *   `.experiments/x0/live/main-deepseek-thinking-capability.findings.md`).
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
  it('does not replay reasoning on an assistant tool-call turn', async () => {
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
    })
    const messages = body.messages as Array<Record<string, unknown>>
    const assistant = messages.find((m) => m.role === 'assistant')
    expect(assistant).toBeDefined()
    expect(assistant?.tool_calls).toBeDefined()
    // The gap this experiment measures: the generic reasoning slot is dropped.
    expect(assistant && 'reasoning_content' in assistant).toBe(false)
    // The tool-result pairing still rides the same call id.
    const toolMessage = messages.find((m) => m.role === 'tool')
    expect(toolMessage?.tool_call_id).toBe('call_1')
  })

  it('does not replay reasoning on a plain assistant turn (no tool call)', async () => {
    const { body } = await capture({
      messages: [
        { role: 'user', content: 'think' },
        { role: 'assistant', content: 'answer', reasoning: 'private chain of thought' },
        { role: 'user', content: 'continue' },
      ],
    })
    const messages = body.messages as Array<Record<string, unknown>>
    const assistant = messages.find((m) => m.role === 'assistant')
    expect(assistant && 'reasoning_content' in assistant).toBe(false)
  })

  it('serializes absent and empty reasoning identically (no empty replay)', async () => {
    const withEmpty = await capture({
      messages: [
        { role: 'user', content: 'think' },
        { role: 'assistant', content: 'answer', reasoning: '' },
      ],
    })
    vi.unstubAllGlobals()
    vi.stubGlobal('fetch', vi.fn())
    const withoutReasoning = await capture({
      messages: [
        { role: 'user', content: 'think' },
        { role: 'assistant', content: 'answer' },
      ],
    })
    const pick = (body: Record<string, unknown>) =>
      (body.messages as Array<Record<string, unknown>>).find((m) => m.role === 'assistant')
    expect(pick(withEmpty.body)).toEqual(pick(withoutReasoning.body))
    expect(pick(withEmpty.body) && 'reasoning_content' in pick(withEmpty.body)!).toBe(false)
  })

  it('captures reasoning from the response stream (the capture half of the loop)', async () => {
    const { events, body } = await capture({
      messages: [{ role: 'user', content: 'call the tool' }],
      tools: [ECHO_TOOL],
      thinking: { type: 'enabled', budgetTokens: 8_000, effort: 'high' },
    })
    const thinking = events.filter((e) => e.type === 'thinking')
    expect(thinking.map((e) => (e as { content: string }).content).join('')).toBe('internal plan')
    const toolUse = events.find((e) => e.type === 'tool_use') as
      { id: string; name: string; input: unknown } | undefined
    expect(toolUse).toMatchObject({ id: 'call_1', name: 'echo', input: { text: 'ping' } })
    expect(body.thinking).toEqual({ type: 'enabled' })
  })
})
