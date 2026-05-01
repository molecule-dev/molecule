/**
 * EXIF metadata panel for photo-sharing apps.
 *
 * Exports `<ExifPanel>` — a structured renderer for already-parsed EXIF
 * data (camera, lens, aperture, shutter, ISO, focal length, GPS,
 * timestamp, software, copyright). The caller is responsible for
 * decoding the raw EXIF payload (e.g. via the `exifr` library); this
 * package is a styling-agnostic, i18n-aware renderer only.
 *
 * Also exports the `ExifData` and `ExifPanelProps` types and the pure
 * formatting helpers (`formatAperture`, `formatShutter`, `formatIso`,
 * `formatFocalLength`, `formatGps`, `formatTimestamp`, `formatCamera`,
 * `buildMapLink`, `formatDms`).
 *
 * @example
 * ```tsx
 * import { ExifPanel } from '@molecule/app-exif-panel-react'
 *
 * function PhotoMetadata({ exif }) {
 *   return <ExifPanel exif={exif} showGps compact={false} />
 * }
 * ```
 *
 * @module
 */

export * from './types.js'
export * from './format.js'
export * from './ExifPanel.js'
