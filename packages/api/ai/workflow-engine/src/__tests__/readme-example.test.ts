/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written, through the Anthropic bond and the
 * `@molecule/api-http` default client. Only the network is mocked: `fetch`
 * answers the Anthropic Messages API with an SSE stream and the webhook with JSON.
 *
 * @module
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

import { setProvider } from '@molecule/api-ai'
import { createProvider } from '@molecule/api-ai-anthropic'

import { createWorkflowEngine } from '../index.js'

/**
 * Builds a streaming fetch Response whose Anthropic SSE stream yields `text` as one text block.
 *
 * @param text - The model's full reply text.
 * @returns A minimal streaming Response.
 */
function sseTextResponse(text: string): Response {
  const events: Array<Record<string, unknown>> = [
    { type: 'message_start', message: { usage: { input_tokens: 40 } } },
    { type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } },
    { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text } },
    { type: 'content_block_stop', index: 0 },
    { type: 'message_delta', usage: { output_tokens: 30 } },
    { type: 'message_stop' },
  ]
  const body = events.map((e) => `data: ${JSON.stringify(e)}`).join('\n') + '\n'
  return new Response(new TextEncoder().encode(body), {
    status: 200,
    headers: { 'content-type': 'text/event-stream' },
  })
}

describe('README @example', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('runs condition → ai_prompt → http → action and fills the context', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', 'sk-ant-test')
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url = String(input instanceof Request ? input.url : input)
      if (url.endsWith('/v1/messages')) return sseTextResponse('Thank you, Ada!')
      if (url.startsWith('https://hooks.example.com/')) {
        return new Response(JSON.stringify({ received: true }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      }
      throw new Error(`Unexpected fetch: ${url}`)
    })
    vi.stubGlobal('fetch', fetchMock)

    setProvider(createProvider({ apiKey: process.env.ANTHROPIC_API_KEY }))

    const savedNotes: string[] = []
    const engine = createWorkflowEngine({
      triggers: { 'order.created': async (ctx) => ({ order: ctx.order }) },
      actions: {
        'notes.save': async ({ text }) => savedNotes.push(String(text)),
      },
    })

    const run = await engine.execute({
      trigger: 'order.created',
      triggerInput: { order: { id: 'ord_1', amount: 250, customer: 'Ada' } },
      steps: [
        { type: 'condition', expression: '$.order.amount >= 100' },
        { type: 'ai_prompt', prompt: 'One-line thank-you to ${$.order.customer}.', output: 'note' },
        {
          type: 'http',
          method: 'POST',
          url: 'https://hooks.example.com/orders/${$.order.id}',
          body: { note: '${$.note}' },
          output: 'webhook',
        },
        { type: 'action', action: 'notes.save', params: { text: '${$.note}' } },
      ],
    })

    expect(run.ok).toBe(true)
    expect(run.trace.map((t) => t.outcome)).toEqual([
      'executed',
      'executed',
      'executed',
      'executed',
    ])
    expect(run.context.note).toBe('Thank you, Ada!')
    expect(savedNotes).toEqual(['Thank you, Ada!'])
    expect(run.context.webhook).toMatchObject({ status: 200, data: { received: true } })

    const hookCall = fetchMock.mock.calls.find(([input]) =>
      String(input).startsWith('https://hooks.example.com/'),
    )
    expect(hookCall).toBeDefined()
    const [hookUrl, hookInit] = hookCall as unknown as [string, RequestInit]
    expect(String(hookUrl)).toBe('https://hooks.example.com/orders/ord_1')
    expect(hookInit.method).toBe('POST')
    expect(JSON.parse(hookInit.body as string)).toEqual({ note: 'Thank you, Ada!' })
  })

  it('stops with ok: true (skipped) when the condition is false', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const engine = createWorkflowEngine({
      triggers: { 'order.created': async (ctx) => ({ order: ctx.order }) },
      actions: {},
    })
    const run = await engine.execute({
      trigger: 'order.created',
      triggerInput: { order: { id: 'ord_2', amount: 20, customer: 'Bob' } },
      steps: [
        { type: 'condition', expression: '$.order.amount >= 100' },
        { type: 'ai_prompt', prompt: 'unused', output: 'note' },
      ],
    })
    expect(run.ok).toBe(true)
    expect(run.trace).toEqual([{ index: 0, type: 'condition', outcome: 'skipped' }])
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
