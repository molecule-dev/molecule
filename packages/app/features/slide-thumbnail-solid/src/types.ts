/**
 * Types for the Solid slide thumbnail tile.
 *
 * @module
 */

import type { JSX } from 'solid-js'

/** Props for the {@link SlideThumbnail} component. */
export interface SlideThumbnailProps {
  /** Slide index (1-based). */
  index: number
  /** Live preview content (rendered scaled-down). */
  children?: JSX.Element
  /** Whether the thumbnail represents the active slide. */
  active?: boolean
  /** Click handler; receives the DOM click event (React's `onClick`). */
  onClick?: (event: MouseEvent) => void
  /** Optional aspect ratio (defaults to 16/9). */
  aspect?: '16/9' | '4/3' | '1/1'
  /** Width in pixels. Defaults to 160. */
  width?: number
  /** Extra classes. */
  className?: string
}
