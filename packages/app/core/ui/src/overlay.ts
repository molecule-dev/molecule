/**
 * Renderer-neutral options for overlay layers.
 * @module
 */

import type { ElementHandle } from './elements.js'
import type { TooltipPlacement } from './types.js'

/** A mounted element that a layer can use for focus or ownership. */
export interface OverlayTarget {
  readonly current: ElementHandle | null
}

/** Why the platform requested that an overlay close. */
export type OverlayDismissReason = 'escape' | 'back' | 'outside' | 'backdrop'

/** Modal layers block dismissal below them. Toast layers are passive. */
export type OverlayLayerKind = 'modal' | 'popover' | 'tooltip' | 'toast'

/** Initial focus and focus restoration for a blocking layer. */
export interface OverlayFocusOptions {
  trap: true
  initial?: OverlayTarget
  restore: 'opener' | OverlayTarget | false
}

/** Registration for an overlay, independent of where its surface is presented. */
export interface OverlayLayerOptions {
  open: boolean
  kind: OverlayLayerKind
  surface: OverlayTarget
  anchor?: OverlayTarget
  dismissKey?: boolean
  dismissBackdrop?: boolean
  focus?: OverlayFocusOptions
  lockScroll?: boolean
  onDismiss?: (reason: OverlayDismissReason) => void
}

/** Placement and collision policy for an anchored layer, in renderer-local units. */
export interface OverlayAnchorGeometry {
  placement: TooltipPlacement
  align?: 'start' | 'center' | 'end'
  offset: number
  padding: number
  collision: 'none' | 'shift' | 'flip-shift'
}
