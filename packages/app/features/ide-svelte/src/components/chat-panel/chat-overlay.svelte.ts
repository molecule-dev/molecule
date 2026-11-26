/**
 * React's `chat:overlay` regions of ChatPanel.tsx (lines 1190–1201 and
 * 1727–1754): the closeable panel overlay behind `/skills`, `/scripts`,
 * `/settings` and `/tests`, the query that seeds its search box, the action
 * that opens it. The kit dialog owns dismissal. Opening it closes the
 * composer popups and seeds the search query.
 *
 * @module
 */

import type { ChatSetState } from './chat-popups.svelte.js'
import type { ChatContext } from './context.svelte.js'

/** The panel overlay's open view. */
export type PanelOverlayKind = 'skills' | 'scripts' | 'settings' | 'tests'

/** The identifiers other slices and sections read from the `chat:overlay` slice. */
export interface ChatOverlaySlice {
  /** The open overlay view, or null. */
  readonly panelOverlay: PanelOverlayKind | null
  /** Opens or closes the overlay. */
  readonly setPanelOverlay: ChatSetState<PanelOverlayKind | null>
  /** The prefilled query of the open overlay (e.g. the `/test` filter). */
  readonly panelOverlayQuery: string
  /** Opens the overlay on a view, with an optional query. */
  readonly openPanelOverlay: (kind: PanelOverlayKind, query?: string) => void

  /** React's mount I/O for the region — none: it declares state only. */
  mount(): void
}

/**
 * Resolves React's `SetStateAction<T>` argument against the latest value.
 *
 * @param previous - The latest value.
 * @param value - The React setter argument: a value or an updater.
 * @returns The next value.
 */
function resolveState<T>(previous: T, value: T | ((previous: T) => T)): T {
  return typeof value === 'function' ? (value as (previous: T) => T)(previous) : value
}

/**
 * Creates the `chat:overlay` slice.
 *
 * @param ctx - The shared chat context.
 * @returns The overlay state, its opener and React's Escape effect.
 */
export function createChatOverlay(ctx: ChatContext): ChatOverlaySlice {
  let panelOverlay = $state.raw<PanelOverlayKind | null>(null)
  let panelOverlayQuery = $state('')

  const setPanelOverlay: ChatSetState<PanelOverlayKind | null> = (value): void => {
    panelOverlay = resolveState(panelOverlay, value)
  }

  return {
    get panelOverlay(): PanelOverlayKind | null {
      return panelOverlay
    },
    setPanelOverlay,
    get panelOverlayQuery(): string {
      return panelOverlayQuery
    },
    openPanelOverlay(kind: PanelOverlayKind, query = ''): void {
      // Close any sibling popup so overlays never stack (matches how the model
      // picker / sounds picker each own this region exclusively).
      ctx.composer.setModelPicker(null)
      ctx.composer.setEffortPicker(null)
      ctx.sounds.setSoundsPicker(null)
      ctx.composer.setCommandMenu(null)
      panelOverlayQuery = query
      setPanelOverlay(kind)
    },
    mount(): void {
      // React's region declares state only; there is no mount I/O to repeat.
    },
  }
}
