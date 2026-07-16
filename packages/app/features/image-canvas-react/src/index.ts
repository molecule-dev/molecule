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
 * import { ImageCanvas, type ImageCanvasExportHandle } from '@molecule/app-feature-image-canvas-react'
 *
 * function Editor() {
 *   const exportRef = useRef<ImageCanvasExportHandle>(null)
 *   const [zoom, setZoom] = useState(1)
 *   const [pan, setPan] = useState({ x: 0, y: 0 })
 *   return (
 *     <>
 *       <ImageCanvas
 *         src="/photo.jpg"
 *         filters={{ brightness: 1.1, contrast: 1.2, sepia: 0.3 }}
 *         zoom={zoom}
 *         pan={pan}
 *         onChange={({ zoom, pan }) => { setZoom(zoom); setPan(pan) }}
 *         exportRef={exportRef}
 *       />
 *       <button onClick={() => download(exportRef.current?.toDataURL('image/jpeg', 0.92))}>
 *         Save
 *       </button>
 *     </>
 *   )
 * }
 * ```
 *
 * @remarks
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
