/**
 * `chat:scroll` — scroll anchoring, the loading of an older page above the
 * viewport, and the visible-window cap (React's `chat:scroll` regions and its
 * five effects, ported by unit U17).
 *
 * The timeline mounts only the newest `maxVisibleItems` items. Scrolling near
 * the top mounts the next older page in and, because native scroll anchoring
 * is off on the container, the anchor effect restores the reader's place across
 * the prepend. A real move of the viewport (never content growth) decides
 * whether the panel sticks to the bottom, and three effects keep the newest
 * message in view: a debounced scroll on new messages, a resize-pinned scroll,
 * and a forced landing on mount across the settle window.
 *
 * @module
 */

import type { Accessor, Setter } from 'solid-js'
import { createEffect, createSignal, on, onCleanup, onMount } from 'solid-js'

import { LOAD_EARLIER_THRESHOLD_PX } from '@molecule/app-ide-panel-logic'

import type { ChatInnerCtx, MutableRef, SliceEffects } from './context.js'

/** What other slices read from `chat:scroll`. */
export interface ChatScrollSlice {
  /** The visible-window cap on timeline items. */
  maxVisibleItems: Accessor<number>
  /** Raises the cap (load earlier). */
  setMaxVisibleItems: Setter<number>
  /** The bottom sentinel (scroll-to-end anchor). */
  messagesEndRef: MutableRef<HTMLDivElement | null>
  /** The messages container (the scrolling element). */
  messagesContainerRef: MutableRef<HTMLDivElement | null>
  /** Whether the user has scrolled away from the bottom. */
  userScrolledUpRef: MutableRef<boolean>
  /** Reports whether older items exist above the window. */
  hasHiddenEarlierRef: MutableRef<(() => boolean) | null>
  /** The slice's effects, by ledger position. */
  effects: SliceEffects
}

/**
 * Creates `chat:scroll`.
 * @param ctx - The inner ctx (the transcript and commit cards the auto-scroll
 *   effect watches).
 * @returns The scroll slice, with its refs and effects.
 */
export function createChatScroll(ctx: ChatInnerCtx): ChatScrollSlice {
  const [maxVisibleItems, setMaxVisibleItems] = createSignal(60)
  const messagesEndRef: MutableRef<HTMLDivElement | null> = { current: null }
  const messagesContainerRef: MutableRef<HTMLDivElement | null> = { current: null }
  const userScrolledUpRef: MutableRef<boolean> = { current: false }
  // scrollHeight captured when a page load was triggered; consumed by the anchor effect.
  const pendingAnchorHeightRef: MutableRef<number | null> = { current: null }
  // Filled once the timeline exists, with a callback that reads the latest committed list.
  const hasHiddenEarlierRef: MutableRef<(() => boolean) | null> = { current: null }
  const scrollTimerRef: MutableRef<ReturnType<typeof setTimeout> | null> = { current: null }

  return {
    maxVisibleItems,
    setMaxVisibleItems,
    messagesEndRef,
    messagesContainerRef,
    userScrolledUpRef,
    hasHiddenEarlierRef,
    effects: {
      // #effect chat:scroll:1 — keeps the viewport still across a prepend.
      1: () => {
        createEffect(
          on(
            maxVisibleItems,
            () => {
              const anchor = pendingAnchorHeightRef.current
              if (anchor === null) return
              pendingAnchorHeightRef.current = null
              const element = messagesContainerRef.current
              if (!element) return
              element.scrollTop += element.scrollHeight - anchor
            },
            { defer: false },
          ),
        )
      },

      // #effect chat:scroll:2 — the once-registered scroll listener: track
      // whether the user is away from the bottom, and mount an older page near
      // the top while any remain.
      2: () => {
        onMount(() => {
          const element = messagesContainerRef.current
          if (!element) return
          const onScroll = (): void => {
            userScrolledUpRef.current =
              element.scrollHeight - element.scrollTop - element.clientHeight > 80
            // Near the top with older history held back: mount the next page in. The
            // anchor effect above keeps the viewport still across the prepend.
            if (element.scrollTop <= LOAD_EARLIER_THRESHOLD_PX && hasHiddenEarlierRef.current?.()) {
              pendingAnchorHeightRef.current = element.scrollHeight
              setMaxVisibleItems((count) => count + 40)
            }
          }
          element.addEventListener('scroll', onScroll, { passive: true })
          onCleanup(() => element.removeEventListener('scroll', onScroll))
        })
      },

      // #effect chat:scroll:3 — debounced auto-scroll on new messages or cards.
      3: () => {
        createEffect(
          on(
            () => [ctx.chat.messages(), ctx.git.commitCards()],
            () => {
              if (userScrolledUpRef.current) return
              if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current)
              scrollTimerRef.current = setTimeout(() => {
                scrollTimerRef.current = null
                const element = messagesContainerRef.current
                if (element) element.scrollTop = element.scrollHeight
              }, 80)
            },
            { defer: false },
          ),
        )
      },

      // #effect chat:scroll:4 — re-pin to the bottom when the pane resizes.
      4: () => {
        onMount(() => {
          const element = messagesContainerRef.current
          if (!element || typeof ResizeObserver === 'undefined') return
          const observer = new ResizeObserver(() => {
            if (userScrolledUpRef.current) return
            element.scrollTop = element.scrollHeight
          })
          observer.observe(element)
          onCleanup(() => observer.disconnect())
        })
      },

      // #effect chat:scroll:5 — land at the latest message on mount, across the
      // settle window, clearing the scroll-away flag a fresh mount never owns.
      5: () => {
        onMount(() => {
          const toBottom = (): void => {
            userScrolledUpRef.current = false
            const element = messagesContainerRef.current
            if (element) element.scrollTop = element.scrollHeight
          }
          const raf = requestAnimationFrame(() => requestAnimationFrame(toBottom))
          const timer = setTimeout(toBottom, 400)
          onCleanup(() => {
            cancelAnimationFrame(raf)
            clearTimeout(timer)
          })
        })
      },
    },
  }
}
