/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written: the real Anthropic `ai` bond under the
 * real summarization core. Only the network is mocked: `fetch` returns a real
 * (non-streaming) Anthropic Messages API response.
 *
 * @module
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

import { setProvider as setAIProvider } from '@molecule/api-ai'
import { createProvider } from '@molecule/api-ai-anthropic'
import { requireProvider, setProvider } from '@molecule/api-ai-summarization'

import { provider as summarizer } from '../index.js'

describe('README @example', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('summarizes text over the bonded LLM', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', 'test-key')
    vi.stubEnv('ANTHROPIC_BASE_URL', undefined)
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 'msg_1',
          type: 'message',
          role: 'assistant',
          content: [{ type: 'text', text: '- Revenue up 20% to $12M\n- Guidance raised\n' }],
          stop_reason: 'end_turn',
          usage: { input_tokens: 80, output_tokens: 12 },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    )
    vi.stubGlobal('fetch', fetchMock)

    setAIProvider('anthropic', createProvider({ apiKey: process.env.ANTHROPIC_API_KEY }))
    setProvider(summarizer)

    const article =
      'Acme Corp reported Q3 revenue of $12M, up 20% year over year, driven by its new ' +
      'subscription tier. Operating costs rose 5%, and the company raised full-year guidance.'

    const { summary, usage } = await requireProvider().summarize({
      text: article,
      format: 'bullets',
      maxLength: 60,
      focus: 'the financial impact',
    })

    expect(summary).toBe('- Revenue up 20% to $12M\n- Guidance raised')
    expect(usage).toMatchObject({ inputTokens: 80, outputTokens: 12 })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('https://api.anthropic.com/v1/messages')
    const body = JSON.parse(init.body as string) as {
      stream?: boolean
      system: unknown
      messages: unknown
    }
    expect(body.stream).not.toBe(true)
    expect(body.messages).toEqual([{ role: 'user', content: article }])
    const system = JSON.stringify(body.system)
    expect(system).toContain('bulleted list')
    expect(system).toContain('roughly 60 words')
    expect(system).toContain('Focus on: the financial impact')
  })
})
