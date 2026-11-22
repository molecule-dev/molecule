/**
 * React's three `chat:scroll` regions of ChatPanel.tsx (lines 985–998,
 * 2203–2265, 2449–2511): the transcript's paging state, the auto-load-earlier
 * scroll listener, the scroll-anchoring layout effect, and the three effects
 * that keep the newest message in view.
 *
 * React reads the scroll position only from real `scroll` events, so a
 * streaming burst that grows the content can never be mistaken for the user
 * scrolling up; the auto-scrolls pin straight to the bottom, so their own
 * programmatic scroll lands at distance 0. This slice keeps the same refs and
 * the same effect positions:
 *
 * - `#effect chat:scroll:1` (a layout effect on `maxVisibleItems`) anchors the
 *   viewport across a prepended page;
 * - `#effect chat:scroll:2` attaches the once-only `scroll` listener
 *   (mount-only, so its work is the {@link ChatScroll.mount} pass);
 * - `#effect chat:scroll:3` debounces an auto-scroll on `messages` and
 *   `commitCards`;
 * - `#effect chat:scroll:4` re-pins to the bottom when the container resizes
 *   (mount-only: the observer is created on the mount pass);
 * - `#effect chat:scroll:5` forces the bottom across the mount settle window
 *   (mount-only).
 *
 * @module
 */

import { afterNextRender, DestroyRef, inject, Injectable, Injector, signal } from '@angular/core'

import { LOAD_EARLIER_THRESHOLD_PX } from '@molecule/app-ide-panel-logic'

import { ChatChat } from './chat-chat.slice.js'
import { ChatGit } from './chat-git.slice.js'
import { ChatInnerState, registerChatEffect } from './chat-inner-state.js'
import type { ChatSetState } from './chat-popups.slice.js'

/** The identifiers other slices and sections read from the `chat:scroll` slice. */
export interface ChatScrollSlice {
  /** React's mount I/O for the region: the mount-only listener, observer and settle window. */
  mount(): void

  /** React's `#effect chat:scroll:<n>` entry points, at React's positions. */
  readonly effects: { 1: () => void; 2: () => void; 3: () => void; 4: () => void; 5: () => void }

  /** How many timeline items are rendered. */
  readonly maxVisibleItems: () => number
  /** Sets the rendered item count. */
  readonly setMaxVisibleItems: ChatSetState<number>
  /** The sentinel after the newest message. */
  readonly messagesEndRef: { current: HTMLDivElement | null }
  /** The messages container (the scroll port). */
  readonly messagesContainerRef: { current: HTMLDivElement | null }
  /** Whether the user has scrolled away from the bottom. */
  readonly userScrolledUpRef: { current: boolean }
  /** Filled with "are older items hidden above?", for the load-earlier control. */
  readonly hasHiddenEarlierRef: { current: (() => boolean) | null }
}

/** React's `chat:scroll` slice: paging, anchoring and auto-scroll. */
@Injectable()
export class ChatScroll implements ChatScrollSlice {
  /** The shared state, read for the slices the effects depend on. */
  private readonly state = inject(ChatInnerState)

  /** The element injector `registerChatEffect` registers the effects in. */
  private readonly injector = inject(Injector)

  /** The panel's destroy hook, which drops every listener and timer React's cleanups remove. */
  private readonly destroyRef = inject(DestroyRef)

  /** How many timeline items are rendered (React's initial `60`). */
  readonly maxVisibleItems = signal(60)

  /** The sentinel after the newest message (React's ref, initial `null`). */
  readonly messagesEndRef: { current: HTMLDivElement | null } = { current: null }

  /** The messages container (React's ref, initial `null`). */
  readonly messagesContainerRef: { current: HTMLDivElement | null } = { current: null }

  /** Whether the user has scrolled away from the bottom (React's ref). */
  readonly userScrolledUpRef: { current: boolean } = { current: false }

  /** Filled with "are older items hidden above?" (React's ref, initial `null`). */
  readonly hasHiddenEarlierRef: { current: (() => boolean) | null } = { current: null }

  /** The `scrollHeight` captured when a page load was triggered (React's ref). */
  private readonly pendingAnchorHeightRef: { current: number | null } = { current: null }

  /** The pending debounced auto-scroll timer (React's ref). */
  private readonly scrollTimerRef: { current: ReturnType<typeof setTimeout> | null } = {
    current: null,
  }

  /** Removes the `scroll` listener the mount pass attached, when one is attached. */
  private removeScrollListener: (() => void) | null = null

  /** The container's resize observer, while it is observing. */
  private resizeObserver: ResizeObserver | null = null

  /** The pending double-`requestAnimationFrame` handle, when one is scheduled. */
  private settleRaf: number | null = null

  /** The pending post-transition follow-up timer, when one is scheduled. */
  private settleTimer: ReturnType<typeof setTimeout> | null = null

  /** Drops every listener and timer on destroy, as React's effect cleanups do. */
  constructor() {
    this.destroyRef.onDestroy(() => {
      this.removeScrollListener?.()
      this.removeScrollListener = null
      this.resizeObserver?.disconnect()
      this.resizeObserver = null
      // The 80ms auto-scroll timer is deliberately left alone: React's effect
      // returns no cleanup for it, so it still fires on its detached element.
      if (this.settleRaf !== null) cancelAnimationFrame(this.settleRaf)
      this.settleRaf = null
      if (this.settleTimer) clearTimeout(this.settleTimer)
      this.settleTimer = null
    })
  }

  /** Sets the rendered item count (value or updater). */
  readonly setMaxVisibleItems: ChatSetState<number> = (next) => {
    this.maxVisibleItems.update((prev) => (typeof next === 'function' ? next(prev) : next))
  }

  /** React's `#effect chat:scroll:<n>` entry points, at React's positions. */
  readonly effects = {
    1: (): void => {
      // Keeps the viewport still across a prepend. Native scroll anchoring is
      // disabled on the container (overflowAnchor: 'none') so this is the only
      // mechanism adjusting the offset — otherwise both would fire and
      // double-jump.
      registerChatEffect(this.injector, (skip) => {
        this.maxVisibleItems()
        if (skip) return
        if (this.pendingAnchorHeightRef.current === null) return
        // React's layout effect measures AFTER the prepended page is in the
        // DOM; an Angular effect can run before the child views that render it,
        // so the measurement itself is deferred to the end of the render.
        afterNextRender(
          () => {
            const anchor = this.pendingAnchorHeightRef.current
            if (anchor === null) return
            this.pendingAnchorHeightRef.current = null
            const el = this.messagesContainerRef.current
            if (!el) return
            el.scrollTop += el.scrollHeight - anchor
          },
          { injector: this.injector },
        )
      })
    },
    2: (): void => {
      registerChatEffect(this.injector, () => {
        // Mount-only in React; attached by `mount()`.
      })
    },
    3: (): void => {
      // Debounced to batch rapid streaming updates. Uses direct scrollTop
      // assignment instead of scrollIntoView to avoid smooth-scroll animation
      // timing issues (intermediate onScroll events, unpredictable animation
      // duration). Skipped when the user has scrolled up.
      registerChatEffect(this.injector, (skip) => {
        this.state.slice(ChatChat).messages()
        this.state.slice(ChatGit).commitCards()
        if (skip) return
        this.scheduleAutoScroll()
      })
    },
    4: (): void => {
      registerChatEffect(this.injector, () => {
        // Mount-only in React; the observer is created by `mount()`.
      })
    },
    5: (): void => {
      registerChatEffect(this.injector, () => {
        // Mount-only in React; the settle window is armed by `mount()`.
      })
    },
  }

  /**
   * React's mount I/O for the region, in React's effect order: attach the
   * `scroll` listener, schedule the first debounced auto-scroll, watch the
   * container's size, then force the bottom across the settle window.
   */
  mount(): void {
    this.attachScrollListener()
    this.scheduleAutoScroll()
    this.observeResize()
    this.armSettleWindow()
  }

  /**
   * React's `#effect chat:scroll:2`: one `scroll` listener that derives "should
   * we stick to the bottom?" from the real scroll position and mounts the next
   * older page near the top.
   */
  private attachScrollListener(): void {
    const el = this.messagesContainerRef.current
    if (!el) return
    const onScroll = (): void => {
      this.userScrolledUpRef.current = el.scrollHeight - el.scrollTop - el.clientHeight > 80
      // Near the top with older history held back: mount the next page in. The
      // anchor effect keeps the viewport still across the prepend.
      if (el.scrollTop <= LOAD_EARLIER_THRESHOLD_PX && this.hasHiddenEarlierRef.current?.()) {
        this.pendingAnchorHeightRef.current = el.scrollHeight
        this.setMaxVisibleItems((n) => n + 40)
      }
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    this.removeScrollListener = (): void => el.removeEventListener('scroll', onScroll)
  }

  /** React's `#effect chat:scroll:3` body: (re-)arm the 80ms auto-scroll. */
  private scheduleAutoScroll(): void {
    if (this.userScrolledUpRef.current) return
    if (this.scrollTimerRef.current) clearTimeout(this.scrollTimerRef.current)
    this.scrollTimerRef.current = setTimeout(() => {
      this.scrollTimerRef.current = null
      const el = this.messagesContainerRef.current
      if (el) el.scrollTop = el.scrollHeight
    }, 80)
  }

  /**
   * React's `#effect chat:scroll:4`: re-pin to the bottom when the messages
   * container RESIZES, not just when messages change. Guarded by the same
   * userScrolledUp intent so it never yanks a user who deliberately scrolled up.
   */
  private observeResize(): void {
    const el = this.messagesContainerRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    this.resizeObserver = new ResizeObserver(() => {
      if (this.userScrolledUpRef.current) return
      el.scrollTop = el.scrollHeight
    })
    this.resizeObserver.observe(el)
  }

  /**
   * React's `#effect chat:scroll:5`: land at the latest message on mount, after
   * layout settles — a double-rAF plus a post-transition follow-up that also
   * clears a spuriously set userScrolledUp flag.
   */
  private armSettleWindow(): void {
    const toBottom = (): void => {
      this.userScrolledUpRef.current = false
      const el = this.messagesContainerRef.current
      if (el) el.scrollTop = el.scrollHeight
    }
    this.settleRaf = requestAnimationFrame(() => requestAnimationFrame(toBottom))
    this.settleTimer = setTimeout(toBottom, 400)
  }
}
