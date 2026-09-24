/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written, through the default HTTP/SSE bond.
 *
 * @module
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

import { createProvider } from '@molecule/app-ai-assistant-default'

import { requireProvider, setProvider } from '../index.js'

describe('README @example', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('bonds the default provider, attaches context and streams the reply', async () => {
    const sse =
      'data: {"type":"text","content":"It is 12 days "}\n' +
      'data: {"type":"text","content":"past its due date."}\n' +
      'data: {"type":"done"}\n'
    const fetchMock = vi.fn(async () => new Response(sse, { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    setProvider(createProvider({ baseUrl: '' }))

    const assistant = requireProvider()
    const config = { endpoint: '/api/assistant' }

    const loading: boolean[] = []
    const unsubscribe = assistant.subscribe((state) => {
      loading.push(state.isLoading)
    })
    assistant.open(config)
    assistant.setContext([{ type: 'page', label: 'Invoices', value: '/invoices' }])
    const onEvent = vi.fn()
    await assistant.sendMessage('Why is this invoice overdue?', config, onEvent)

    const reply = assistant.getState().messages.at(-1)?.content
    unsubscribe()

    expect(reply).toBe('It is 12 days past its due date.')
    expect(assistant.getState().isOpen).toBe(true)
    expect(loading).toContain(true)
    expect(onEvent).toHaveBeenCalledWith({ type: 'done' })

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('/api/assistant')
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body as string)).toEqual({
      message: 'Why is this invoice overdue?',
      context: [{ type: 'page', label: 'Invoices', value: '/invoices' }],
    })
  })
})
