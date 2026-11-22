/**
 * `chat:tests-bar` — learns whether the project has tests so the bar can hide
 * itself on a project with none, ported from React's `chat:tests-bar` region.
 * The slice exposes no rendered values: its work is one effect.
 *
 * Discovery runs when the environment comes up, and again when a turn ends
 * while still no tests are known: that is the turn that wrote the project's
 * first spec. A project that already has tests never pays for the second probe,
 * because the effect returns the moment the list is non-empty.
 *
 * @module
 */

import { createEffect, untrack } from 'solid-js'

import type { ChatInnerCtx, ChatInnerProps, SliceEffects } from './context.js'

/** What other slices read from `chat:tests-bar` (nothing yet). */
export interface ChatTestsBarSlice {
  /** The slice's effects, by ledger position. */
  effects: SliceEffects
}

/**
 * Creates `chat:tests-bar`.
 * @param ctx - The inner ctx (the bar preference, the host's discovery, the chat
 *   session and the tests controller).
 * @returns The tests-bar slice.
 */
export function createChatTestsBar(ctx: ChatInnerCtx): ChatTestsBarSlice {
  return {
    effects: {
      // #effect chat:tests-bar:1 — a discovery that starts shows "loading" in the
      // render that starts it, unless a list is showing, then asks the host for
      // the list. React's render-phase seen-guard is this effect's change
      // comparison: it runs once at the effect's position and again only when the
      // discovery value changes (including back to null).
      1: () => {
        // The host's discovery to run now, or null when the bar already knows the
        // answer (a list is showing), cannot ask (no lister / the environment is
        // down), or must wait (a turn or a run is in flight).
        const testsDiscovery = (): NonNullable<ChatInnerProps['listTests']> | null => {
          const listTests = ctx.props.listTests
          return ctx.prefs.testsBarVisible() &&
            listTests !== undefined &&
            ctx.props.testsAvailable === true &&
            !(ctx.chat.isLoading() || ctx.chat.isRemoteStreaming()) &&
            !ctx.tests.testsRun().running &&
            ctx.tests.testsList().length === 0
            ? listTests
            : null
        }
        // React's effect dependency is the discovery VALUE. A plain accessor
        // (not a memo) keeps this effect's subscription at its own ledger
        // position, so the earlier-declared git effect runs first on a turn-end
        // `isLoading` change — a memo would subscribe during construction and
        // reorder them — while the comparison below keeps React's "only when
        // the value changes" semantics.
        let previous: NonNullable<ChatInnerProps['listTests']> | null | undefined
        createEffect(() => {
          const discovery = testsDiscovery()
          if (discovery === previous) return
          previous = discovery
          if (!discovery) return
          if (untrack(() => ctx.tests.testsStatus()) !== 'ready') {
            ctx.tests.testsController.setStatus('loading')
          }
          void ctx.tests.loadTests(discovery)
        })
      },
    },
  }
}
