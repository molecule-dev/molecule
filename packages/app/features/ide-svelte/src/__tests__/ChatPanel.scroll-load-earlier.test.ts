// @vitest-environment jsdom
/**
 * Seamless history paging — scrolling up loads earlier messages.
 *
 * A port of
 * `@molecule/app-ide-react/src/__tests__/ChatPanel.scroll-load-earlier.test.tsx`
 * with the same test names and the same assertions: the timeline only mounts
 * the most recent page of items, and a scroll event near the top of the
 * messages container mounts the rest in AND anchors the scroll offset so the
 * reading place does not jump. A second top scroll after everything is shown
 * must be a no-op (no loop), and the old "Show earlier messages" button is
 * gone. The container's scroll geometry is stubbed with a getter tied to the
 * number of mounted children — prepending items raises `scrollHeight`, exactly
 * like real layout — so the anchor math is exercised against live values.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { ChatConfig, ChatMessage, ChatProvider } from '@molecule/app-ai-chat'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setIconSet } from '@molecule/app-icons'
import { resetChatStoresForTests } from '@molecule/app-svelte/chat'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import {
  buildRejectingHttpClient,
  flush,
  makeStorage,
  mountPanel,
  type PanelMount,
} from './chat-panel-harness.js'

const HISTORY_SIZE = 100

/**
 * A chat provider whose history is 100 plain user messages — long enough to
 * page.
 *
 * @returns The stub chat provider.
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
 * Polls `predicate` until it stops throwing.
 *
 * @param predicate - The assertion to retry.
 * @param timeout - How long to keep trying, in ms.
 * @returns A promise resolved once the predicate passes.
 */
async function waitFor(predicate: () => void, timeout = 2000): Promise<void> {
  const started = Date.now()
  for (;;) {
    try {
      predicate()
      return
    } catch (error) {
      if (Date.now() - started > timeout) throw error
      await new Promise((resolve) => setTimeout(resolve, 10))
      await flush()
    }
  }
}

/** The mount alive right now, if any. */
let mounted: PanelMount | null = null

/**
 * Mounts the panel on a long history.
 *
 * @returns The mount container.
 */
function mountLongHistoryChatPanel(): HTMLElement {
  mounted?.unmount()
  mounted = mountPanel({
    http: buildRejectingHttpClient(),
    chat: buildChatProvider(),
    projectId: 'proj-scroll-paging',
    props: { agentName: 'Synthase' },
  })
  return mounted.container
}

/**
 * Installed per container: live scroll metrics that grow with mounted children.
 *
 * @param container - The panel container.
 * @returns The mutable scroll-offset state.
 */
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

/**
 * The number of user-message rows currently mounted.
 *
 * @param container - The panel container.
 * @returns The count.
 */
const renderedUserMessageCount = (container: HTMLElement): number =>
  container.querySelectorAll('[data-mol-id="chat-user-message"]').length

describe('ChatPanel seamless history paging (scroll up loads earlier messages)', () => {
  /**
   * Scrolls to the top and waits for the next page to mount, once.
   *
   * @param container - The panel container.
   * @param scroller - The messages scroller.
   * @param scrollTop - The mutable scroll-offset state.
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
    await waitFor(() => {
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
   * @param container - The panel container.
   * @returns The scroller and its scroll-offset state.
   */
  async function scrollToLoadAll(
    container: HTMLElement,
  ): Promise<{ scroller: HTMLElement; scrollTop: { scrollTop: number } }> {
    const scroller = container.querySelector('[role="log"]') as HTMLElement
    const scrollTop = stubScrollGeometry(container)
    // Let the mount settle window pass first.
    await new Promise((resolve) => setTimeout(resolve, 500))
    for (let guard = 0; guard < 6; guard++) {
      const before = renderedUserMessageCount(container)
      if (before >= HISTORY_SIZE) return { scroller, scrollTop }
      await scrollUpOnePage(container, scroller, scrollTop, before)
    }
    throw new Error(`history never fully mounted: ${renderedUserMessageCount(container)} shown`)
  }

  it('mounts the older pages while scrolling up, anchored, with no button', async () => {
    const container = mountLongHistoryChatPanel()

    // Initial page: the most recent ~60 timeline items — but never the whole
    // history, and no button.
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
    const container = mountLongHistoryChatPanel()

    await waitFor(() => {
      const n = renderedUserMessageCount(container)
      expect(n).toBeGreaterThan(0)
      expect(n).toBeLessThanOrEqual(60)
    })

    const { scroller, scrollTop } = await scrollToLoadAll(container)
    expect(renderedUserMessageCount(container)).toBe(HISTORY_SIZE)

    // Still at the top with nothing held back: the same scroll must not retrigger.
    scrollTop.scrollTop = 0
    scroller.dispatchEvent(new Event('scroll'))
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(renderedUserMessageCount(container)).toBe(HISTORY_SIZE)
  })
})

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
  mounted?.unmount()
  mounted = null
  document.body.innerHTML = ''
  resetChatStoresForTests()
  setProvider(createSimpleI18nProvider())
})
