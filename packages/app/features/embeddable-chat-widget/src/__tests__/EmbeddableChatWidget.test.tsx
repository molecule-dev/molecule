// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import * as React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { createSimpleI18nProvider } from '@molecule/app-i18n'
import { I18nProvider } from '@molecule/app-react'

import { EmbeddableChatWidget } from '../EmbeddableChatWidget.js'
import type { EmbeddableChatWidgetConfig } from '../types.js'

/**
 * Wrap children in an I18nProvider so `useTranslation()` resolves to the
 * default-value fallbacks specified throughout the widget.
 *
 * @param props Wrapper props.
 * @param props.children React children.
 */
function Wrap({ children }: { children: ReactNode }): React.ReactElement {
  return <I18nProvider provider={createSimpleI18nProvider('en')}>{children}</I18nProvider>
}

afterEach(() => {
  cleanup()
})

/**
 * Build a fake fetch that returns an SSE stream pushing the given chunks
 * one at a time. Each chunk is encoded as a single `data:` line. After
 * all chunks have been pushed the stream closes — the widget treats that
 * as end-of-stream.
 *
 * @param chunks SSE-encoded payloads to emit (raw delta strings).
 */
function makeStreamingFetch(chunks: string[]): typeof fetch {
  return vi.fn(async () => {
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        const encoder = new TextEncoder()
        for (const c of chunks) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'content', delta: c })}\n\n`),
          )
        }
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`))
        controller.close()
      },
    })
    return new Response(stream, { status: 200, headers: { 'Content-Type': 'text/event-stream' } })
  }) as unknown as typeof fetch
}

/**
 * Build a fake fetch that fails the HTTP request.
 */
function makeErrorFetch(): typeof fetch {
  return vi.fn(async () => new Response('boom', { status: 500 })) as unknown as typeof fetch
}

/** Build a config with a mocked fetch impl. */
function configWith(fetchImpl: typeof fetch): EmbeddableChatWidgetConfig {
  return {
    apiBaseUrl: 'https://api.example.com',
    brandName: 'Acme',
    fetchImpl,
  }
}

describe('<EmbeddableChatWidget>', () => {
  it('renders the launcher when collapsed', () => {
    render(
      <Wrap>
        <EmbeddableChatWidget config={configWith(makeStreamingFetch([]))} />
      </Wrap>,
    )
    const launcher = document.querySelector('[data-mol-id="embeddable-chat-launcher"]')
    expect(launcher).not.toBeNull()
    expect(document.querySelector('[data-mol-id="embeddable-chat-panel"]')).toBeNull()
  })

  it('expands to the panel when the launcher is clicked, and collapses again', () => {
    render(
      <Wrap>
        <EmbeddableChatWidget config={configWith(makeStreamingFetch([]))} />
      </Wrap>,
    )
    const launcher = document.querySelector(
      '[data-mol-id="embeddable-chat-launcher"]',
    ) as HTMLElement
    fireEvent.click(launcher)
    expect(document.querySelector('[data-mol-id="embeddable-chat-panel"]')).not.toBeNull()
    expect(document.querySelector('[data-mol-id="embeddable-chat-launcher"]')).toBeNull()
    const close = document.querySelector('[data-mol-id="embeddable-chat-close"]') as HTMLElement
    fireEvent.click(close)
    expect(document.querySelector('[data-mol-id="embeddable-chat-panel"]')).toBeNull()
    expect(document.querySelector('[data-mol-id="embeddable-chat-launcher"]')).not.toBeNull()
  })

  it('sends a message and renders streamed deltas in order', async () => {
    const fetchImpl = makeStreamingFetch(['Hello', ', world', '!'])
    render(
      <Wrap>
        <EmbeddableChatWidget config={configWith(fetchImpl)} defaultOpen />
      </Wrap>,
    )
    const input = document.querySelector(
      '[data-mol-id="embeddable-chat-input"]',
    ) as HTMLTextAreaElement
    const send = document.querySelector('[data-mol-id="embeddable-chat-send"]') as HTMLButtonElement
    expect(input).not.toBeNull()
    fireEvent.change(input, { target: { value: 'Hi there' } })
    await act(async () => {
      fireEvent.click(send)
    })
    // The user message should be in the transcript.
    expect(document.querySelector('[data-mol-id="embeddable-chat-message-user"]')).not.toBeNull()
    // And the assistant message should have all three deltas concatenated.
    await waitFor(() => {
      expect(screen.getByText('Hello, world!')).toBeDefined()
    })
    expect(fetchImpl).toHaveBeenCalledTimes(1)
    const [url, init] = (fetchImpl as unknown as { mock: { calls: [string, RequestInit][] } }).mock
      .calls[0]
    expect(url).toBe('https://api.example.com/chat')
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body as string)).toEqual({ message: 'Hi there' })
  })

  it('shows an error message when the backend returns a non-OK response', async () => {
    const fetchImpl = makeErrorFetch()
    render(
      <Wrap>
        <EmbeddableChatWidget config={configWith(fetchImpl)} defaultOpen />
      </Wrap>,
    )
    const input = document.querySelector(
      '[data-mol-id="embeddable-chat-input"]',
    ) as HTMLTextAreaElement
    const send = document.querySelector('[data-mol-id="embeddable-chat-send"]') as HTMLButtonElement
    fireEvent.change(input, { target: { value: 'fail please' } })
    await act(async () => {
      fireEvent.click(send)
    })
    await waitFor(() => {
      const err = document.querySelector('[data-mol-id="embeddable-chat-error"]')
      expect(err).not.toBeNull()
    })
  })

  it('does not send when the input is empty', async () => {
    const fetchImpl = makeStreamingFetch(['x'])
    render(
      <Wrap>
        <EmbeddableChatWidget config={configWith(fetchImpl)} defaultOpen />
      </Wrap>,
    )
    const send = document.querySelector('[data-mol-id="embeddable-chat-send"]') as HTMLButtonElement
    expect(send.disabled).toBe(true)
    await act(async () => {
      fireEvent.click(send)
    })
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('honours position=bottom-left in the launcher styles', () => {
    render(
      <Wrap>
        <EmbeddableChatWidget
          config={{ ...configWith(makeStreamingFetch([])), position: 'bottom-left' }}
        />
      </Wrap>,
    )
    const launcher = document.querySelector(
      '[data-mol-id="embeddable-chat-launcher"]',
    ) as HTMLElement
    expect(launcher.style.left).toBe('24px')
    expect(launcher.style.right).toBe('')
  })
})
