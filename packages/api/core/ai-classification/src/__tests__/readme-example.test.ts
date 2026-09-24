/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written, through the LLM classifier bond over
 * the Anthropic chat bond. Only the network is mocked: `fetch` returns a real
 * Messages-API JSON response.
 *
 * @module
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

import { setProvider as setAiProvider } from '@molecule/api-ai'
import { createProvider as createAnthropic } from '@molecule/api-ai-anthropic'
import { provider as classifier } from '@molecule/api-ai-classification-llm'

import { requireProvider, setProvider } from '../index.js'

describe('README @example', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('bonds the chat model + classifier and returns score-sorted candidate labels', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', 'sk-ant-test')
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            content: [{ type: 'text', text: '{"scores":{"spam":0.98,"ham":0.02}}' }],
            usage: { input_tokens: 40, output_tokens: 12 },
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
    )
    vi.stubGlobal('fetch', fetchMock)

    setAiProvider(createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY }))
    setProvider(classifier)

    const result = await requireProvider().classify({
      text: 'Win a FREE $1000 gift card now!!!',
      labels: ['spam', 'ham'],
    })

    expect(result.top).toBe('spam')
    expect(result.labels).toEqual([
      { label: 'spam', score: 0.98 },
      { label: 'ham', score: 0.02 },
    ])
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
