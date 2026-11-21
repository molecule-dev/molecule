/**
 * Types for the Svelte fullscreen photo viewer.
 *
 * @module
 */

import type { Snippet } from 'svelte'

/**
 * A single photo entry for the lightbox, with src, optional alt text, and
 * optional caption (a snippet or plain text).
 */
export interface LightboxPhoto {
  /** Image URL. */
  src: string
  /** Alternative text (also the dialog's accessible label when present). */
  alt?: string
  /** Optional caption rendered under the image. */
  caption?: Snippet | string
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
