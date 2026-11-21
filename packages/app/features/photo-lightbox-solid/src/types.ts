/**
 * Types for the Solid fullscreen photo viewer.
 *
 * @module
 */

import type { JSX } from 'solid-js'

/**
 * A single photo entry for the lightbox, with src, optional alt text, and
 * optional caption (a Solid node or plain text).
 */
export interface LightboxPhoto {
  /** Image URL. */
  src: string
  /** Alternative text (also the dialog's accessible label when present). */
  alt?: string
  /** Optional caption rendered under the image. */
  caption?: JSX.Element
}

/** Props accepted by the {@link PhotoLightbox} component (React's names). */
export interface PhotoLightboxProps {
  /** Photos to browse. */
  photos: LightboxPhoto[]
  /** Whether the lightbox is open. */
  open: boolean
  /** Called when the user closes (close button, backdrop, Escape). */
  onClose: () => void
  /** Initial active index. Defaults to `0`. */
  initialIndex?: number
  /** Called whenever the active index changes (arrows, keyboard). */
  onIndexChange?: (index: number) => void
}
