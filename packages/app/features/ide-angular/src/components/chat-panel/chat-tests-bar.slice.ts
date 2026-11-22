/**
 * React's `chat:tests-bar` region of ChatPanel.tsx (lines 2404–2436): the
 * discovery the tests bar needs before the person ever opens the browser.
 *
 * A project with no tests gets no bar, so the panel has to LEARN whether any
 * exist — when the environment comes up, and again when a turn ends while it
 * still knows of none (the turn that wrote the project's first spec). The
 * derivation is React's render-time `testsDiscovery`; the announce it makes
 * (mark the listing `loading`, then list) is React's render-time state write
 * plus `#effect chat:tests-bar:1`.
 *
 * @module
 */

import { computed, inject, Injectable, Injector } from '@angular/core'

import { ChatChat } from './chat-chat.slice.js'
import { ChatInnerState, registerChatEffect } from './chat-inner-state.js'
import { ChatPrefs } from './chat-prefs.slice.js'
import type { ListTestsHandler } from './chat-tests.slice.js'
import { ChatTests } from './chat-tests.slice.js'

/** The identifiers other slices and sections read from the `chat:tests-bar` slice. */
export interface ChatTestsBarSlice {
  /** React's mount I/O for the region: the first discovery, when one is due. */
  mount(): void

  /** React's `#effect chat:tests-bar:<n>` entry points, at React's positions. */
  readonly effects: { 1: () => void }
}

/** React's `chat:tests-bar` slice: the discovery the bar runs on its own. */
@Injectable()
export class ChatTestsBar implements ChatTestsBarSlice {
  /** The shared state, read for the host's discovery and environment props. */
  private readonly state = inject(ChatInnerState)

  /** The element injector `registerChatEffect` registers the effect in. */
  private readonly injector = inject(Injector)

  /** The discovery the last announce ran for (React's `testsDiscoverySeen`). */
  private lastDiscovery: ListTestsHandler | null = null

  /**
   * React's render-time `testsDiscovery`: the host's lister when a discovery is
   * due — the bar is shown, the host wired one, the environment is up, no turn
   * or run is in flight, and nothing has been listed yet — else `null`.
   */
  private readonly testsDiscovery = computed<ListTestsHandler | null>(() => {
    const props = this.state.props()
    if (!this.state.slice(ChatPrefs).testsBarVisible()) return null
    const listTests = props.listTests
    if (listTests === undefined) return null
    if (props.testsAvailable !== true) return null
    const chat = this.state.slice(ChatChat)
    if (chat.isLoading() || chat.isRemoteStreaming()) return null
    const tests = this.state.slice(ChatTests)
    if (tests.testsRun().running) return null
    if (tests.testsList().length !== 0) return null
    return listTests
  })

  /** React's mount I/O: the discovery due at mount runs on effect 1's first run. */
  mount(): void {
    // The first discovery is effect 1's mount run, at the region's ledger
    // position (right after the git status fetch, before the files list).
  }

  /** React's `#effect chat:tests-bar:<n>` ledger, registered at its position. */
  readonly effects = {
    1: (): void => {
      registerChatEffect(this.injector, (skip) => {
        const discovery = this.testsDiscovery()
        if (skip) {
          // React's mount run announces the discovery due at mount.
          this.lastDiscovery = discovery
          this.announce(discovery)
          return
        }
        // React compares the seen list function's identity: an unchanged
        // discovery never re-lists, while going null and back does.
        if (discovery === this.lastDiscovery) return
        this.lastDiscovery = discovery
        this.announce(discovery)
      })
    },
  }

  /**
   * React's render-time write plus its effect: mark a starting discovery
   * `loading` (unless a list is already showing), then list.
   *
   * @param discovery - The host's lister when a discovery is due, else null.
   */
  private announce(discovery: ListTestsHandler | null): void {
    if (!discovery) return
    const tests = this.state.slice(ChatTests)
    if (tests.testsStatus() !== 'ready') tests.testsController.setStatus('loading')
    void tests.loadTests(discovery)
  }
}
