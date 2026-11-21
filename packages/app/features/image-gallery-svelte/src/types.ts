/**
 * Types for the Svelte image gallery.
 *
 * @module
 */

/** Props accepted by the {@link ImageGallery} component. */
export interface ImageGalleryProps {
  /** Image URLs in display order. */
  images: string[]
  /** Controlled selected index — caller owns state. */
  selectedIndex?: number
  /** Called when a thumbnail is clicked. */
  onSelect?: (index: number) => void
  /** Max thumbnails shown. Extra are summarised as "+N". */
  maxThumbnails?: number
  /**
   * Alt-text for screen readers. Applied per-image; falls back through i18n to
   * `'Image {{number}}'` (`imageGallery.alt.fallback`).
   */
  alts?: string[]
  /** Extra classes on the outer wrapper. */
  className?: string
}
