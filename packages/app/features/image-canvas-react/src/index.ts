/**
 * Image canvas — Canvas2D image-editing surface with a CSS filter chain
 * (brightness, contrast, saturation, hue, sepia, grayscale, blur,
 * sharpen), pointer-event drag panning, wheel zooming, and a data-URL
 * export handle.
 *
 * Used by the photo-editor flagship as the workspace surface for the
 * editing pipeline. The component owns no editor-state — callers pass
 * `filters`, `zoom`, and `pan` and listen on `onChange` for user-driven
 * pan / zoom updates. `exportRef.current.toDataURL()` snapshots the
 * current rendered image for "save" / "export" actions.
 *
 * @example
 * ```tsx
 * import { useRef, useState } from 'react'
 *
 * import {
 *   ImageCanvas,
 *   type ImageCanvasExportHandle,
 *   type PanOffset,
 * } from '@molecule/app-feature-image-canvas-react'
 * import { useTranslation } from '@molecule/app-react'
 * import { Button } from '@molecule/app-ui-react'
 *
 * export function PhotoEditor() {
 *   const { t } = useTranslation()
 *   const exportRef = useRef<ImageCanvasExportHandle>(null)
 *   const [zoom, setZoom] = useState(1)
 *   const [pan, setPan] = useState<PanOffset>({ x: 0, y: 0 })
 *   const [exported, setExported] = useState<string | null>(null)
 *   return (
 *     <>
 *       <ImageCanvas
 *         src="/photo.jpg"
 *         width={640}
 *         height={480}
 *         filters={{ brightness: 1.1, contrast: 1.2, sepia: 0.3 }}
 *         zoom={zoom}
 *         pan={pan}
 *         onChange={(next) => {
 *           setZoom(next.zoom)
 *           setPan(next.pan)
 *         }}
 *         exportRef={exportRef}
 *       />
 *       <Button onClick={() => setExported(exportRef.current?.toDataURL('image/jpeg', 0.92) ?? null)}>
 *         {t('common.export', undefined, { defaultValue: 'Export' })}
 *       </Button>
 *       {exported && (
 *         <a href={exported} download="photo-edited.jpg">
 *           {t('common.download', undefined, { defaultValue: 'Download' })}
 *         </a>
 *       )}
 *     </>
 *   )
 * }
 * ```
 *
 * @remarks
 * It calls `useTranslation()` from `@molecule/app-react`, so it MUST render
 * inside `<I18nProvider>` / `<MoleculeProvider>` (it throws otherwise), and
 * `getClassMap()` throws unless `setClassMap(classMap)` from
 * `@molecule/app-ui` ran at startup.
 *
 * It does NOT save or upload anything: `toDataURL(type, quality)` returns a
 * `data:` URL string (`''` before the canvas mounts) — you download or POST
 * it yourself. Filter values are multipliers (`1` = unchanged), not
 * percentages; `hue` is in degrees and `blur` in CSS pixels.
 *
 * Pan / zoom interaction is CONTROLLED-ONLY: pointer-drag and wheel
 * events call `onChange` with the proposed `{ zoom, pan }` and never
 * mutate internal state. If you do not pass `onChange` and feed the
 * values back through the `zoom` / `pan` props, dragging and scrolling
 * do nothing.
 *
 * URL sources load with `crossOrigin="anonymous"` so `toDataURL()` is
 * never blocked by a tainted canvas — which means remote images MUST be
 * served with CORS headers (`Access-Control-Allow-Origin`), otherwise
 * the image fails to load and the error state renders. Same-origin and
 * data-URL sources are unaffected.
 *
 * The canvas bitmap is exactly `width` x `height` device-independent
 * pixels — there is no devicePixelRatio upscaling. For crisp retina
 * display / export, pass doubled `width` / `height` and size the
 * element down via `className`. Filters rely on Canvas2D
 * `context.filter` support; on engines without it (older Safari) the
 * image renders unfiltered.
 *
 * @module
 */

export * from './ImageCanvas.js'
