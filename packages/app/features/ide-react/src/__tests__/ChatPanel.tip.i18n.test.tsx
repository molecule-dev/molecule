// @vitest-environment jsdom

/**
 * The auto tips are translated AT RENDER, not when they are queued.
 *
 * A tip entry stores its definition ({@link TipDef}); the timeline render
 * calls `tipText(t, tip, { agentName })` — the literal-key translator in
 * `@molecule/app-ide-panel-logic`. With a
 * marker translator whose text names the locale, a locale switch after the tip
 * was queued must change the rendered text — a tip whose sentence was captured
 * into state at queue time would keep the old language here (the defect the
 * en-XA conformance snapshot caught: "Tip: type / …" stayed plain English
 * through a locale switch).
 *
 * @module
 */

import { act, cleanup, render, waitFor } from '@testing-library/react'
import type { ReactElement, ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { ChatMessage, ChatProvider } from '@molecule/app-ai-chat'
import type { HttpClient } from '@molecule/app-http'
import {
  createSimpleI18nProvider,
  type I18nProvider as I18nProviderContract,
} from '@molecule/app-i18n'
import { setIconSet } from '@molecule/app-icons'
import { HttpProvider, I18nProvider, ThemeProvider } from '@molecule/app-react'
import {
  ChatProvider as ChatContextProvider,
  resetChatStoresForTests,
} from '@molecule/app-react/chat'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { ChatPanel } from '../components/ChatPanel.js'
import { buildThemeProvider } from './theme-test-provider.js'

/** A second locale the marker translator can switch to. */
const MARKER_LOCALE = 'xx'

/**
 * A provider whose `t` returns `⟦<locale>|<key>⟧` — a marker that names both the
 * locale and the key, so a test can prove WHICH key rendered and that a locale
 * switch re-translated it.
 */
function buildMarkerProvider(): I18nProviderContract {
  const base = createSimpleI18nProvider('en', [
    { code: 'en', name: 'English', direction: 'ltr', translations: {} },
    { code: MARKER_LOCALE, name: 'Marker', direction: 'ltr', translations: {} },
  ])
  return {
    ...base,
    t: (key) => `⟦${base.getLocale()}|${key}⟧`,
  }
}

/** A chat provider whose history resolves empty → a fresh, deterministic mount. */
function buildChatProvider(history: ChatMessage[] = []): ChatProvider {
  return {
    name: 'stub',
    sendMessage: async (_message, _config, onEvent): Promise<void> => {
      onEvent({ type: 'done' })
    },
    sendSideMessage: async (_message, _config, onEvent): Promise<void> => {
      onEvent({ type: 'done' })
    },
    abort: (): void => {},
    clearHistory: async (): Promise<void> => {},
    loadHistory: async (_config): Promise<ChatMessage[]> => history,
  }
}

/** An HTTP client whose every request rejects; the mounted callers catch their own. */
function buildHttpClient(): HttpClient {
  const reject = (): Promise<never> => Promise.reject(new Error('http disabled in test'))
  return {
    baseURL: '',
    defaultHeaders: {},
    request: reject,
    get: reject,
    post: reject,
    put: reject,
    patch: reject,
    delete: reject,
    addRequestInterceptor: () => () => {},
    addResponseInterceptor: () => () => {},
    addErrorInterceptor: () => () => {},
    setAuthToken: () => {},
    getAuthToken: () => null,
    onAuthError: () => () => {},
  }
}

/** A working in-memory Storage (Node's experimental web-storage shadows jsdom's). */
function makeStorage(): Storage {
  const store = new Map<string, string>()
  return {
    get length(): number {
      return store.size
    },
    clear(): void {
      store.clear()
    },
    getItem(key: string): string | null {
      const value = store.get(key)
      return value === undefined ? null : value
    },
    key(index: number): string | null {
      return Array.from(store.keys())[index] ?? null
    },
    removeItem(key: string): void {
      store.delete(key)
    },
    setItem(key: string, value: string): void {
      store.set(key, String(value))
    },
  }
}

/** Renders the panel under the marker provider; returns the provider for switches. */
function renderPanel(
  provider: I18nProviderContract,
  props: { canEdit?: boolean } = {},
): ReactElement {
  const wrap = (children: ReactNode): ReactElement => (
    <I18nProvider provider={provider}>
      <ThemeProvider provider={buildThemeProvider()}>
        <HttpProvider client={buildHttpClient()}>
          <ChatContextProvider provider={buildChatProvider()}>{children}</ChatContextProvider>
        </HttpProvider>
      </ThemeProvider>
    </I18nProvider>
  )
  return wrap(<ChatPanel projectId="proj-i18n" agentName="Synthase" {...props} />)
}

/** The tip card's text, once it is on screen. */
async function tipText(container: HTMLElement): Promise<string> {
  return waitFor(() => {
    const el = container.querySelector('[data-mol-id="chat-tip-card"]')
    expect(el, 'the tip card must be mounted').not.toBeNull()
    return el!.textContent ?? ''
  })
}

beforeEach(() => {
  setClassMap(classMap)
  setIconSet(new Proxy({}, { get: () => ({ paths: [], viewBox: '0 0 16 16' }) }))
  resetChatStoresForTests()
  Object.defineProperty(globalThis, 'localStorage', {
    value: makeStorage(),
    configurable: true,
    writable: true,
  })
  Object.defineProperty(globalThis, 'sessionStorage', {
    value: makeStorage(),
    configurable: true,
    writable: true,
  })
  Element.prototype.scrollIntoView = (): void => {}
})

afterEach(cleanup)

describe('ChatPanel tips are translated at render (marker translator)', () => {
  it('renders the entry tip through ide.chat.tip.getStarted', async () => {
    const provider = buildMarkerProvider()
    const { container } = render(renderPanel(provider))

    const text = await tipText(container)
    expect(text).toContain('⟦en|ide.chat.tip.getStarted⟧')
    // The English sentence is the tip's default, not what the marker renders.
    expect(text).not.toContain('to work from')
  })

  it('re-translates the queued entry tip after a locale switch', async () => {
    const provider = buildMarkerProvider()
    const { container } = render(renderPanel(provider))
    await tipText(container)

    await act(async () => {
      await provider.setLocale(MARKER_LOCALE)
    })

    await waitFor(() => {
      const el = container.querySelector('[data-mol-id="chat-tip-card"]')
      expect(el?.textContent ?? '').toContain(`⟦${MARKER_LOCALE}|ide.chat.tip.getStarted⟧`)
    })
  })

  it('renders and re-translates the viewer tip through ide.chat.tip.viewerTeamOnly', async () => {
    const provider = buildMarkerProvider()
    const { container } = render(renderPanel(provider, { canEdit: false }))

    await waitFor(() => {
      const els = Array.from(container.querySelectorAll('[data-mol-id="chat-tip-card"]'))
      expect(
        els.some((e) => (e.textContent ?? '').includes('⟦en|ide.chat.tip.viewerTeamOnly⟧')),
        'the viewer orientation tip must render through its key',
      ).toBe(true)
    })

    await act(async () => {
      await provider.setLocale(MARKER_LOCALE)
    })

    await waitFor(() => {
      const els = Array.from(container.querySelectorAll('[data-mol-id="chat-tip-card"]'))
      expect(
        els.some((e) =>
          (e.textContent ?? '').includes(`⟦${MARKER_LOCALE}|ide.chat.tip.viewerTeamOnly⟧`),
        ),
      ).toBe(true)
    })
  })
})
