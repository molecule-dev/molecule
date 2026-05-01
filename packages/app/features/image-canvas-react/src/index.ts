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
 * @module
 */

export * from './ImageCanvas.js'
