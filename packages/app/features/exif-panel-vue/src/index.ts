/**
 * Vue EXIF metadata panel for photo-sharing apps.
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
 * It is the Vue counterpart of `@molecule/app-exif-panel-react`: the same
 * props (React names), the same ClassMap tokens and the same DOM for the
 * same input.
 *
 * @example
 * ```ts
 * import { createApp, defineComponent, h } from 'vue'
 * import { ExifPanel } from '@molecule/app-exif-panel-vue'
 *
 * const PhotoMetadata = defineComponent({
 *   props: { exif: { type: Object, required: true } },
 *   setup(props) {
 *     return () => h(ExifPanel, { exif: props.exif, showGps: true, compact: false })
 *   },
 * })
 *
 * createApp(PhotoMetadata, { exif: parsedExif }).mount('#app')
 * ```
 *
 * @remarks
 * Requires a bonded ClassMap (`getClassMap()`) and the binding's i18n
 * provider for `useTranslation()` — the same requirements as the React
 * package. All user-facing text resolves through `t()` with React's keys
 * and English `defaultValue`s.
 *
 * @module
 */

export * from './ExifPanel.js'
export * from './format.js'
export * from './types.js'
