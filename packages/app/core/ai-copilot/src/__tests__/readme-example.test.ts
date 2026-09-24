/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written, through the default HTTP/SSE bond.
 *
 * @module
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

import { createProvider } from '@molecule/app-ai-copilot-default'

import type { CopilotSuggestion } from '../index.js'
import { requireProvider, setProvider } from '../index.js'

describe('README @example', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('streams a suggestion for the cursor context and reports the accept', async () => {
    const sse =
      'data: {"type":"suggestion","suggestion":{"id":"s1","text":"return a + b\\n}"}}\n' +
      'data: {"type":"done"}\n'
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) =>
      _url.endsWith('/feedback') ? new Response(null, { status: 204 }) : new Response(sse),
    )
    vi.stubGlobal('fetch', fetchMock)

    setProvider(createProvider({ baseUrl: '' }))

    const text = 'function add(a: number, b: number) {\n  '
    const cursor = text.length
    const copilot = requireProvider()
    const config = { endpoint: '/api/copilot' }

    let ghost: CopilotSuggestion | undefined
    const errors: string[] = []
    copilot.abort()
    await copilot.getSuggestions(
      { prefix: text.slice(0, cursor), suffix: text.slice(cursor), language: 'typescript' },
      config,
      (event) => {
        if (event.type === 'suggestion') ghost = event.suggestion
        if (event.type === 'error') errors.push(event.message)
      },
    )

    expect(errors).toEqual([])
    expect(ghost).toEqual({ id: 's1', text: 'return a + b\n}' })
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/copilot')
    expect(JSON.parse(init.body as string)).toMatchObject({
      prefix: text,
      suffix: '',
      language: 'typescript',
    })

    if (ghost) await copilot.acceptSuggestion(ghost, config)
    const [feedbackUrl, feedbackInit] = fetchMock.mock.calls[1] as [string, RequestInit]
    expect(feedbackUrl).toBe('/api/copilot/feedback')
    expect(JSON.parse(feedbackInit.body as string)).toMatchObject({
      suggestionId: 's1',
      action: 'accept',
    })
  })
})
