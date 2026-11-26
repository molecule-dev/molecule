/**
 * `chat:overlay` — the `/skills`, `/scripts`, `/settings` and `/test` panel
 * overlay (React's two `chat:overlay` regions and their one effect, ported by
 * unit U6).
 *
 * The dialog is mutually exclusive with
 * the model, effort and sounds pickers — opening it closes every sibling popup,
 * and every command closes it again. `panelOverlayQuery` seeds the skills and
 * scripts searches from a `/skills <query>` / `/scripts <query>` invocation.
 *
 * @module
 */

import type { Accessor, Setter } from 'solid-js'
import { createSignal } from 'solid-js'

import type { ChatInnerCtx } from './context.js'

/** The panel overlay's open view. */
export type PanelOverlayKind = 'skills' | 'scripts' | 'settings' | 'tests'

/** What other slices read from `chat:overlay`. */
export interface ChatOverlaySlice {
  /** The open overlay view, or null. */
  panelOverlay: Accessor<PanelOverlayKind | null>
  /** Opens or closes the overlay. */
  setPanelOverlay: Setter<PanelOverlayKind | null>
  /** The prefilled query of the open overlay (e.g. the `/test` filter). */
  panelOverlayQuery: Accessor<string>
  /** Opens the overlay on a view, with an optional query. */
  openPanelOverlay: (kind: PanelOverlayKind, query?: string) => void
}

/**
 * Creates `chat:overlay`.
 * @param ctx - The inner ctx (its composer, sounds and overlay neighbours).
 * @returns The overlay slice.
 */
export function createChatOverlay(ctx: ChatInnerCtx): ChatOverlaySlice {
  const [panelOverlay, setPanelOverlay] = createSignal<PanelOverlayKind | null>(null)
  const [panelOverlayQuery, setPanelOverlayQuery] = createSignal('')

  return {
    panelOverlay,
    setPanelOverlay,
    panelOverlayQuery,
    openPanelOverlay: (variant, query = '') => {
      // Close any sibling popup so overlays never stack (matches how the model
      // picker / sounds picker each own this region exclusively).
      ctx.composer.setModelPicker(null)
      ctx.composer.setEffortPicker(null)
      ctx.sounds.setSoundsPicker(null)
      ctx.composer.setCommandMenu(null)
      setPanelOverlayQuery(query)
      setPanelOverlay(variant)
    },
  }
}
