// @vitest-environment jsdom
/**
 * The auto tips are translated AT RENDER, not when they are queued — the Solid
 * port of `@molecule/app-ide-react/src/__tests__/ChatPanel.tip.i18n.test.tsx`,
 * with the same test names and the same assertions.
 *
 * A tip entry stores its definition (`TipDef`); the render calls
 * `tipText(t, tip, { agentName })` — the literal-key translator in
 * `@molecule/app-ide-panel-logic`. With a marker translator whose text names the
 * locale, a locale switch after the tip was queued must change the rendered
 * text — a tip whose sentence was captured into state at queue time would keep
 * the old language here.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { render } from 'solid-js/web'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { ChatConfig, ChatMessage, ChatProvider } from '@molecule/app-ai-chat'
import type { HttpClient } from '@molecule/app-http'
import {
  createSimpleI18nProvider,
  type I18nProvider as I18nProviderContract,
  setProvider,
} from '@molecule/app-i18n'
import { setIconSet } from '@molecule/app-icons'
import { HttpContext, ThemeContext } from '@molecule/app-solid'
import { resetAIModelsCache } from '@molecule/app-solid/ai-models'
import { ChatContext, resetChatStoresForTests } from '@molecule/app-solid/chat'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { ChatPanel } from '../components/ChatPanel.jsx'
import { buildThemeProvider } from './theme-test-provider.js'

/** A second locale the marker translator can switch to. */
const MARKER_LOCALE = 'xx'

/**
 * A provider whose `t` returns `⟦<locale>|<key>⟧` — a marker that names both the
 * locale and the key, so a test can prove WHICH key rendered and that a locale
 * switch re-translated it.
 *
 * @returns The marker provider.
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
    sendMessage: async (_message: string, _config: ChatConfig, onEvent): Promise<void> => {
      onEvent({ type: 'done' })
    },
    abort: (): void => {},
    clearHistory: async (): Promise<void> => {},
    loadHistory: async (_config: ChatConfig): Promise<ChatMessage[]> => history,
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
    clear: () => store.clear(),
    getItem: (key: string) => store.get(key) ?? null,
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    removeItem: (key: string) => {
      store.delete(key)
    },
    setItem: (key: string, value: string) => {
      store.set(key, String(value))
    },
  }
}

/** The mount alive right now, if any. */
const mounted: { dispose?: () => void } = {}

/**
 * Renders the panel under the given provider.
 *
 * @param props - The host props (`canEdit` drives the viewer tip).
 * @returns The mount container.
 */
function renderPanel(props: { canEdit?: boolean } = {}): HTMLElement {
  mounted.dispose?.()
  mounted.dispose = undefined
  document.body.innerHTML = ''
  const container = document.createElement('div')
  document.body.appendChild(container)
  mounted.dispose = render(
    () => (
      <ThemeContext.Provider value={buildThemeProvider()}>
        <HttpContext.Provider value={buildHttpClient()}>
          <ChatContext.Provider value={buildChatProvider()}>
            <ChatPanel projectId="proj-i18n" agentName="Synthase" {...props} />
          </ChatContext.Provider>
        </HttpContext.Provider>
      </ThemeContext.Provider>
    ),
    container,
  )
  return container
}

/** Every tip card on screen. */
function tipCards(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>('[data-mol-id="chat-tip-card"]'))
}

/**
 * The tip card's text, once it is on screen.
 *
 * @param container - The mounted container.
 * @returns The tip text.
 */
async function tipText(container: HTMLElement): Promise<string> {
  return vi.waitFor(() => {
    const cards = tipCards(container)
    expect(cards.length, 'the tip card must be mounted').toBeGreaterThan(0)
    return cards[0]!.textContent ?? ''
  })
}

beforeEach(() => {
  setClassMap(classMap)
  setIconSet(new Proxy({}, { get: () => ({ paths: [], viewBox: '0 0 16 16' }) }))
  resetChatStoresForTests()
  resetAIModelsCache()
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

afterEach(() => {
  mounted.dispose?.()
  mounted.dispose = undefined
  document.body.innerHTML = ''
  resetChatStoresForTests()
  resetAIModelsCache()
  setProvider(createSimpleI18nProvider())
})

describe('ChatPanel tips are translated at render (marker translator)', () => {
  it('renders the entry tip through ide.chat.tip.getStarted', async () => {
    setProvider(buildMarkerProvider())
    const container = renderPanel()

    const text = await tipText(container)
    expect(text).toContain('⟦en|ide.chat.tip.getStarted⟧')
    // The English sentence is the tip's default, not what the marker renders.
    expect(text).not.toContain('to work from')
  })

  it('re-translates the queued entry tip after a locale switch', async () => {
    const provider = buildMarkerProvider()
    setProvider(provider)
    const container = renderPanel()
    await tipText(container)

    await provider.setLocale(MARKER_LOCALE)

    await vi.waitFor(() => {
      expect(tipCards(container)[0]?.textContent ?? '').toContain(
        `⟦${MARKER_LOCALE}|ide.chat.tip.getStarted⟧`,
      )
    })
  })

  it('renders and re-translates the viewer tip through ide.chat.tip.viewerTeamOnly', async () => {
    const provider = buildMarkerProvider()
    setProvider(provider)
    const container = renderPanel({ canEdit: false })

    await vi.waitFor(() => {
      expect(
        tipCards(container).some((element) =>
          (element.textContent ?? '').includes('⟦en|ide.chat.tip.viewerTeamOnly⟧'),
        ),
        'the viewer orientation tip must render through its key',
      ).toBe(true)
    })

    await provider.setLocale(MARKER_LOCALE)

    await vi.waitFor(() => {
      expect(
        tipCards(container).some((element) =>
          (element.textContent ?? '').includes(`⟦${MARKER_LOCALE}|ide.chat.tip.viewerTeamOnly⟧`),
        ),
      ).toBe(true)
    })
  })
})
