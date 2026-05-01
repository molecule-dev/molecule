/**
 * Type definitions for the EXIF panel renderer.
 *
 * The caller is responsible for parsing the EXIF metadata (e.g. via the
 * `exifr` library) — this package only renders an already-parsed object
 * with normalized field names.
 *
 * @module
 */

/**
 * Parsed EXIF metadata. Every field is optional — extra fields are
 * permitted (the renderer ignores them) so callers can pass through the
 * full output of their EXIF parser without filtering.
 */
export interface ExifData {
  /** Camera manufacturer (e.g. `"Canon"`, `"Sony"`, `"Apple"`). */
  make?: string
  /** Camera model (e.g. `"EOS R5"`, `"a7 III"`, `"iPhone 15 Pro"`). */
  model?: string
  /** Lens model description (e.g. `"RF 24-70mm F2.8 L IS USM"`). */
  lensModel?: string
  /** Aperture as an f-number (the `N` in `f/N`). */
  fNumber?: number
  /** Exposure / shutter time in seconds (e.g. `0.008` ≈ `1/125 s`). */
  exposureTime?: number
  /** ISO sensitivity (e.g. `100`, `1600`). */
  iso?: number
  /** Focal length in millimetres. */
  focalLength?: number
  /** 35 mm-equivalent focal length, when supplied by the camera. */
  focalLength35mm?: number
  /** Capture timestamp — `Date`, ISO 8601 string, or epoch millis. */
  dateTimeOriginal?: Date | string | number
  /** GPS latitude in signed decimal degrees. */
  gpsLatitude?: number
  /** GPS longitude in signed decimal degrees. */
  gpsLongitude?: number
  /** EXIF orientation tag (1–8). */
  orientation?: number
  /** Software / firmware that produced the file. */
  software?: string
  /** Copyright statement embedded in the file. */
  copyright?: string
  /** Pass-through for parser-specific extras the renderer ignores. */
  [key: string]: unknown
}

/**
 * Props for the `<ExifPanel>` component.
 */
export interface ExifPanelProps {
  /** Parsed EXIF metadata. */
  exif: ExifData
  /**
   * Compact mode collapses the panel into a single condensed grid with
   * smaller type and tighter spacing. Defaults to `false`.
   */
  compact?: boolean
  /**
   * Whether to render the GPS coordinates row when latitude / longitude
   * are present. Defaults to `true`.
   */
  showGps?: boolean
  /** Optional heading override. */
  heading?: string
  /** Extra classes appended to the panel root. */
  className?: string
}
