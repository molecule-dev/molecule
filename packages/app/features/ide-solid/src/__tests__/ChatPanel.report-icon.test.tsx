// @vitest-environment jsdom
/**
 * Report affordance glyph visual-quality guard (SYN10).
 *
 * Port of `@molecule/app-ide-react/src/__tests__/ChatPanel.report-icon.test.tsx`
 * with the same test name and the same assertions. The chat header's "report a
 * bug" button must wear a real `bug` glyph from the bonded
 * `@molecule/app-icons` SVG icon set (consistent with its share/settings
 * siblings), never the ambiguous warning triangle the audit rejected, and never
 * an emoji.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { render } from 'solid-js/web'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { ChatConfig, ChatMessage, ChatProvider } from '@molecule/app-ai-chat'
import type { HttpClient } from '@molecule/app-http'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setIconSet } from '@molecule/app-icons'
import { HttpContext, ThemeContext } from '@molecule/app-solid'
import { ChatContext, resetChatStoresForTests } from '@molecule/app-solid/chat'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { ChatPanel } from '../components/ChatPanel.jsx'
import { buildThemeProvider } from './theme-test-provider.js'

/** A chat provider whose history resolves empty, so the panel mounts deterministically. */
function buildChatProvider(): ChatProvider {
  return {
    name: 'stub',
    sendMessage: async (): Promise<void> => {},
    abort: (): void => {},
    clearHistory: async (): Promise<void> => {},
    loadHistory: async (_config: ChatConfig): Promise<ChatMessage[]> => [],
  }
}

/** An HTTP client whose every request rejects; mounted callers catch their own. */
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
    clear: (): void => store.clear(),
    getItem: (key: string): string | null => store.get(key) ?? null,
    key: (index: number): string | null => Array.from(store.keys())[index] ?? null,
    removeItem: (key: string): void => void store.delete(key),
    setItem: (key: string, value: string): void => void store.set(key, String(value)),
  }
}

/** The mount alive right now, if any. */
const mounted: { dispose?: () => void } = {}

beforeEach(() => {
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
  // A name-keyed icon set: every glyph resolves to a real <svg><path> whose `d`
  // uniquely encodes the looked-up name, so the test can assert the report
  // button renders the `bug` glyph (never `exclamation-triangle`, never emoji).
  setIconSet(
    new Proxy(
      {},
      {
        get: (_target, name) => ({
          paths: [{ d: `glyph:${String(name)}` }],
          viewBox: '0 0 16 16',
        }),
      },
    ),
  )
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

afterEach(() => {
  mounted.dispose?.()
  mounted.dispose = undefined
  document.body.innerHTML = ''
  resetChatStoresForTests()
  setProvider(createSimpleI18nProvider())
})

describe('ChatPanel report-button glyph (SYN10)', () => {
  it('renders the real bug glyph on the report button, never the warning triangle and never an emoji', async () => {
    const container = document.createElement('div')
    document.body.appendChild(container)
    mounted.dispose = render(
      () => (
        <ThemeContext.Provider value={buildThemeProvider()}>
          <HttpContext.Provider value={buildHttpClient()}>
            <ChatContext.Provider value={buildChatProvider()}>
              <ChatPanel projectId="proj-syn10" />
            </ChatContext.Provider>
          </HttpContext.Provider>
        </ThemeContext.Provider>
      ),
      container,
    )

    const button = await vi.waitFor(() => {
      const element = container.querySelector('[data-mol-id="chat-report-button"]')
      expect(element, 'the report-a-bug button must render in the chat header').not.toBeNull()
      return element as HTMLElement
    })

    // It is a real SVG glyph, not an emoji string or text node.
    const svg = button.querySelector('svg')
    expect(svg, 'the report button must render an <svg> icon, not an emoji').not.toBeNull()
    expect(button.textContent ?? '', 'no emoji/text glyph beside the SVG').toBe('')

    // The glyph wired is the `bug` icon — not the warning triangle the audit
    // rejected. This assertion bites if anyone reverts the name.
    const d = svg?.querySelector('path')?.getAttribute('d')
    expect(d, 'the report button renders the bonded `bug` glyph').toBe('glyph:bug')
    expect(d).not.toBe('glyph:exclamation-triangle')
  })
})
