/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written: this LLM agent bond, wired through the
 * agents core, over the Anthropic chat bond. Only the network is mocked:
 * `fetch` returns real Messages-API SSE streams (a tool call, then a final answer).
 *
 * @module
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { AITool } from '@molecule/api-ai'
import { setProvider as setAiProvider } from '@molecule/api-ai'
import { requireProvider, setProvider } from '@molecule/api-ai-agents'
import { createProvider as createAnthropic } from '@molecule/api-ai-anthropic'

import { provider as agents } from '../index.js'

/**
 * Builds a streaming fetch Response from Anthropic SSE event objects.
 *
 * @param events - The SSE `data:` payloads, in order.
 * @returns A minimal streaming Response.
 */
function sseResponse(events: Array<Record<string, unknown>>): Response {
  const text = events.map((e) => `data: ${JSON.stringify(e)}`).join('\n') + '\n'
  return new Response(new TextEncoder().encode(text), {
    status: 200,
    headers: { 'content-type': 'text/event-stream' },
  })
}

describe('README @example', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('runs the tool loop: the model calls add, execute() runs, the model answers', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', 'sk-ant-test')
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        sseResponse([
          { type: 'message_start', message: { usage: { input_tokens: 20 } } },
          {
            type: 'content_block_start',
            index: 0,
            content_block: { type: 'tool_use', id: 'toolu_1', name: 'add' },
          },
          {
            type: 'content_block_delta',
            index: 0,
            delta: { type: 'input_json_delta', partial_json: '{"a":1,"b":2}' },
          },
          { type: 'content_block_stop', index: 0 },
          { type: 'message_delta', usage: { output_tokens: 7 } },
          { type: 'message_stop' },
        ]),
      )
      .mockResolvedValueOnce(
        sseResponse([
          { type: 'message_start', message: { usage: { input_tokens: 30 } } },
          { type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } },
          {
            type: 'content_block_delta',
            index: 0,
            delta: { type: 'text_delta', text: '1 + 2 = 3.' },
          },
          { type: 'content_block_stop', index: 0 },
          { type: 'message_delta', usage: { output_tokens: 5 } },
          { type: 'message_stop' },
        ]),
      )
    vi.stubGlobal('fetch', fetchMock)

    setAiProvider(createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY }))
    setProvider(agents)

    const execute = vi.fn(async (input: unknown) => {
      const { a, b } = input as { a: number; b: number }
      return a + b
    })
    const add: AITool = {
      name: 'add',
      description: 'Add two numbers',
      parameters: {
        type: 'object',
        properties: { a: { type: 'number' }, b: { type: 'number' } },
        required: ['a', 'b'],
      },
      execute,
    }

    const result = await requireProvider().run({
      task: 'What is 1 + 2? Use the add tool.',
      tools: [add],
      maxSteps: 5,
    })

    expect(result.output).toBe('1 + 2 = 3.')
    expect(execute).toHaveBeenCalledWith({ a: 1, b: 2 })
    expect(result.steps[0]?.toolCalls[0]?.result).toBe(3)
    expect(result.usage.inputTokens).toBe(50)
    expect(result.usage.outputTokens).toBe(12)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
