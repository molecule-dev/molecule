// @vitest-environment jsdom
/**
 * Seamless history paging — scrolling up loads earlier messages.
 *
 * Port of `@molecule/app-ide-react/src/__tests__/ChatPanel.scroll-load-earlier.test.tsx`
 * with the same test names and the same assertions: the timeline only mounts
 * the most recent page of items, and a scroll event near the top mounts the
 * rest in AND anchors the scroll offset so the reading place does not jump —
 * with no "Show earlier messages" button. A second top scroll after everything
 * is shown is a no-op (no loop). The container's scroll geometry is stubbed
 * with a getter tied to the number of mounted children, so prepending items
 * raises `scrollHeight` exactly like real layout.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { ChatConfig, ChatMessage, ChatProvider } from '@molecule/app-ai-chat'
import { resetChatStoresForTests } from '@molecule/app-angular'
import { setIconSet } from '@molecule/app-icons'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import {
  buildRejectingHttpClient,
  makeStorage,
  mountPanel,
  PANEL_TEST_TIMEOUT_MS,
  type PanelMount,
} from './chat-panel-harness.js'

const HISTORY_SIZE = 100

/**
 * A chat provider whose history is 100 plain user messages — long enough to page.
 *
 * @returns The stub provider.
 */
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

/**
 * Installs live scroll metrics on the log element that grow with mounted children.
 *
 * @param container - The mount container.
 * @returns The mutable scroll offset.
 */
function stubScrollGeometry(container: HTMLElement): { scrollTop: number } {
  const scroller = container.querySelector('[role="log"]') as HTMLElement
  if (!scroller) throw new Error('messages container ([role="log"]) not found')
  // 120px per mounted item row — arbitrary but monotone: a prepend ALWAYS grows
  // scrollHeight, which is the only property the anchor math needs. The port
  // renders each row inside `data-parity-unwrap` hosts (the conformance kit's
  // convention for a wrapper React does not have), so the logical rows are
  // counted; React's log has them as direct children.
  Object.defineProperty(scroller, 'scrollHeight', {
    get: () => scroller.querySelectorAll('mol-chat-item-boundary').length * 120,
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

/** The number of rendered user-message rows. */
const renderedUserMessageCount = (container: HTMLElement): number =>
  container.querySelectorAll('[data-mol-id="chat-user-message"]').length

/** The mount alive right now, if any. */
let mounted: PanelMount | null = null

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
  mounted?.unmount()
  mounted = null
  document.body.innerHTML = ''
  resetChatStoresForTests()
})

/**
 * Mounts the panel on the long history.
 *
 * @returns The mount container.
 */
async function renderLongHistoryChatPanel(): Promise<HTMLElement> {
  mounted = await mountPanel({
    http: buildRejectingHttpClient(),
    chat: buildChatProvider(),
    props: { projectId: 'proj-scroll-paging', agentName: 'Synthase' },
  })
  return mounted.container
}

describe('ChatPanel seamless history paging (scroll up loads earlier messages)', () => {
  /**
   * Scrolls to the top and waits for the next page to mount, once. Returns the
   * page's mounted growth.
   *
   * @param container - The mount container.
   * @param scroller - The log element.
   * @param scrollTop - The live scroll offset.
   * @param before - The user-message count before the scroll.
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
    await vi.waitFor(() => {
      expect(renderedUserMessageCount(container)).toBeGreaterThan(before)
    })
    // Anchored: the offset moved down by exactly the prepended content's height,
    // so the message that was at the top of the viewport is still there.
    expect(scrollTop.scrollTop).toBe(scroller.scrollHeight - heightBefore)
    expect(scrollTop.scrollTop).toBeGreaterThan(0)
  }

  /**
   * Scrolls up repeatedly until the whole history is mounted.
   *
   * @param container - The mount container.
   * @returns The log element and live scroll offset.
   */
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

  it(
    'mounts the older pages while scrolling up, anchored, with no button',
    { timeout: PANEL_TEST_TIMEOUT_MS },
    async () => {
      const container = await renderLongHistoryChatPanel()

      // Initial page: the most recent ~60 timeline items — but never the whole
      // history, and no button.
      await vi.waitFor(() => {
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
    },
  )

  it(
    'does not loop once every item is mounted — a further top scroll is a no-op',
    { timeout: PANEL_TEST_TIMEOUT_MS },
    async () => {
      const container = await renderLongHistoryChatPanel()

      await vi.waitFor(() => {
        const n = renderedUserMessageCount(container)
        expect(n).toBeGreaterThan(0)
        expect(n).toBeLessThanOrEqual(60)
      })

      const { scroller, scrollTop } = await scrollToLoadAll(container)
      expect(renderedUserMessageCount(container)).toBe(HISTORY_SIZE)

      // Still at the top with nothing held back: the same scroll must not retrigger
      // (the trigger is gated on items actually being hidden).
      scrollTop.scrollTop = 0
      scroller.dispatchEvent(new Event('scroll'))
      await new Promise((resolve) => setTimeout(resolve, 50))
      expect(renderedUserMessageCount(container)).toBe(HISTORY_SIZE)
    },
  )
})
