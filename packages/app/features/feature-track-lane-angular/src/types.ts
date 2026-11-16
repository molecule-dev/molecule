/**
 * Types of `@molecule/app-feature-track-lane-angular` — the Angular
 * counterpart of `@molecule/app-feature-track-lane-react`, same props and DOM.
 *
 * @module
 */

import type { TemplateRef } from '@angular/core'

/**
 * A single clip block on a track lane. `startTime` and `duration` are both in
 * seconds; `pixelsPerSecond` on the lane converts them to the on-screen
 * geometry. `id` is a stable identifier used as the row key and as the argument
 * passed back to all event handlers. `color` accents the body fill (defaults to
 * a neutral surface) and `label` is rendered inside the clip when given — text,
 * or a template reference for a node.
 */
export interface Clip {
  /** Stable identifier for the clip (used as the row key + handler arg). */
  id: string
  /** Clip start time on the lane in seconds. */
  startTime: number
  /** Clip duration in seconds. Always positive — minimum is enforced. */
  duration: number
  /** Optional accent color for the clip body (any valid CSS color). */
  color?: string
  /** Optional inline label rendered on top of the clip body: text or a template. */
  label?: string | number | TemplateRef<unknown>
}

/**
 * Props accepted by {@link TrackLane} — the same props
 * `@molecule/app-feature-track-lane-react` accepts. A node-valued prop (`name`)
 * is text or a `TemplateRef` in Angular.
 */
export interface TrackLaneProps {
  /** Optional lane name shown in the leading lane header: text or a template. */
  name?: string | number | TemplateRef<unknown> | null
  /** Clips on this lane. Order is preserved as-is. */
  clips: Clip[]
  /** Horizontal time scale, defaults to 20. */
  pixelsPerSecond?: number
  /**
   * Optional opaque lane identifier. Forwarded to handlers and emitted as
   * `data-lane` so multi-lane parents can tell lanes apart.
   */
  lane?: string
  /** Lane row height in pixels. Defaults to 44. */
  height?: number
  /** Called when a clip is dragged horizontally. */
  onClipMove?: (clipId: string, startTime: number, lane?: string) => void
  /** Called when a clip's right edge handle is dragged. */
  onClipResize?: (clipId: string, duration: number, lane?: string) => void
  /** Called when a clip body is clicked (no drag). */
  onClipClick?: (clipId: string, lane?: string) => void
  /** Currently-selected clip id (renders the selection ring on that clip). */
  selectedClipId?: string
  /** Extra classes merged onto the root element. */
  className?: string
}
