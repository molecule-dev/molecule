// @vitest-environment jsdom
/**
 * Seamless history paging — scrolling up loads earlier messages.
 *
 * Port of
 * `@molecule/app-ide-react/src/__tests__/ChatPanel.scroll-load-earlier.test.tsx`
 * with the same test names and the same assertions. The timeline only mounts
 * the most recent page of items. With 100 history messages, a scroll event near
 * the top of the messages container must mount the rest in AND anchor the
 * scroll offset so the reading place does not jump, and the old "Show earlier
 * messages" button must be gone. A second top scroll after everything is shown
 * must be a no-op (no loop).
 *
 * The container's scroll geometry is stubbed with a getter tied to the number
 * of mounted children — prepending items raises `scrollHeight`, exactly like
 * real layout.
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

const HISTORY_SIZE = 100

/** A chat provider whose history is 100 plain user messages — long enough to page. */
function buildChatProvider(): ChatProvider {
  return {
    name: 'stub',
    sendMessage: async (): Promise<void> => {},
    abort: (): void => {},
    clearHistory: async (): Promise<void> => {},
    loadHistory: async (_config: ChatConfig): Promise<ChatMessage[]> =>
      Array.from({ length: HISTORY_SIZE }, (_, index) => ({
        id: `hist-${index}`,
        role: 'user' as const,
        content: `History message ${index}`,
        timestamp: 1_700_000_000_000 - index * 60_000,
      })),
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
    clear: (): void => store.clear(),
    getItem: (key: string): string | null => store.get(key) ?? null,
    key: (index: number): string | null => Array.from(store.keys())[index] ?? null,
    removeItem: (key: string): void => void store.delete(key),
    setItem: (key: string, value: string): void => void store.set(key, String(value)),
  }
}

/** The mount alive right now. */
const mounted: { dispose?: () => void } = {}

beforeEach(() => {
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
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

afterEach(() => {
  mounted.dispose?.()
  mounted.dispose = undefined
  document.body.innerHTML = ''
  resetChatStoresForTests()
  setProvider(createSimpleI18nProvider())
})

/**
 * Mounts {@link ChatPanel} on the long history.
 *
 * @returns The mount container.
 */
function renderLongHistoryChatPanel(): HTMLElement {
  mounted.dispose?.()
  document.body.innerHTML = ''
  const container = document.createElement('div')
  document.body.appendChild(container)
  mounted.dispose = render(
    () => (
      <ThemeContext.Provider value={buildThemeProvider()}>
        <HttpContext.Provider value={buildHttpClient()}>
          <ChatContext.Provider value={buildChatProvider()}>
            <ChatPanel projectId="proj-scroll-paging" agentName="Synthase" />
          </ChatContext.Provider>
        </HttpContext.Provider>
      </ThemeContext.Provider>
    ),
    container,
  )
  return container
}

/** Installed per container: live scroll metrics that grow with mounted children. */
function stubScrollGeometry(container: HTMLElement): { scrollTop: number } {
  const scroller = container.querySelector('[role="log"]') as HTMLElement
  if (!scroller) throw new Error('messages container ([role="log"]) not found')
  // 120px per mounted child — arbitrary but monotone: a prepend ALWAYS grows
  // scrollHeight, which is the only property the anchor math needs.
  Object.defineProperty(scroller, 'scrollHeight', {
    get: () => scroller.children.length * 120,
    configurable: true,
  })
  Object.defineProperty(scroller, 'clientHeight', {
    value: 800,
    configurable: true,
  })
  const state = { scrollTop: 8000 }
  Object.defineProperty(scroller, 'scrollTop', {
    get: () => state.scrollTop,
    set: (value: number) => {
      state.scrollTop = value
    },
    configurable: true,
  })
  return state
}

/** How many user-message rows are currently mounted. */
const renderedUserMessageCount = (container: HTMLElement): number =>
  container.querySelectorAll('[data-mol-id="chat-user-message"]').length

describe('ChatPanel seamless history paging (scroll up loads earlier messages)', () => {
  /**
   * Scrolls to the top and waits for the next page to mount, once.
   *
   * @param container - The mount container.
   * @param scroller - The messages container.
   * @param scrollState - The stubbed scroll position.
   * @param before - The mounted message count before this scroll.
   */
  async function scrollUpOnePage(
    container: HTMLElement,
    scroller: HTMLElement,
    scrollState: { scrollTop: number },
    before: number,
  ): Promise<void> {
    const heightBefore = scroller.scrollHeight
    scrollState.scrollTop = 0
    scroller.dispatchEvent(new Event('scroll'))
    await vi.waitFor(() => {
      expect(renderedUserMessageCount(container)).toBeGreaterThan(before)
    })
    // Anchored: the offset moved down by exactly the prepended content's height.
    expect(scrollState.scrollTop).toBe(scroller.scrollHeight - heightBefore)
    expect(scrollState.scrollTop).toBeGreaterThan(0)
  }

  /**
   * Scrolls up repeatedly until the whole history is mounted.
   *
   * @param container - The mount container.
   * @returns The scroller and its stubbed scroll position.
   */
  async function scrollToLoadAll(
    container: HTMLElement,
  ): Promise<{ scroller: HTMLElement; scrollState: { scrollTop: number } }> {
    const scroller = container.querySelector('[role="log"]') as HTMLElement
    const scrollState = stubScrollGeometry(container)
    // Let the mount settle window pass first — a real user cannot reach the
    // top inside it either.
    await new Promise((resolve) => setTimeout(resolve, 500))
    for (let guard = 0; guard < 6; guard++) {
      const before = renderedUserMessageCount(container)
      if (before >= HISTORY_SIZE) return { scroller, scrollState }
      await scrollUpOnePage(container, scroller, scrollState, before)
    }
    throw new Error(`history never fully mounted: ${renderedUserMessageCount(container)} shown`)
  }

  it('mounts the older pages while scrolling up, anchored, with no button', async () => {
    const container = renderLongHistoryChatPanel()

    // Initial page: the most recent ~60 timeline items — never the whole
    // history, and no button.
    await vi.waitFor(() => {
      const count = renderedUserMessageCount(container)
      expect(count).toBeGreaterThan(0)
      expect(count).toBeLessThanOrEqual(60)
    })
    expect(container.querySelector('[data-mol-id="chat-show-earlier"]')).toBeNull()

    // The user keeps dragging up: each top scroll mounts the next older page,
    // anchored, until everything is in.
    await scrollToLoadAll(container)
    expect(renderedUserMessageCount(container)).toBe(HISTORY_SIZE)

    // No "Show earlier messages" button ever existed on this surface.
    expect(container.querySelector('[data-mol-id="chat-show-earlier"]')).toBeNull()
  })

  it('does not loop once every item is mounted — a further top scroll is a no-op', async () => {
    const container = renderLongHistoryChatPanel()

    await vi.waitFor(() => {
      const count = renderedUserMessageCount(container)
      expect(count).toBeGreaterThan(0)
      expect(count).toBeLessThanOrEqual(60)
    })

    const { scroller, scrollState } = await scrollToLoadAll(container)
    expect(renderedUserMessageCount(container)).toBe(HISTORY_SIZE)

    // Still at the top with nothing held back: the same scroll must not retrigger.
    scrollState.scrollTop = 0
    scroller.dispatchEvent(new Event('scroll'))
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(renderedUserMessageCount(container)).toBe(HISTORY_SIZE)
  })
})
