/**
 * `chat:overlay` — the `/skills`, `/scripts`, `/settings` and `/test` panel
 * overlay (React's two `chat:overlay` regions and their one effect, ported by
 * unit U6).
 *
 * The overlay is a closeable popup above the composer, mutually exclusive with
 * the model, effort and sounds pickers — opening it closes every sibling popup,
 * and every command closes it again. `panelOverlayQuery` seeds the skills and
 * scripts searches from a `/skills <query>` / `/scripts <query>` invocation.
 * The Escape listener is a window listener, as for a dialog, so a field inside
 * the overlay (its cards' own search inputs) still closes it.
 *
 * @module
 */

import type { Accessor, Setter } from 'solid-js'
import { createEffect, createSignal, on, onCleanup } from 'solid-js'

import type { ChatInnerCtx, SliceEffects } from './context.js'

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
  /** The slice's effects, by ledger position. */
  effects: SliceEffects
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
    effects: {
      // #effect chat:overlay:1 — Escape closes the overlay from anywhere inside
      // it, including the embedded card's own search input, the way this
      // package's modals already do.
      1: () => {
        createEffect(
          on(panelOverlay, (open) => {
            if (!open) return
            const handler = (event: KeyboardEvent): void => {
              if (event.key === 'Escape') setPanelOverlay(null)
            }
            window.addEventListener('keydown', handler)
            onCleanup(() => window.removeEventListener('keydown', handler))
          }),
        )
      },
    },
  }
}
