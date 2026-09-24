/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written.
 *
 * @module
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { CopilotSuggestion } from '@molecule/app-ai-copilot'
import { requireProvider, setProvider } from '@molecule/app-ai-copilot'

import { createProvider } from '../index.js'

describe('README @example', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('bonds the provider, streams suggestions, and reports the accepted one', async () => {
    const sse =
      'data: {"type":"suggestion","suggestion":{"id":"s1","text":"return a + b"}}\n' +
      'data: {"type":"done"}\n'
    const fetchMock = vi.fn(async (url: string) =>
      url.endsWith('/feedback') ? new Response(null, { status: 204 }) : new Response(sse),
    )
    vi.stubGlobal('fetch', fetchMock)

    setProvider(createProvider({ baseUrl: '', headers: { 'X-Client': 'editor' } }))

    const copilot = requireProvider()
    const config = { endpoint: '/api/ai/copilot', maxSuggestions: 3 }
    const context = {
      prefix: 'function add(a: number, b: number) {\n  ',
      suffix: '\n}',
      language: 'typescript',
    }

    const suggestions: CopilotSuggestion[] = []
    await copilot.getSuggestions(context, config, (event) => {
      if (event.type === 'suggestion') suggestions.push(event.suggestion)
      if (event.type === 'suggestions') suggestions.push(...event.suggestions)
    })

    expect(suggestions).toEqual([{ id: 's1', text: 'return a + b' }])

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('/api/ai/copilot')
    expect((init.headers as Record<string, string>)['X-Client']).toBe('editor')
    expect(JSON.parse(init.body as string)).toMatchObject({
      prefix: context.prefix,
      suffix: '\n}',
      language: 'typescript',
      maxSuggestions: 3,
    })

    const accepted = suggestions[0]
    if (accepted) await copilot.acceptSuggestion(accepted, config)

    const [feedbackUrl, feedbackInit] = fetchMock.mock.calls[1] as unknown as [string, RequestInit]
    expect(feedbackUrl).toBe('/api/ai/copilot/feedback')
    expect(JSON.parse(feedbackInit.body as string)).toEqual({
      suggestionId: 's1',
      action: 'accept',
      text: 'return a + b',
    })
  })
})
