// @vitest-environment jsdom
/**
 * Unit tests for the Angular `EmbeddableChatWidget` — a port of
 * `@molecule/app-embeddable-chat-widget/src/__tests__/EmbeddableChatWidget.test.tsx`:
 * the same behavioral assertions, rendered with Angular's real renderer in
 * jsdom (the same `createApplication` + `createComponent` approach the
 * conformance kit's Angular adapter uses, through the package's own
 * `mountEmbeddableChatWidget`).
 *
 * React's suite wraps the widget in an `I18nProvider`; the Angular widget
 * reads the bonded `@molecule/app-i18n` provider through the binding, so the
 * wrap is the bond. The "bare page" describe asserts the same English
 * defaults and no-throw behavior a bare third-party page gets (Angular's
 * provider-optional path resolves the same simple provider a bare page's
 * fallback auto-creates).
 *
 * @module
 */

import '@angular/compiler'
import {
  type ApplicationRef,
  ChangeDetectionStrategy,
  Component,
  createComponent,
  provideZonelessChangeDetection,
  type Type,
} from '@angular/core'
import { createApplication } from '@angular/platform-browser'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { provideDomPlacement } from '@molecule/app-angular'
import { createSimpleI18nProvider, setProvider as setI18nProvider } from '@molecule/app-i18n'

import { EmbeddableChatWidget } from '../embeddable-chat-widget.component.js'
import { mountEmbeddableChatWidget } from '../mount.js'
import type { EmbeddableChatWidgetConfig } from '../types.js'

/** The apps this suite booted, destroyed after every test. */
const mounted: ApplicationRef[] = []

afterEach(() => {
  for (const app of mounted.splice(0)) app.destroy()
  document.body.innerHTML = ''
})

/**
 * Renders the widget with the given config and returns its host container.
 *
 * @param config - Widget configuration.
 * @param defaultOpen - Optional initial expanded state.
 */
async function render(
  config: EmbeddableChatWidgetConfig,
  defaultOpen?: boolean,
): Promise<{ app: ApplicationRef; host: HTMLElement }> {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = await mountEmbeddableChatWidget(host, config, { defaultOpen })
  mounted.push(app)
  return { app, host }
}

/** Runs one zoneless change-detection pass. */
const tick = (app: ApplicationRef): void => {
  app.tick()
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

/**
 * Types a value into the composer textarea the way a user would, then runs
 * one change-detection pass.
 */
function typeMessage(host: HTMLElement, app: ApplicationRef, value: string): HTMLTextAreaElement {
  const input = host.querySelector('[data-mol-id="embeddable-chat-input"]') as HTMLTextAreaElement
  input.value = value
  input.dispatchEvent(new Event('input', { bubbles: true }))
  tick(app)
  return input
}

describe('<EmbeddableChatWidget>', () => {
  it('renders the launcher when collapsed', async () => {
    setI18nProvider(createSimpleI18nProvider('en'))
    const { host } = await render(configWith(makeStreamingFetch([])))
    tick(mounted[mounted.length - 1]!)
    expect(host.querySelector('[data-mol-id="embeddable-chat-launcher"]')).not.toBeNull()
    expect(host.querySelector('[data-mol-id="embeddable-chat-panel"]')).toBeNull()
  })

  it('expands to the panel when the launcher is clicked, and collapses again', async () => {
    setI18nProvider(createSimpleI18nProvider('en'))
    const { app, host } = await render(configWith(makeStreamingFetch([])))
    tick(app)
    const launcher = host.querySelector('[data-mol-id="embeddable-chat-launcher"]') as HTMLElement
    launcher.click()
    tick(app)
    expect(host.querySelector('[data-mol-id="embeddable-chat-panel"]')).not.toBeNull()
    expect(host.querySelector('[data-mol-id="embeddable-chat-launcher"]')).toBeNull()
    const close = host.querySelector('[data-mol-id="embeddable-chat-close"]') as HTMLElement
    close.click()
    tick(app)
    expect(host.querySelector('[data-mol-id="embeddable-chat-panel"]')).toBeNull()
    expect(host.querySelector('[data-mol-id="embeddable-chat-launcher"]')).not.toBeNull()
  })

  it('sends a message and renders streamed deltas in order', async () => {
    setI18nProvider(createSimpleI18nProvider('en'))
    const fetchImpl = makeStreamingFetch(['Hello', ', world', '!'])
    const { app, host } = await render(configWith(fetchImpl), true)
    tick(app)
    const input = typeMessage(host, app, 'Hi there')
    const send = host.querySelector('[data-mol-id="embeddable-chat-send"]') as HTMLButtonElement
    expect(input).not.toBeNull()
    send.click()
    tick(app)
    // The user message should be in the transcript.
    expect(host.querySelector('[data-mol-id="embeddable-chat-message-user"]')).not.toBeNull()
    // And the assistant message should have all three deltas concatenated.
    await vi.waitFor(async () => {
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
    const { app, host } = await render(configWith(fetchImpl), true)
    tick(app)
    typeMessage(host, app, 'fail please')
    const send = host.querySelector('[data-mol-id="embeddable-chat-send"]') as HTMLButtonElement
    send.click()
    await vi.waitFor(async () => {
      tick(app)
      const err = host.querySelector('[data-mol-id="embeddable-chat-error"]')
      expect(err).not.toBeNull()
    })
  })

  it('does not send when the input is empty', async () => {
    setI18nProvider(createSimpleI18nProvider('en'))
    const fetchImpl = makeStreamingFetch(['x'])
    const { app, host } = await render(configWith(fetchImpl), true)
    tick(app)
    const send = host.querySelector('[data-mol-id="embeddable-chat-send"]') as HTMLButtonElement
    expect(send.disabled).toBe(true)
    send.click()
    tick(app)
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('honours position=bottom-left in the launcher styles', async () => {
    setI18nProvider(createSimpleI18nProvider('en'))
    const { app, host } = await render({
      ...configWith(makeStreamingFetch([])),
      position: 'bottom-left',
    })
    tick(app)
    const launcher = host.querySelector('[data-mol-id="embeddable-chat-launcher"]') as HTMLElement
    expect(launcher.style.left).toBe('24px')
    expect(launcher.style.right).toBe('')
  })
})

describe('<EmbeddableChatWidget> on a bare page (no molecule providers)', () => {
  // NOTE: React's suite renders this describe WITHOUT an I18nProvider and
  // never calls setClassMap() — the Angular widget's provider-optional path
  // resolves the bonded simple provider, which is exactly what a bare page's
  // fallback auto-creates. The assertions are the same: no throw, English
  // default labels, inline styling only.

  it('renders the launcher without any provider and does not throw', async () => {
    const { app, host } = await render(configWith(makeStreamingFetch([])))
    tick(app)
    expect(host.querySelector('[data-mol-id="embeddable-chat-launcher"]')).not.toBeNull()
  })

  it('expands to a panel with English default labels and no provider', async () => {
    const { host } = await render(configWith(makeStreamingFetch([])), true)
    expect(host.querySelector('[data-mol-id="embeddable-chat-panel"]')).not.toBeNull()
    // Interpolated defaultValue (brandName substituted) is used with no i18n composition.
    expect(host.textContent).toContain('Chat with Acme')
    expect(host.textContent).toContain('Ask a question to get started.')
    const input = host.querySelector('[data-mol-id="embeddable-chat-input"]') as HTMLTextAreaElement
    expect(input.placeholder).toBe('Type your message…')
  })

  it('scrolls the transcript to its end once each change has rendered', async () => {
    // jsdom lays nothing out: the transcript's height is its element count, and scrollTop
    // keeps what the panel writes. React scrolls in an effect that runs after the commit, so
    // the height it reads already includes the new message.
    const proto = HTMLElement.prototype
    Object.defineProperty(proto, 'scrollHeight', {
      configurable: true,
      get(this: HTMLElement) {
        return this.querySelectorAll('*').length
      },
    })
    const scrolled = new WeakMap<HTMLElement, number>()
    Object.defineProperty(proto, 'scrollTop', {
      configurable: true,
      get(this: HTMLElement) {
        return scrolled.get(this) ?? 0
      },
      set(this: HTMLElement, value: number) {
        scrolled.set(this, value)
      },
    })
    try {
      setI18nProvider(createSimpleI18nProvider('en'))
      const { app, host } = await render(configWith(makeStreamingFetch(['Hello', ', world'])), true)
      tick(app)
      const transcript = (): HTMLElement =>
        host.querySelector('[data-mol-id="embeddable-chat-transcript"]') as HTMLElement
      typeMessage(host, app, 'Hi there')
      ;(host.querySelector('[data-mol-id="embeddable-chat-send"]') as HTMLElement).click()
      tick(app)
      expect(transcript().scrollTop).toBe(transcript().scrollHeight)
      await vi.waitFor(() => {
        expect(
          host.querySelector('[data-mol-id="embeddable-chat-message-assistant"]')?.textContent,
        ).toBe('Hello, world')
      })
      tick(app)
      expect(transcript().scrollTop).toBe(transcript().scrollHeight)
    } finally {
      Reflect.deleteProperty(proto, 'scrollHeight')
      Reflect.deleteProperty(proto, 'scrollTop')
    }
  })

  it('streams a reply on a bare page (no provider) without throwing', async () => {
    const fetchImpl = makeStreamingFetch(['Bare ', 'page ', 'works'])
    const { app, host } = await render(configWith(fetchImpl), true)
    tick(app)
    typeMessage(host, app, 'Hi')
    const send = host.querySelector('[data-mol-id="embeddable-chat-send"]') as HTMLButtonElement
    send.click()
    await vi.waitFor(async () => {
      const assistant = host.querySelector(
        '[data-mol-id="embeddable-chat-message-assistant"]',
      ) as HTMLElement
      expect(assistant.textContent).toBe('Bare page works')
    })
  })
})

describe('mountEmbeddableChatWidget', () => {
  let container: HTMLDivElement
  let app: ApplicationRef | undefined

  afterEach(() => {
    app?.destroy()
    app = undefined
    container?.remove()
  })

  it('mounts into a bare container (no providers) and renders the launcher', async () => {
    container = document.createElement('div')
    container.id = 'molecule-chat-widget'
    document.body.appendChild(container)
    app = await mountEmbeddableChatWidget(container, configWith(makeStreamingFetch([])))
    app.tick()
    expect(container.querySelector('[data-mol-id="embeddable-chat-launcher"]')).not.toBeNull()
  })

  it('accepts a CSS selector for the container', async () => {
    container = document.createElement('div')
    container.id = 'via-selector'
    document.body.appendChild(container)
    app = await mountEmbeddableChatWidget('#via-selector', configWith(makeStreamingFetch([])), {
      defaultOpen: true,
    })
    app.tick()
    expect(container.querySelector('[data-mol-id="embeddable-chat-panel"]')).not.toBeNull()
  })

  it('throws a clear error when the selector matches no element', async () => {
    await expect(
      mountEmbeddableChatWidget('#does-not-exist', configWith(makeStreamingFetch([]))),
    ).rejects.toThrow(/no element found/)
  })
})

describe('DOM placement', () => {
  it("renders React's elements with no host or capture element of its own", async () => {
    const Host = Component({
      selector: 'mol-widget-spec-host',
      standalone: true,
      imports: [EmbeddableChatWidget as Type<unknown>],
      changeDetection: ChangeDetectionStrategy.Eager,
      template: `<i>a</i><mol-embeddable-chat-widget [config]="p['config']"></mol-embeddable-chat-widget><i>b</i>`,
    })(
      class SpecHost {
        /** The props the template binds. */
        p: Record<string, unknown> = { config: configWith(makeStreamingFetch([])) }
      },
    )
    const appRef: ApplicationRef = await createApplication({
      providers: [provideZonelessChangeDetection(), provideDomPlacement()],
    })
    const ref = createComponent(Host, { environmentInjector: appRef.injector })
    const host = ref.location.nativeElement as HTMLElement
    document.body.appendChild(host)
    appRef.attachView(ref.hostView)
    appRef.tick()
    const tags = (): string[] => Array.from(host.children).map((el) => el.tagName.toLowerCase())
    // Closed: React's root is the launcher's <button>, nothing else.
    expect(tags()).toEqual(['i', 'button', 'i'])
    expect(host.querySelector('mol-embeddable-chat-widget')).toBeNull()
    expect(host.querySelector('mol-embeddable-chat-launcher')).toBeNull()
    // Open: React's root becomes the panel's <section>.
    ;(host.querySelector('[data-mol-id="embeddable-chat-launcher"]') as HTMLElement).click()
    appRef.tick()
    expect(tags()).toEqual(['i', 'section', 'i'])
    expect(host.querySelector('mol-embeddable-chat-panel')).toBeNull()
    appRef.destroy()
    host.remove()
  })
})
