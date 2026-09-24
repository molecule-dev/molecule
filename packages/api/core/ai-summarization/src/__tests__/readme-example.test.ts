/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written, through the LLM summarizer bond over
 * the Anthropic chat bond. Only the network is mocked: `fetch` returns a real
 * Messages-API JSON response.
 *
 * @module
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

import { setProvider as setAiProvider } from '@molecule/api-ai'
import { createProvider as createAnthropic } from '@molecule/api-ai-anthropic'
import { provider as summarizer } from '@molecule/api-ai-summarization-llm'

import { requireProvider, setProvider } from '../index.js'

describe('README @example', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('bonds the chat model + summarizer and returns a bullet summary with usage', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', 'sk-ant-test')
    const fetchMock = vi.fn(async () =>
      Response.json({
        content: [
          { type: 'text', text: '\n- Revenue up 20% to $12M\n- Full-year guidance raised\n' },
        ],
        usage: { input_tokens: 70, output_tokens: 14 },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    setAiProvider(createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY }))
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

    expect(summary).toBe('- Revenue up 20% to $12M\n- Full-year guidance raised')
    expect(usage?.outputTokens).toBe(14)

    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    const body = JSON.parse(init.body as string) as { system: unknown }
    const system = JSON.stringify(body.system)
    expect(system).toContain('bulleted list')
    expect(system).toContain('roughly 60 words')
    expect(system).toContain('Focus on: the financial impact')
  })
})
