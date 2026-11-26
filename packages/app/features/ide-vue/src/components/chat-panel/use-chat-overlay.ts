/**
 * `chat:overlay` — the closeable panel overlay (`/skills`, `/scripts`,
 * `/settings`, `/test`), ported from React's two `chat:overlay` regions.
 *
 * The overlay is mutually exclusive with the model / effort / sounds pickers and
 * the command menu: opening it closes every sibling popup first, so only one
 * transient view is open at a time. `panelOverlayQuery` seeds
 * the skills / scripts search from a `/skills <query>` invocation.
 *
 * @module
 */

import { type Ref, ref } from 'vue'

import type { ChatCtx, SetState } from './context.js'

/** The overlay variants `/skills`, `/scripts`, `/settings` and `/test` open. */
export type PanelOverlayVariant = 'skills' | 'scripts' | 'settings' | 'tests'

/** What the `chat:overlay` slice exposes. */
export interface ChatOverlaySlice {
  /** The open overlay variant, or `null`. */
  readonly panelOverlay: Ref<PanelOverlayVariant | null>
  /** Opens / closes the overlay. */
  readonly setPanelOverlay: SetState<PanelOverlayVariant | null>
  /** The overlay's search seed. */
  readonly panelOverlayQuery: Ref<string>
  /** Opens one overlay variant (closing every sibling popup first). */
  readonly openPanelOverlay: (variant: PanelOverlayVariant, query?: string) => void
}

/**
 * Wraps a ref in React's `setState` shape: a value, or an updater of the
 * previous value.
 *
 * @param target - The ref the state lives in.
 * @returns The setter.
 */
function makeSetter<T>(target: Ref<T>): SetState<T> {
  return (value) => {
    target.value = typeof value === 'function' ? (value as (previous: T) => T)(target.value) : value
  }
}

/**
 * Builds the `chat:overlay` slice.
 *
 * @param ctx - The panel context (the sibling popups the overlay closes).
 * @returns The overlay slice.
 */
export function createChatOverlay(ctx: ChatCtx): ChatOverlaySlice {
  const panelOverlay = ref<PanelOverlayVariant | null>(null)
  const setPanelOverlay = makeSetter(panelOverlay)
  const panelOverlayQuery = ref('')

  /**
   * Opens one overlay variant, closing every sibling popup first so overlays
   * never stack (the model picker / sounds picker each own this region
   * exclusively).
   *
   * @param variant - The variant to open.
   * @param query - The search seed (from a `/skills <query>` invocation).
   */
  const openPanelOverlay = (variant: PanelOverlayVariant, query = ''): void => {
    ctx.composer.setModelPicker(null)
    ctx.composer.setEffortPicker(null)
    ctx.sounds.setSoundsPicker(null)
    ctx.composer.setCommandMenu(null)
    panelOverlayQuery.value = query
    setPanelOverlay(variant)
  }

  return {
    panelOverlay,
    setPanelOverlay,
    panelOverlayQuery,
    openPanelOverlay,
  }
}
