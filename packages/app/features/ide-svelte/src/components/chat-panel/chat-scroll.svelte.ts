/**
 * React's three `chat:scroll` regions of ChatPanel.tsx: the messages
 * container's refs and the visible-item window (older history mounts in as the
 * user scrolls near the top), the anchor that keeps the viewport still across a
 * prepend, the scroll listener, the debounced auto-scroll, the resize re-pin
 * and the mount settle window.
 *
 * The refs are plain `{ current }` objects, exactly as React's `useRef` — the
 * scroll listener reads them outside the reactive system, and nothing
 * re-renders from a scroll. Only `maxVisibleItems` is React state, so it is a
 * `$state` cell; every effect keeps React's position in the effect order.
 *
 * @module
 */

import { LOAD_EARLIER_THRESHOLD_PX } from '@molecule/app-ide-panel-logic'

import type { ChatSetState } from './chat-popups.svelte.js'
import type { ChatContext, MutableRef } from './context.svelte.js'

/** The identifiers other slices and sections read from the `chat:scroll` slice. */
export interface ChatScrollSlice {
  /** The visible-window cap on timeline items. */
  readonly maxVisibleItems: number
  /** Raises the cap (load earlier). */
  readonly setMaxVisibleItems: ChatSetState<number>
  /** The bottom sentinel (scroll-to-end anchor). */
  readonly messagesEndRef: MutableRef<HTMLDivElement | null>
  /** The messages container (the scrolling element). */
  readonly messagesContainerRef: MutableRef<HTMLDivElement | null>
  /** Whether the user has scrolled away from the bottom. */
  readonly userScrolledUpRef: MutableRef<boolean>
  /** Reports whether older items exist above the window. */
  readonly hasHiddenEarlierRef: MutableRef<(() => boolean) | null>

  /** React's mount I/O for the region: none — it declares state and refs. */
  mount(): void

  /** React's `#effect chat:scroll:<n>` entry points, at React's positions. */
  readonly effects: { 1: () => void; 2: () => void; 3: () => void; 4: () => void; 5: () => void }
}

/**
 * Resolves React's `SetStateAction<T>` argument against the latest value.
 *
 * @param previous - The latest value.
 * @param value - The React setter argument: a value or an updater.
 * @returns The next value.
 */
function resolveState<T>(previous: T, value: T | ((previous: T) => T)): T {
  return typeof value === 'function' ? (value as (previous: T) => T)(previous) : value
}

/**
 * Creates the `chat:scroll` slice.
 *
 * @param ctx - The shared chat context (the transcript and commit cards the
 *   auto-scroll watches).
 * @returns The scroll slice: the refs, the item window and React's five effects.
 */
export function createChatScroll(ctx: ChatContext): ChatScrollSlice {
  /**
   * Number of timeline items rendered in the DOM. Starts at the most recent
   * page and grows as the user scrolls toward the top of the conversation
   * (auto-load of earlier history — no button to click).
   */
  let maxVisibleItems = $state(60)

  /**
   * Sets the rendered item count, in React's `setState` shape.
   *
   * @param value - The new count, or an updater of the previous count.
   */
  const setMaxVisibleItems: ChatSetState<number> = (value): void => {
    maxVisibleItems = resolveState(maxVisibleItems, value)
  }

  /** React's `messagesEndRef` — the bottom sentinel. */
  const messagesEndRef: MutableRef<HTMLDivElement | null> = { current: null }
  /** React's `messagesContainerRef` — the scrolling element. */
  const messagesContainerRef: MutableRef<HTMLDivElement | null> = { current: null }
  /** React's `userScrolledUpRef` — whether the user left the bottom. */
  const userScrolledUpRef: MutableRef<boolean> = { current: false }

  /** scrollHeight captured when a page load was triggered; consumed by effect 1. */
  const pendingAnchorHeightRef: MutableRef<number | null> = { current: null }
  /**
   * Whether older items are currently held back: filled once, where the
   * timeline exists, with a stable callback that reads the latest committed
   * timeline.
   */
  const hasHiddenEarlierRef: MutableRef<(() => boolean) | null> = { current: null }

  /** The debounced auto-scroll's pending timer. */
  const scrollTimerRef: MutableRef<ReturnType<typeof setTimeout> | null> = { current: null }

  return {
    get maxVisibleItems(): number {
      return maxVisibleItems
    },
    setMaxVisibleItems,
    messagesEndRef,
    messagesContainerRef,
    userScrolledUpRef,
    hasHiddenEarlierRef,
    mount(): void {
      // React's region declares state and refs and no mount work of its own.
    },
    effects: {
      1: (): void => {
        // Keeps the viewport still across a prepend. Native scroll anchoring is
        // disabled on the container (overflowAnchor: 'none') so this is the only
        // mechanism adjusting the offset — otherwise both would fire and
        // double-jump. Reads the new DOM (the prepended page is mounted) exactly
        // where React's `useLayoutEffect` runs. Svelte's `$effect` (not
        // `$effect.pre`) is the post-DOM hook that matches that point: `$effect.pre`
        // runs before the prepended page is in the DOM, so scrollHeight is still the
        // old one and scrollTop never moves (verified against the React scroll test).
        $effect(() => {
          // Read so a page load re-runs the effect as React's dependency does.
          const limit = maxVisibleItems
          void limit
          const anchor = pendingAnchorHeightRef.current
          if (anchor === null) return
          pendingAnchorHeightRef.current = null
          const el = messagesContainerRef.current
          if (!el) return
          el.scrollTop += el.scrollHeight - anchor
        })
      },
      2: (): void => {
        // "Should we stick to the bottom?" — derived ONLY from the actual scroll
        // position after a scroll event, never from touch direction or content
        // size. A streaming burst GROWS the content (scrollHeight rises) WITHOUT
        // firing `scroll`, so only a real move of the viewport is read here.
        $effect(() => {
          const el = messagesContainerRef.current
          if (!el) return
          const onScroll = (): void => {
            userScrolledUpRef.current = el.scrollHeight - el.scrollTop - el.clientHeight > 80
            // Near the top with older history held back: mount the next page in. The
            // anchor effect above keeps the viewport still across the prepend.
            if (el.scrollTop <= LOAD_EARLIER_THRESHOLD_PX && hasHiddenEarlierRef.current?.()) {
              pendingAnchorHeightRef.current = el.scrollHeight
              setMaxVisibleItems((n) => n + 40)
            }
          }
          el.addEventListener('scroll', onScroll, { passive: true })
          return () => el.removeEventListener('scroll', onScroll)
        })
      },
      3: (): void => {
        // Debounced to batch rapid streaming updates. Uses direct scrollTop
        // assignment instead of scrollIntoView to avoid smooth-scroll animation
        // timing issues (intermediate onScroll events, unpredictable animation
        // duration). Skipped when the user has scrolled up via wheel/touch.
        $effect(() => {
          // Read so a message or card change re-runs the effect as React's
          // dependency array does, even when the guard below returns.
          void ctx.chat.messages
          void ctx.git.commitCards
          if (userScrolledUpRef.current) return
          if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current)
          scrollTimerRef.current = setTimeout(() => {
            scrollTimerRef.current = null
            const el = messagesContainerRef.current
            if (el) el.scrollTop = el.scrollHeight
          }, 80)
        })
      },
      4: (): void => {
        // Re-pin to the bottom when the messages container RESIZES, not just when
        // messages change. A layout change that shrinks/grows the pane — the
        // boot→IDE swap, the mobile soft keyboard opening/closing, an orientation
        // change — leaves the scroll offset stale. Guarded by the same
        // userScrolledUp intent so it never yanks a user reading history.
        $effect(() => {
          const el = messagesContainerRef.current
          if (!el || typeof ResizeObserver === 'undefined') return
          const ro = new ResizeObserver(() => {
            if (userScrolledUpRef.current) return
            el.scrollTop = el.scrollHeight
          })
          ro.observe(el)
          return () => ro.disconnect()
        })
      },
      5: (): void => {
        // Land at the latest message on MOUNT, after layout settles. A fresh
        // mount has no legitimate "scrolled up" state to preserve, so force the
        // bottom across the settle window (double-rAF + a post-transition
        // follow-up) and clear that flag.
        $effect(() => {
          const toBottom = (): void => {
            userScrolledUpRef.current = false
            const el = messagesContainerRef.current
            if (el) el.scrollTop = el.scrollHeight
          }
          const raf = requestAnimationFrame(() => requestAnimationFrame(toBottom))
          const t = setTimeout(toBottom, 400)
          return () => {
            cancelAnimationFrame(raf)
            clearTimeout(t)
          }
        })
      },
    },
  }
}
