/**
 * React's `chat:tests-bar` region of ChatPanel.tsx: the tests status bar's
 * discovery.
 *
 * The bar hides itself on a project with no tests, so it has to LEARN whether
 * any exist without the person opening the browser first — otherwise "shown by
 * default" would mean "shown after you ask for it once", which is not a default
 * at all.
 *
 * Discovery runs when the environment comes up, and again when a turn ends
 * while still no tests are known: that is the turn that wrote the project's
 * first spec. A project that already has tests never pays for the second probe,
 * because the effect returns the moment the list is non-empty. The "loading"
 * status is set in the same step that starts a discovery, so the bar that starts
 * it shows loading rather than an empty verdict.
 *
 * @module
 */

import { untrack } from 'svelte'

import type { TestList } from '@molecule/app-ide-panel-logic'

import type { ChatContext } from './context.svelte.js'

/** The identifiers other slices and sections read from the `chat:tests-bar` slice. */
export interface ChatTestsBarSlice {
  /** React's mount I/O for the region: none — discovery is effect 1. */
  mount(): void

  /** React's `#effect chat:tests-bar:<n>` entry points, at React's positions. */
  readonly effects: { 1: () => void }
}

/**
 * Creates the `chat:tests-bar` slice.
 *
 * @param ctx - The shared chat context (the bar preference, the host's
 *   discovery, the chat session and the tests controller).
 * @returns The bar's discovery effect.
 */
export function createChatTestsBar(ctx: ChatContext): ChatTestsBarSlice {
  /** Whether a TURN is in flight (React's `isLoading || isRemoteStreaming`). */
  const turnInFlight = $derived(ctx.chat.isLoading || ctx.chat.isRemoteStreaming)

  // The host's discovery to run now, or `null` when the bar already knows the
  // answer (a list is showing), cannot ask (no lister / the environment is
  // down), or must wait (a turn or a run is in flight).
  const testsDiscovery = $derived.by((): (() => Promise<TestList>) | null => {
    const listTests = ctx.props.listTests
    return ctx.prefs.testsBarVisible &&
      listTests !== undefined &&
      ctx.props.testsAvailable === true &&
      !turnInFlight &&
      !ctx.tests.testsRun.running &&
      ctx.tests.testsList.length === 0
      ? listTests
      : null
  })

  return {
    mount(): void {
      // React's region declares one effect and no mount work of its own.
    },
    effects: {
      1: (): void => {
        $effect(() => {
          const discovery = testsDiscovery
          if (!discovery) return
          // A discovery that starts shows "loading", unless a list is showing.
          // Read untracked: React's effect depends on the discovery, not on the
          // status this same step writes.
          if (untrack(() => ctx.tests.testsStatus) !== 'ready') {
            ctx.tests.testsController.setStatus('loading')
          }
          void ctx.tests.loadTests(discovery)
        })
      },
    },
  }
}
