// @vitest-environment jsdom
/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written — with no `I18nProvider` and no
 * ClassMap, as the remarks promise.
 *
 * @module
 */
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { EmbeddableChatWidget } from '../index.js'

/**
 * The README example, verbatim.
 *
 * @returns The rendered help-center page.
 */
function HelpCenterPage(): React.JSX.Element {
  return (
    <main>
      <h1>Help center</h1>
      <EmbeddableChatWidget
        config={{
          apiBaseUrl: 'https://api.example.com', // POSTs https://api.example.com/chat
          brandName: 'Acme',
          position: 'bottom-right',
          theme: { primaryColor: '#7c3aed' },
        }}
      />
    </main>
  )
}

/**
 * A backend reply streamed as SSE.
 *
 * @param deltas - Content deltas to stream.
 * @returns The streaming response.
 */
function sseResponse(deltas: string[]): Response {
  const encoder = new TextEncoder()
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const delta of deltas) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: 'content', delta })}\n\n`),
        )
      }
      controller.enqueue(encoder.encode('data: [DONE]\n\n'))
      controller.close()
    },
  })
  return new Response(stream, { status: 200, headers: { 'Content-Type': 'text/event-stream' } })
}

describe('README @example', () => {
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('opens from the launcher, POSTs the message to /chat and streams the reply', async () => {
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) =>
      sseResponse(['Hi! ', 'How can I help?']),
    )
    vi.stubGlobal('fetch', fetchMock)
    const view = render(<HelpCenterPage />)
    expect(view.getByRole('heading', { name: 'Help center' })).toBeTruthy()

    fireEvent.click(view.getByRole('button', { name: 'Open chat' }))
    expect(view.getByLabelText('Chat with Acme')).toBeTruthy()
    fireEvent.change(view.getByLabelText('Type your message…'), {
      target: { value: 'Where is my order?' },
    })
    fireEvent.click(view.getByRole('button', { name: 'Send' }))

    await waitFor(() => expect(view.getByText('Hi! How can I help?')).toBeTruthy())
    expect(view.getByText('Where is my order?')).toBeTruthy()
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] ?? []
    expect(url).toBe('https://api.example.com/chat')
    expect(init?.method).toBe('POST')
    expect(JSON.parse(String(init?.body))).toEqual({ message: 'Where is my order?' })
  })
})
