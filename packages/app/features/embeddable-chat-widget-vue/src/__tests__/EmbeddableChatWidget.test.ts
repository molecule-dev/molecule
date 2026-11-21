// @vitest-environment jsdom
/**
 * Unit tests for the Vue `EmbeddableChatWidget` — a port of
 * `@molecule/app-embeddable-chat-widget/src/__tests__/EmbeddableChatWidget.test.tsx`:
 * the same behavioral assertions, rendered with Vue in jsdom.
 *
 * React's suite wraps the widget in an `I18nProvider`; the Vue widget reads
 * the bonded `@molecule/app-i18n` provider through the binding's composables,
 * so the wrap is the bond. The "bare page" describe asserts the same English
 * defaults and no-throw behavior a bare third-party page gets (Vue's
 * provider-optional path resolves the same simple provider a bare page's
 * fallback auto-creates).
 *
 * @module
 */

import { afterEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { type App, createApp, defineComponent, h } from 'vue'

import { createSimpleI18nProvider, setProvider as setI18nProvider } from '@molecule/app-i18n'

import { EmbeddableChatWidget, type EmbeddableChatWidgetProps } from '../EmbeddableChatWidget.js'
import { mountEmbeddableChatWidget } from '../mount.js'
import type { EmbeddableChatWidgetConfig } from '../types.js'

/** The apps this suite mounted, unmounted after every test. */
const mounted: App<Element>[] = []

afterEach(() => {
  for (const app of mounted.splice(0)) app.unmount()
  document.body.innerHTML = ''
})

/**
 * Render the widget with the given props and return its host container.
 *
 * @param props - Widget props (`config`, `defaultOpen`).
 */
function render(props: EmbeddableChatWidgetProps): HTMLElement {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(defineComponent({ render: () => h(EmbeddableChatWidget, props) }))
  app.mount(host)
  mounted.push(app)
  return host
}

/**
 * Build a fake fetch that returns an SSE stream pushing the given chunks
 * one at a time. Each chunk is encoded as a single `data:` line. After
 * all chunks have been pushed the stream closes — the widget treats that
 * as end-of-stream.
 *
 * @param chunks SSE-encoded payloads to emit (raw delta strings).
 */
function makeStreamingFetch(chunks: string[]): typeof fetch {
  return vi.fn<typeof fetch>(async () => {
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
  })
}

/** Build a fake fetch that fails the HTTP request. */
function makeErrorFetch(): typeof fetch {
  return vi.fn<typeof fetch>(async () => new Response('boom', { status: 500 }))
}

/** Build a config with a mocked fetch impl. */
function configWith(fetchImpl: typeof fetch): EmbeddableChatWidgetConfig {
  return {
    apiBaseUrl: 'https://api.example.com',
    brandName: 'Acme',
    fetchImpl,
  }
}

/** Types a value into the composer textarea the way a user would. */
async function typeMessage(host: HTMLElement, value: string): Promise<HTMLTextAreaElement> {
  const input = host.querySelector('[data-mol-id="embeddable-chat-input"]') as HTMLTextAreaElement
  input.value = value
  input.dispatchEvent(new Event('input', { bubbles: true }))
  await nextTick()
  return input
}

describe('<EmbeddableChatWidget>', () => {
  it('renders the launcher when collapsed', () => {
    setI18nProvider(createSimpleI18nProvider('en'))
    const host = render({ config: configWith(makeStreamingFetch([])) })
    expect(host.querySelector('[data-mol-id="embeddable-chat-launcher"]')).not.toBeNull()
    expect(host.querySelector('[data-mol-id="embeddable-chat-panel"]')).toBeNull()
  })

  it('expands to the panel when the launcher is clicked, and collapses again', async () => {
    setI18nProvider(createSimpleI18nProvider('en'))
    const host = render({ config: configWith(makeStreamingFetch([])) })
    const launcher = host.querySelector('[data-mol-id="embeddable-chat-launcher"]') as HTMLElement
    launcher.click()
    await nextTick()
    expect(host.querySelector('[data-mol-id="embeddable-chat-panel"]')).not.toBeNull()
    expect(host.querySelector('[data-mol-id="embeddable-chat-launcher"]')).toBeNull()
    const close = host.querySelector('[data-mol-id="embeddable-chat-close"]') as HTMLElement
    close.click()
    await nextTick()
    expect(host.querySelector('[data-mol-id="embeddable-chat-panel"]')).toBeNull()
    expect(host.querySelector('[data-mol-id="embeddable-chat-launcher"]')).not.toBeNull()
  })

  it('sends a message and renders streamed deltas in order', async () => {
    setI18nProvider(createSimpleI18nProvider('en'))
    const fetchImpl = makeStreamingFetch(['Hello', ', world', '!'])
    const host = render({ config: configWith(fetchImpl), defaultOpen: true })
    const input = await typeMessage(host, 'Hi there')
    const send = host.querySelector('[data-mol-id="embeddable-chat-send"]') as HTMLButtonElement
    expect(input).not.toBeNull()
    send.click()
    await nextTick()
    // The user message should be in the transcript.
    expect(host.querySelector('[data-mol-id="embeddable-chat-message-user"]')).not.toBeNull()
    // And the assistant message should have all three deltas concatenated.
    await vi.waitFor(() => {
      const assistant = host.querySelector(
        '[data-mol-id="embeddable-chat-message-assistant"]',
      ) as HTMLElement
      expect(assistant.textContent).toBe('Hello, world!')
    })
    expect(fetchImpl).toHaveBeenCalledTimes(1)
    const [url, init = {}] = vi.mocked(fetchImpl).mock.calls[0]
    expect(url).toBe('https://api.example.com/chat')
    expect(init.method).toBe('POST')
    // Wire contract: only the latest user message is posted (no history/id/auth).
    expect(JSON.parse(init.body as string)).toEqual({ message: 'Hi there' })
    // Wire contract: SSE is requested via the Accept header.
    expect((init.headers as Record<string, string>).Accept).toBe('text/event-stream')
    expect((init.headers as Record<string, string>)['Content-Type']).toBe('application/json')
  })

  it('shows an error message when the backend returns a non-OK response', async () => {
    setI18nProvider(createSimpleI18nProvider('en'))
    const fetchImpl = makeErrorFetch()
    const host = render({ config: configWith(fetchImpl), defaultOpen: true })
    await typeMessage(host, 'fail please')
    const send = host.querySelector('[data-mol-id="embeddable-chat-send"]') as HTMLButtonElement
    send.click()
    await vi.waitFor(() => {
      const err = host.querySelector('[data-mol-id="embeddable-chat-error"]')
      expect(err).not.toBeNull()
    })
  })

  it('does not send when the input is empty', async () => {
    setI18nProvider(createSimpleI18nProvider('en'))
    const fetchImpl = makeStreamingFetch(['x'])
    const host = render({ config: configWith(fetchImpl), defaultOpen: true })
    const send = host.querySelector('[data-mol-id="embeddable-chat-send"]') as HTMLButtonElement
    expect(send.disabled).toBe(true)
    send.click()
    await nextTick()
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('honours position=bottom-left in the launcher styles', () => {
    setI18nProvider(createSimpleI18nProvider('en'))
    const host = render({
      config: { ...configWith(makeStreamingFetch([])), position: 'bottom-left' },
    })
    const launcher = host.querySelector('[data-mol-id="embeddable-chat-launcher"]') as HTMLElement
    expect(launcher.style.left).toBe('24px')
    expect(launcher.style.right).toBe('')
  })
})

describe('<EmbeddableChatWidget> on a bare page (no molecule providers)', () => {
  // NOTE: React's suite renders this describe WITHOUT an I18nProvider and
  // never calls setClassMap() — the Vue widget's provider-optional path
  // resolves the bonded simple provider, which is exactly what a bare page's
  // fallback auto-creates. The assertions are the same: no throw, English
  // default labels, inline styling only.

  it('renders the launcher without any provider and does not throw', () => {
    expect(() => render({ config: configWith(makeStreamingFetch([])) })).not.toThrow()
    const host = document.body.lastElementChild as HTMLElement
    expect(host.querySelector('[data-mol-id="embeddable-chat-launcher"]')).not.toBeNull()
  })

  it('expands to a panel with English default labels and no provider', () => {
    const host = render({ config: configWith(makeStreamingFetch([])), defaultOpen: true })
    expect(host.querySelector('[data-mol-id="embeddable-chat-panel"]')).not.toBeNull()
    // Interpolated defaultValue (brandName substituted) is used with no i18n composition.
    expect(host.textContent).toContain('Chat with Acme')
    expect(host.textContent).toContain('Ask a question to get started.')
    const input = host.querySelector('[data-mol-id="embeddable-chat-input"]') as HTMLTextAreaElement
    expect(input.placeholder).toBe('Type your message…')
  })

  it('streams a reply on a bare page (no provider) without throwing', async () => {
    const fetchImpl = makeStreamingFetch(['Bare ', 'page ', 'works'])
    const host = render({ config: configWith(fetchImpl), defaultOpen: true })
    await typeMessage(host, 'Hi')
    const send = host.querySelector('[data-mol-id="embeddable-chat-send"]') as HTMLButtonElement
    send.click()
    await vi.waitFor(() => {
      const assistant = host.querySelector(
        '[data-mol-id="embeddable-chat-message-assistant"]',
      ) as HTMLElement
      expect(assistant.textContent).toBe('Bare page works')
    })
  })
})

describe('mountEmbeddableChatWidget', () => {
  let container: HTMLDivElement
  let app: App<Element> | undefined

  afterEach(() => {
    app?.unmount()
    app = undefined
    container?.remove()
  })

  it('mounts into a bare container (no providers) and renders the launcher', () => {
    container = document.createElement('div')
    container.id = 'molecule-chat-widget'
    document.body.appendChild(container)
    expect(() => {
      app = mountEmbeddableChatWidget(container, configWith(makeStreamingFetch([])))
    }).not.toThrow()
    expect(container.querySelector('[data-mol-id="embeddable-chat-launcher"]')).not.toBeNull()
  })

  it('accepts a CSS selector for the container', () => {
    container = document.createElement('div')
    container.id = 'via-selector'
    document.body.appendChild(container)
    app = mountEmbeddableChatWidget('#via-selector', configWith(makeStreamingFetch([])), {
      defaultOpen: true,
    })
    expect(container.querySelector('[data-mol-id="embeddable-chat-panel"]')).not.toBeNull()
  })

  it('throws a clear error when the selector matches no element', () => {
    expect(() =>
      mountEmbeddableChatWidget('#does-not-exist', configWith(makeStreamingFetch([]))),
    ).toThrow(/no element found/)
  })
})
