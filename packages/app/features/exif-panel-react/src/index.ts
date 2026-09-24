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
 * import { type ExifData, ExifPanel } from '@molecule/app-exif-panel-react'
 *
 * // What an EXIF parser returns (e.g. `await exifr.parse(file)` — PascalCase tags).
 * const parsed = {
 *   Make: 'Sony', Model: 'ILCE-7M3', LensModel: 'FE 35mm F1.8', FNumber: 1.8, ExposureTime: 0.004,
 *   ISO: 200, FocalLength: 35, DateTimeOriginal: new Date('2024-06-01T18:30:00Z'), latitude: 37.8199, longitude: -122.4783,
 * }
 *
 * // Map it to the panel's camelCase fields — raw parser keys are NOT recognised.
 * const exif: ExifData = {
 *   make: parsed.Make, model: parsed.Model, lensModel: parsed.LensModel, fNumber: parsed.FNumber,
 *   exposureTime: parsed.ExposureTime, iso: parsed.ISO, focalLength: parsed.FocalLength,
 *   dateTimeOriginal: parsed.DateTimeOriginal, gpsLatitude: parsed.latitude, gpsLongitude: parsed.longitude,
 * }
 *
 * export function PhotoMetadata() {
 *   return <ExifPanel exif={exif} heading="Photo details" />
 * }
 * ```
 *
 * @remarks
 * - It does NOT parse EXIF: pass an already-parsed object whose keys are the
 *   camelCase `ExifData` fields (`make`, `fNumber`, `exposureTime` in SECONDS,
 *   `iso`, `gpsLatitude`/`gpsLongitude` in signed decimal degrees). Parser
 *   output passed straight through (`Make`, `FNumber`, `ISO`, `latitude`) is
 *   silently ignored and the panel renders only its header.
 * - `showGps` defaults to TRUE: coordinates render with an OpenStreetMap link.
 *   Pass `showGps={false}` on public pages unless the owner opted in — the
 *   panel does not strip location for you.
 * - The capture time is formatted with `Date#toLocaleString()` in the
 *   runtime's locale/time zone (not the app's i18n locale).
 * - Must render inside `<I18nProvider>` / `<MoleculeProvider>` (it calls
 *   `useTranslation()`; labels use `exifPanel.*` keys with English
 *   fallbacks), and `getClassMap()` throws unless `setClassMap(classMap)`
 *   from `@molecule/app-ui` ran at startup.
 *
 * @module
 */

export * from './ExifPanel.js'
export * from './format.js'
export * from './types.js'
