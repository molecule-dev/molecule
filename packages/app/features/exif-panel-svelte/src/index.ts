/**
 * Svelte EXIF metadata panel for photo-sharing apps.
 *
 * Exports `ExifPanel` — a structured renderer for already-parsed EXIF data
 * (camera, lens, aperture, shutter, ISO, focal length, GPS, timestamp,
 * software, copyright). The caller is responsible for decoding the raw EXIF
 * payload (e.g. via the `exifr` library); this package is a
 * styling-agnostic, i18n-aware renderer only.
 *
 * Also exports the `ExifData` and `ExifPanelProps` types and the pure
 * formatting helpers (`formatAperture`, `formatShutter`, `formatIso`,
 * `formatFocalLength`, `formatGps`, `formatTimestamp`, `formatCamera`,
 * `buildMapLink`, `formatDms`).
 *
 * It is the Svelte counterpart of `@molecule/app-exif-panel-react`: the same
 * props (React names) and the same DOM for the same input.
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { ExifPanel } from '@molecule/app-exif-panel-svelte'
 *
 *   let { exif } = $props()
 * </script>
 *
 * <ExifPanel {exif} showGps compact={false} />
 * ```
 *
 * @remarks
 * Requires a bonded ClassMap (`getClassMap()`) and the binding's i18n
 * context (`setMoleculeContext({ i18n })`) for `useTranslation()`. All
 * user-facing text resolves through `t()` with React's keys and English
 * `defaultValue`s.
 *
 * @module
 */

export * from './components.js'
export * from './format.js'
export * from './types.js'
