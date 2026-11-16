/**
 * Types of `@molecule/app-annotation-pin-angular` — the Angular counterpart of
 * `@molecule/app-annotation-pin-react`, same props and DOM.
 *
 * @module
 */

import type { TemplateRef } from '@angular/core'

/**
 * A single pin to display on a parent surface. `position` is in the
 * parent's coordinate space — for image / 2D-canvas overlays this is
 * normalised 0..1 (so the pin re-anchors as the surface resizes); for
 * pixel-positioned overlays callers can pass raw px values.
 *
 * The label/note are pure data — components handle render only.
 */
export interface Pin {
  /** Stable identifier (used to track the marker in a change detection pass). */
  id: string
  /** Position in the parent surface's coordinate space (typically normalised 0..1). */
  position: { x: number; y: number }
  /** Short label (e.g. an index or single-word tag) shown inside the pin marker — text or a template. */
  label?: TemplateRef<unknown> | string | number | null
  /** Longer note body shown inside the popup when the pin is selected — text or a template. */
  note?: TemplateRef<unknown> | string | number | null
}

/**
 * Props accepted by `AnnotationPin` — the same props
 * `@molecule/app-annotation-pin-react` accepts. Node props (`label`, `note`)
 * are an input (text or a `TemplateRef`, since an input cannot carry a DOM
 * node directly) or projected content (`[slot=label]`, `[slot=note]`).
 */
export interface AnnotationPinProps {
  /** Position in the parent surface's coordinate space (typically normalised 0..1). */
  position: { x: number; y: number }
  /** Short label inside the marker — text, a template, or `[slot=label]` content. */
  label?: TemplateRef<unknown> | string | number | null
  /** Popup body when selected — text, a template, or `[slot=note]` content. */
  note?: TemplateRef<unknown> | string | number | null
  /**
   * Whether the pin is currently selected. When `true` the popup is
   * rendered. Selection is controlled — callers manage state in
   * `AnnotationLayer` (or themselves) and update via `onClick`.
   */
  selected?: boolean
  /** Click handler — fires when the pin marker is clicked. */
  onClick?: () => void
  /**
   * Side the popup renders on, relative to the marker. Defaults to `'right'`.
   */
  popupSide?: 'top' | 'bottom' | 'left' | 'right'
  /** Extra classes merged onto the root wrapper. */
  className?: string
  /**
   * Whether `position` is normalised (0..1) — when `true` the wrapper
   * positions itself with `%` units so pins re-anchor on resize. When
   * `false` the wrapper uses raw `px` values. Defaults to `true`.
   */
  normalised?: boolean
}

/**
 * Props accepted by `AnnotationLayer` — the same props
 * `@molecule/app-annotation-pin-react` accepts. The surface content is
 * projected (`<ng-content>`); there is no node prop for it.
 */
export interface AnnotationLayerProps {
  /** Pins to render on the layer. */
  pins: Pin[]
  /**
   * The currently active (popup-open) pin id, or `null` for none. The
   * layer is fully controlled — callers manage selection state.
   */
  activePinId?: string | null
  /** Called with the clicked pin id when a pin marker is clicked. */
  onPinClick?: (pinId: string) => void
  /**
   * Called when the user clicks an empty area of the layer (i.e. not on
   * a pin marker or a popup). Coordinates are in the same space as
   * `Pin.position` — normalised 0..1 by default.
   */
  onSurfaceClick?: (position: { x: number; y: number }) => void
  /**
   * Whether positions are normalised (0..1) — when `true` the layer
   * computes click coordinates as fractions of its bounding box; when
   * `false` it returns raw pixel offsets. Defaults to `true`.
   */
  normalised?: boolean
  /**
   * Side the popup renders on, relative to its marker. Defaults to `'right'`.
   */
  popupSide?: 'top' | 'bottom' | 'left' | 'right'
  /** Extra classes merged onto the layer root. */
  className?: string
  /** Inline style for the layer root, merged over the layer's own. */
  style?: Record<string, string | number>
}
