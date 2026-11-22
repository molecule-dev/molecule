/**
 * `chat:scroll` — React's three `chat:scroll` regions: the messages container's
 * refs, the visible-item window (older history mounts in as the user scrolls
 * near the top) and the auto-scroll to the newest message.
 *
 * The refs are plain `{ current }` objects, exactly as React's `useRef` — the
 * scroll listener reads them outside the render, and nothing re-renders from a
 * scroll. Only `maxVisibleItems` is React state. Each effect keeps React's
 * position in the effect order: the anchor runs after the DOM has the new page
 * (`flush: 'post'`, React's layout effect), the listener, resize observer and
 * settle window run once on mount.
 *
 * @module
 */

import { onBeforeUnmount, onMounted, type Ref, ref, watch } from 'vue'

import { LOAD_EARLIER_THRESHOLD_PX } from '@molecule/app-ide-panel-logic'

import type { ChatCtx, ChatEffect, MutableRef, SetState } from './context.js'

/** What the `chat:scroll` slice exposes. */
export interface ChatScrollSlice {
  /** The messages container (the scroll port). */
  readonly messagesContainerRef: MutableRef<HTMLDivElement | null>
  /** The sentinel after the newest message. */
  readonly messagesEndRef: MutableRef<HTMLDivElement | null>
  /** Whether the user has scrolled away from the bottom. */
  readonly userScrolledUpRef: MutableRef<boolean>
  /** How many timeline items are rendered. */
  readonly maxVisibleItems: Ref<number>
  /** Sets the rendered item count. */
  readonly setMaxVisibleItems: SetState<number>
  /** Filled with "are older items hidden above?", for the load-earlier control. */
  readonly hasHiddenEarlierRef: MutableRef<(() => boolean) | null>
  /** The region's effects, in React's order. */
  readonly effects: {
    /** `#effect chat:scroll:1` — keeps the viewport still across a prepend. */
    readonly 1: ChatEffect
    /** `#effect chat:scroll:2` — the scroll listener: stick-to-bottom and paging. */
    readonly 2: ChatEffect
    /** `#effect chat:scroll:3` — the debounced auto-scroll on new messages. */
    readonly 3: ChatEffect
    /** `#effect chat:scroll:4` — re-pins on a resize of the pane. */
    readonly 4: ChatEffect
    /** `#effect chat:scroll:5` — lands at the newest message on mount. */
    readonly 5: ChatEffect
  }
}

/**
 * Builds the `chat:scroll` slice.
 *
 * @param ctx - The panel context (the timeline window and the git cards the auto-scroll watches).
 * @returns The scroll slice.
 */
export function createChatScroll(ctx: ChatCtx): ChatScrollSlice {
  /**
   * Number of timeline items rendered in the DOM. Starts at the most recent
   * page and grows as the user scrolls toward the top of the conversation
   * (auto-load of earlier history — no button to click).
   */
  const maxVisibleItems = ref(60)
  /**
   * Sets the rendered item count, in React's `setState` shape.
   *
   * @param value - The new count, or an updater of the previous count.
   */
  const setMaxVisibleItems: SetState<number> = (value) => {
    maxVisibleItems.value =
      typeof value === 'function'
        ? (value as (previous: number) => number)(maxVisibleItems.value)
        : value
  }

  const messagesEndRef: MutableRef<HTMLDivElement | null> = { current: null }
  const messagesContainerRef: MutableRef<HTMLDivElement | null> = { current: null }
  const userScrolledUpRef: MutableRef<boolean> = { current: false }

  /** scrollHeight captured when a page load was triggered; consumed by the anchor effect. */
  const pendingAnchorHeightRef: MutableRef<number | null> = { current: null }
  /**
   * Whether older items are currently held back: filled once, where `timeline`
   * exists, with a stable callback that reads the latest committed timeline.
   */
  const hasHiddenEarlierRef: MutableRef<(() => boolean) | null> = { current: null }

  /** The debounced auto-scroll's pending timer. */
  const scrollTimerRef: MutableRef<ReturnType<typeof setTimeout> | null> = { current: null }

  return {
    messagesContainerRef,
    messagesEndRef,
    userScrolledUpRef,
    maxVisibleItems,
    setMaxVisibleItems,
    hasHiddenEarlierRef,
    effects: {
      1: () => {
        // Keeps the viewport still across a prepend. Native scroll anchoring is
        // disabled on the container (overflowAnchor: 'none') so this is the only
        // mechanism adjusting the offset — otherwise both would fire and
        // double-jump. React's `useLayoutEffect` runs after the DOM has the new
        // page and before paint; Vue's post-flush watcher is the same point.
        watch(
          maxVisibleItems,
          () => {
            const anchor = pendingAnchorHeightRef.current
            if (anchor === null) return
            pendingAnchorHeightRef.current = null
            const el = messagesContainerRef.current
            if (!el) return
            el.scrollTop += el.scrollHeight - anchor
          },
          { flush: 'post' },
        )
      },
      2: () => {
        // "Should we stick to the bottom?" — derived ONLY from the actual scroll
        // position after a scroll event, never from touch direction or content
        // size. A streaming burst GROWS the content (scrollHeight rises) WITHOUT
        // firing `scroll`, so only a real move of the viewport is read here.
        let attached: HTMLDivElement | null = null
        const onScroll = (): void => {
          const el = attached
          if (!el) return
          userScrolledUpRef.current = el.scrollHeight - el.scrollTop - el.clientHeight > 80
          // Near the top with older history held back: mount the next page in. The
          // anchor effect above keeps the viewport still across the prepend.
          if (el.scrollTop <= LOAD_EARLIER_THRESHOLD_PX && hasHiddenEarlierRef.current?.()) {
            pendingAnchorHeightRef.current = el.scrollHeight
            setMaxVisibleItems((n) => n + 40)
          }
        }
        onMounted(() => {
          const el = messagesContainerRef.current
          if (!el) return
          attached = el
          el.addEventListener('scroll', onScroll, { passive: true })
        })
        onBeforeUnmount(() => {
          attached?.removeEventListener('scroll', onScroll)
          attached = null
        })
      },
      3: () => {
        // Debounced to batch rapid streaming updates. Uses direct scrollTop
        // assignment instead of scrollIntoView to avoid smooth-scroll animation
        // timing issues (intermediate onScroll events, unpredictable animation
        // duration). Skipped when the user has scrolled up via wheel/touch.
        const run = (): void => {
          if (userScrolledUpRef.current) return
          if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current)
          scrollTimerRef.current = setTimeout(() => {
            scrollTimerRef.current = null
            const el = messagesContainerRef.current
            if (el) el.scrollTop = el.scrollHeight
          }, 80)
        }
        onMounted(run)
        watch([ctx.chat.messages, ctx.git.commitCards], run, { flush: 'post' })
      },
      4: () => {
        // Re-pin to the bottom when the messages container RESIZES, not just when
        // messages change. A layout change that shrinks/grows the pane — the
        // boot→IDE swap removing the "synthesizing" view, the mobile soft
        // keyboard opening/closing, an orientation change — leaves the scroll
        // offset stale. Guarded by the same userScrolledUp intent so it never
        // yanks a user who deliberately scrolled up to read history.
        let observer: ResizeObserver | null = null
        onMounted(() => {
          const el = messagesContainerRef.current
          if (!el || typeof ResizeObserver === 'undefined') return
          observer = new ResizeObserver(() => {
            if (userScrolledUpRef.current) return
            el.scrollTop = el.scrollHeight
          })
          observer.observe(el)
        })
        onBeforeUnmount(() => {
          observer?.disconnect()
          observer = null
        })
      },
      5: () => {
        // Land at the latest message on MOUNT, after layout settles. A fresh
        // mount has no legitimate "scrolled up" state to preserve, so force the
        // bottom across the settle window (double-rAF + a post-transition
        // follow-up) and clear that flag.
        let raf = 0
        let settleTimer: ReturnType<typeof setTimeout> | null = null
        onMounted(() => {
          const toBottom = (): void => {
            userScrolledUpRef.current = false
            const el = messagesContainerRef.current
            if (el) el.scrollTop = el.scrollHeight
          }
          raf = requestAnimationFrame(() => requestAnimationFrame(toBottom))
          settleTimer = setTimeout(toBottom, 400)
        })
        onBeforeUnmount(() => {
          cancelAnimationFrame(raf)
          if (settleTimer) clearTimeout(settleTimer)
          settleTimer = null
        })
      },
    },
  }
}
