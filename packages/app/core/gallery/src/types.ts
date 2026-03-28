/**
 * Gallery types for molecule.dev.
 *
 * Defines the provider interface and data types for image gallery
 * and lightbox UI components.
 *
 * @module
 */

/**
 * A single item in an image gallery.
 */
export interface GalleryItem {
  /** Full-resolution image source URL. */
  src: string

  /** Optional thumbnail image source URL. */
  thumbnail?: string

  /** Image width in pixels. */
  width: number

  /** Image height in pixels. */
  height: number

  /** Alternative text for accessibility. */
  alt?: string

  /** Optional caption displayed below the image. */
  caption?: string
}

/**
 * Configuration options for creating a gallery.
 */
export interface GalleryOptions {
  /** Items to display in the gallery. */
  items: GalleryItem[]

  /** Index of the initially visible item. Defaults to `0`. */
  startIndex?: number

  /** Callback when the gallery is closed. */
  onClose?: () => void

  /** Whether to show thumbnail navigation strip. Defaults to `false`. */
  showThumbnails?: boolean

  /** Whether to show item counter (e.g. "3 / 10"). Defaults to `true`. */
  showCounter?: boolean

  /** Whether to enable zoom functionality. Defaults to `true`. */
  zoomable?: boolean
}

/**
 * A live gallery instance returned by the provider.
 */
export interface GalleryInstance {
  /**
   * Opens the gallery at the specified index.
   *
   * @param index - Zero-based index to open at. Defaults to `0`.
   */
  open(index?: number): void

  /**
   * Closes the gallery.
   */
  close(): void

  /**
   * Advances to the next item.
   */
  next(): void

  /**
   * Goes back to the previous item.
   */
  previous(): void

  /**
   * Jumps to a specific item by index.
   *
   * @param index - Zero-based item index.
   */
  goTo(index: number): void

  /**
   * Returns the index of the currently visible item.
   *
   * @returns Zero-based index of the current item.
   */
  getCurrentIndex(): number
}

/**
 * Gallery provider interface.
 *
 * All gallery providers must implement this interface to create
 * and manage image gallery / lightbox UI.
 */
export interface GalleryProvider {
  /** Provider name identifier. */
  readonly name: string

  /**
   * Creates a new gallery instance.
   *
   * @param options - Configuration for the gallery.
   * @returns A gallery instance for controlling the lightbox.
   */
  createGallery(options: GalleryOptions): GalleryInstance
}
