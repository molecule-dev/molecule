/**
 * Types of `@molecule/app-image-gallery-angular` — the Angular counterpart of
 * `@molecule/app-image-gallery-react`, same props and DOM.
 *
 * @module
 */

/** Props accepted by the {@link ImageGallery} component. */
export interface ImageGalleryProps {
  /** Image URLs in display order. */
  images: string[]
  /** Controlled selected index — caller owns state. */
  selectedIndex?: number
  /**
   * Called when a thumbnail is clicked. In Angular this is the component's
   * `select` output (`(select)="onSelect($event)"`); an input cannot carry a
   * callback.
   */
  onSelect?: (index: number) => void
  /** Max thumbnails shown. Extra are summarised as "+N". */
  maxThumbnails?: number
  /** Alt-text for screen readers. Applied per-image; falls back to `'Image N'`. */
  alts?: string[]
  /** Extra classes on the outer wrapper. */
  className?: string
}
