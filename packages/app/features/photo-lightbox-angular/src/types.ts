/**
 * Types of `@molecule/app-photo-lightbox-angular` — the Angular counterpart of
 * `@molecule/app-photo-lightbox-react`, same props and DOM.
 *
 * @module
 */

/**
 * A single photo entry for the lightbox, with src, optional alt text, and
 * optional caption.
 */
export interface LightboxPhoto {
  /** Image URL. */
  src: string
  /** Alternative text (also the dialog's accessible label when present). */
  alt?: string
  /** Optional caption: a projected `<ng-template>` or plain text. */
  caption?: unknown
}

/** Props accepted by {@link PhotoLightbox} — the same props `@molecule/app-photo-lightbox-react` accepts. */
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
