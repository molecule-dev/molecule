/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written, through the Anthropic bond. Only the
 * network is mocked: `fetch` returns a real Messages-API SSE stream.
 *
 * @module
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

import { setProvider } from '@molecule/api-ai'
import { createProvider } from '@molecule/api-ai-anthropic'

import { composeEmail } from '../index.js'

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

  it('drafts an email through the bonded AI provider', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', 'sk-ant-test')
    const reply = JSON.stringify({
      subject: 'Launch moved to Friday',
      body: 'Hi team,\n\nSorry for the short notice — the launch is now Friday.\n\nPriya',
      reasoning: 'Apologetic and short.',
    })
    const fetchMock = vi.fn(async () => sseTextResponse(reply))
    vi.stubGlobal('fetch', fetchMock)

    setProvider(createProvider({ apiKey: process.env.ANTHROPIC_API_KEY }))

    const draft = await composeEmail({
      brief: 'Tell the team the launch moved to Friday; apologize for the short notice.',
      tone: 'apologetic',
      length: 'short',
      audience: 'the engineering team',
      senderName: 'Priya',
    })

    expect(draft.subject).toBe('Launch moved to Friday')
    expect(draft.body).toContain('Priya')
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    const body = JSON.parse(init.body as string) as { messages: Array<{ content: string }> }
    expect(body.messages[0]?.content).toContain('on behalf of Priya')
    expect(body.messages[0]?.content).toContain('Tone: apologetic')
  })

  it('resolves with the "(draft failed)" subject on a malformed reply', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', 'sk-ant-test')
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => sseTextResponse('Sorry, I cannot help with that.')),
    )
    setProvider(createProvider({ apiKey: process.env.ANTHROPIC_API_KEY }))

    const draft = await composeEmail({ brief: 'Say hi' })
    expect(draft.subject).toBe('(draft failed)')
    expect(draft.body).toBe('Sorry, I cannot help with that.')
  })
})
