/**
 * `chat:tests-bar` — the tests status bar's discovery, ported from React's
 * `chat:tests-bar` region. The slice exposes no rendered values: its work is one
 * effect that makes the bar LEARN whether the project has any tests without the
 * person opening the browser first.
 *
 * Discovery runs when the environment comes up, and again when a turn ends
 * while still no tests are known: that is the turn that wrote the project's
 * first spec. A project that already has tests never pays for the second probe,
 * because the discovery falls back to `null` the moment the list is non-empty.
 * The "loading" status is set in the same step that starts a discovery, so the
 * bar that starts it shows loading rather than an empty verdict.
 *
 * @module
 */

import { computed, onMounted, watch } from 'vue'

import type { ChatCtx, ChatEffect, ListTestsHandler } from './context.js'

/** What the `chat:tests-bar` slice exposes. */
export interface ChatTestsBarSlice {
  /** The region's effects, in React's order. */
  readonly effects: {
    /** `#effect chat:tests-bar:1`. */
    readonly 1: ChatEffect
  }
}

/**
 * Builds the `chat:tests-bar` slice.
 *
 * @param ctx - The panel context (the bar preference, the host's discovery, the
 *   chat session and the tests controller).
 * @returns The tests-bar slice.
 */
export function createChatTestsBar(ctx: ChatCtx): ChatTestsBarSlice {
  const turnInFlight = computed(() => ctx.chat.isLoading.value || ctx.chat.isRemoteStreaming.value)

  // The host's discovery to run now, or `null` when the bar already knows the
  // answer (a list is showing), cannot ask (no lister / the environment is
  // down), or must wait (a turn or a run is in flight).
  const testsDiscovery = computed<ListTestsHandler | null>(() => {
    const listTests = ctx.props.listTests
    return ctx.prefs.testsBarVisible.value &&
      listTests !== undefined &&
      ctx.props.testsAvailable === true &&
      !turnInFlight.value &&
      !ctx.tests.testsRun.value.running &&
      ctx.tests.testsList.value.length === 0
      ? listTests
      : null
  })

  /**
   * Starts one discovery: a discovery that starts shows "loading" in the render
   * that starts it, unless a list is already showing, then asks the host for
   * the list.
   *
   * @param discovery - The discovery to start, or `null` when there is nothing
   *   to ask (the bar already knows, cannot ask, or must wait).
   */
  const sync = (discovery: ListTestsHandler | null): void => {
    if (discovery === null) return
    if (ctx.tests.testsStatus.value !== 'ready') {
      ctx.tests.testsController.setStatus('loading')
    }
    void ctx.tests.loadTests(discovery)
  }

  return {
    effects: {
      1: () => {
        // Vue's watch runs only on a change, so the mount case is run here too —
        // registered at this effect's React position, after the children exist.
        onMounted(() => {
          sync(testsDiscovery.value)
        })
        watch(
          testsDiscovery,
          (discovery) => {
            sync(discovery)
          },
          { flush: 'post' },
        )
      },
    },
  }
}
