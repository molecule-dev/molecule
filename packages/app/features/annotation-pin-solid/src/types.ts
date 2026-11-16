/**
 * Types of `@molecule/app-annotation-pin-solid` — the Solid counterpart of
 * `@molecule/app-annotation-pin-react`, same props and DOM.
 *
 * @module
 */

import type { JSX } from 'solid-js'

/**
 * A single pin to display on a parent surface. `position` is in the
 * parent's coordinate space — for image / 2D-canvas overlays this is
 * normalised 0..1 (so the pin re-anchors as the surface resizes); for
 * pixel-positioned overlays callers can pass raw px values and provide
 * their own `style` overrides via `className`.
 *
 * The label/note are pure data — components handle render only. Surfaces
 * supply pin objects via `<AnnotationLayer pins={...}>` (or render a
 * single pin directly if there is only one).
 */
export interface Pin {
  /** Stable identifier (used as the list key). */
  id: string
  /** Position in the parent surface's coordinate space (typically normalised 0..1). */
  position: { x: number; y: number }
  /** Short label (e.g. an index or single-word tag) shown inside the pin marker. */
  label?: JSX.Element
  /** Longer note / description body, shown inside the popup when the pin is selected. */
  note?: JSX.Element
}

/**
 * `<AnnotationPin>` props.
 */
export interface AnnotationPinProps {
  /** Position in the parent surface's coordinate space (typically normalised 0..1). */
  position: { x: number; y: number }
  /** Short label (e.g. an index or single-word tag) shown inside the marker. */
  label?: JSX.Element
  /** Longer note shown inside the popup when the pin is selected. */
  note?: JSX.Element
  /**
   * Whether the pin is currently selected. When `true` the popup is
   * rendered. Selection is controlled — callers manage state in
   * `<AnnotationLayer>` (or themselves) and update via `onClick`.
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
 * `<AnnotationLayer>` props.
 */
export interface AnnotationLayerProps {
  /** Pins to render on the layer. */
  pins: Pin[]
  /** Optional layer content (the surface to annotate — image, canvas, map tile, etc.). */
  children?: JSX.Element
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
   * `Pin.position` — normalised 0..1 by default. Keyboard users get the
   * same action: activating the layer's "add pin" button (Tab to it,
   * then Enter / Space) places a pin at the surface centre.
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
