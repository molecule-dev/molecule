// @vitest-environment jsdom

/**
 * Seamless history paging — scrolling up loads earlier messages.
 *
 * The timeline only mounts the most recent page of items. This is a real jsdom
 * render of the actual {@link ChatPanel} (not a grep — the API-only anti-pattern
 * is exactly how UI gaps ship green): with 100 history messages, a scroll event
 * near the top of the messages container must mount the rest in AND anchor the
 * scroll offset so the reading place does not jump, and the old "Show earlier
 * messages" button must be gone. A second top scroll after everything is shown
 * must be a no-op (no loop).
 *
 * The container's scroll geometry is stubbed with a getter tied to the number of
 * mounted children — prepending items raises `scrollHeight`, exactly like real
 * layout — so the anchor math (`scrollTop += scrollHeight - captured`) is
 * exercised against live values.
 *
 * @module
 */

import { render, waitFor } from '@testing-library/react'
import type { ReactElement, ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { ChatConfig, ChatMessage, ChatProvider } from '@molecule/app-ai-chat'
import type { HttpClient } from '@molecule/app-http'
import { createSimpleI18nProvider } from '@molecule/app-i18n'
import { setIconSet } from '@molecule/app-icons'
import {
  ChatProvider as ChatContextProvider,
  HttpProvider,
  I18nProvider,
  resetChatStoresForTests,
  ThemeProvider,
} from '@molecule/app-react'
import type { Theme, ThemeProvider as ThemeProviderType } from '@molecule/app-theme'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { ChatPanel } from '../components/ChatPanel.js'

const HISTORY_SIZE = 100

/** A chat provider whose history is 100 plain user messages — long enough to page. */
function buildChatProvider(): ChatProvider {
  return {
    name: 'stub',
    sendMessage: async (): Promise<void> => {},
    abort: (): void => {},
    clearHistory: async (): Promise<void> => {},
    loadHistory: async (_config: ChatConfig): Promise<ChatMessage[]> =>
      Array.from({ length: HISTORY_SIZE }, (_, i) => ({
        id: `hist-${i}`,
        role: 'user' as const,
        content: `History message ${i}`,
        timestamp: 1_700_000_000_000 - i * 60_000,
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
  }
}

/** A minimal light theme so `useThemeMode` resolves. */
function buildThemeProvider(): ThemeProviderType {
  const theme: Theme = {
    name: 'light',
    mode: 'light',
    colors: {
      background: { primary: '#ffffff' },
      text: { primary: '#000000' },
      brand: { primary: '#0066cc' },
      semantic: { success: '#00cc00' },
      borders: { default: '#cccccc' },
      overlay: { default: 'rgba(0,0,0,0.5)' },
      shadow: { default: 'rgba(0,0,0,0.1)' },
    },
    breakpoints: {
      mobileS: '320px',
      mobileM: '375px',
      mobileL: '425px',
      tablet: '768px',
      laptop: '1024px',
      laptopL: '1440px',
      desktop: '2560px',
    },
    spacing: {},
    typography: { fontFamily: {}, fontSize: {}, fontWeight: {}, lineHeight: {} },
    borderRadius: {},
    shadows: {},
    transitions: {},
    zIndex: {},
  }
  return {
    getTheme: () => theme,
    getThemeName: () => 'light',
    getThemes: () => ['light', 'dark'],
    setTheme: () => {},
    toggleMode: () => {},
    onThemeChange: () => () => {},
  }
}

/** Renders {@link ChatPanel} inside the contexts it needs, on a long history. */
function renderLongHistoryChatPanel(): ReactElement {
  const wrap = (children: ReactNode): ReactElement => (
    <I18nProvider provider={createSimpleI18nProvider('en')}>
      <ThemeProvider provider={buildThemeProvider()}>
        <HttpProvider client={buildHttpClient()}>
          <ChatContextProvider provider={buildChatProvider()}>{children}</ChatContextProvider>
        </HttpProvider>
      </ThemeProvider>
    </I18nProvider>
  )
  return wrap(<ChatPanel projectId="proj-scroll-paging" agentName="Synthase" />)
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
    set: (v: number) => {
      state.scrollTop = v
    },
    configurable: true,
  })
  return state
}

const renderedUserMessageCount = (container: HTMLElement): number =>
  container.querySelectorAll('[data-mol-id="chat-user-message"]').length

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

afterEach(() => {
  document.body.innerHTML = ''
})

describe('ChatPanel seamless history paging (scroll up loads earlier messages)', () => {
  /**
   * Scrolls to the top and waits for the next page to mount, once. Returns the
   * page's mounted growth. (A trailing tip card can occupy window slots, so a
   * page of 40 may reveal fewer than 40 user messages — growth, not page size,
   * is the assertion.)
   */
  async function scrollUpOnePage(
    container: HTMLElement,
    scroller: HTMLElement,
    scrollTop: { scrollTop: number },
    before: number,
  ): Promise<void> {
    const heightBefore = scroller.scrollHeight
    scrollTop.scrollTop = 0
    scroller.dispatchEvent(new Event('scroll'))
    await waitFor(() => {
      expect(renderedUserMessageCount(container)).toBeGreaterThan(before)
    })
    // Anchored: the offset moved down by exactly the prepended content's height,
    // so the message that was at the top of the viewport is still there.
    expect(scrollTop.scrollTop).toBe(scroller.scrollHeight - heightBefore)
    expect(scrollTop.scrollTop).toBeGreaterThan(0)
  }

  /** Scrolls up repeatedly until the whole history is mounted. */
  async function scrollToLoadAll(
    container: HTMLElement,
  ): Promise<{ scroller: HTMLElement; scrollTop: { scrollTop: number } }> {
    const scroller = container.querySelector('[role="log"]') as HTMLElement
    const scrollTop = stubScrollGeometry(container)
    // Let the mount settle window (the delayed force-to-bottom, ≤400ms) pass
    // first — a real user cannot reach the top inside it either.
    await new Promise((resolve) => setTimeout(resolve, 500))
    for (let guard = 0; guard < 6; guard++) {
      const before = renderedUserMessageCount(container)
      if (before >= HISTORY_SIZE) return { scroller, scrollTop }
      await scrollUpOnePage(container, scroller, scrollTop, before)
    }
    throw new Error(`history never fully mounted: ${renderedUserMessageCount(container)} shown`)
  }

  it('mounts the older pages while scrolling up, anchored, with no button', async () => {
    const { container } = render(renderLongHistoryChatPanel())

    // Initial page: the most recent ~60 timeline items (a trailing tip card can
    // sit inside the window, so the exact count is not pinned) — but never the
    // whole history, and no button.
    await waitFor(() => {
      const n = renderedUserMessageCount(container)
      expect(n).toBeGreaterThan(0)
      expect(n).toBeLessThanOrEqual(60)
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
    const { container } = render(renderLongHistoryChatPanel())

    await waitFor(() => {
      const n = renderedUserMessageCount(container)
      expect(n).toBeGreaterThan(0)
      expect(n).toBeLessThanOrEqual(60)
    })

    const { scroller, scrollTop } = await scrollToLoadAll(container)
    expect(renderedUserMessageCount(container)).toBe(HISTORY_SIZE)

    // Still at the top with nothing held back: the same scroll must not retrigger
    // (each page load monotonically grows maxVisibleItems; the trigger is gated
    // on items actually being hidden).
    scrollTop.scrollTop = 0
    scroller.dispatchEvent(new Event('scroll'))
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(renderedUserMessageCount(container)).toBe(HISTORY_SIZE)
  })
})
