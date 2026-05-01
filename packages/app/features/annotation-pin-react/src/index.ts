/**
 * Annotation pin / hotspot overlay primitives.
 *
 * Exports `<AnnotationPin>` (single click-to-toggle marker) and
 * `<AnnotationLayer>` (parent wrapper that manages many pins on a
 * surface). Reusable for 3d-model viewers, image annotations, map
 * pins, and hotspot tours.
 *
 * @example
 * ```tsx
 * import { AnnotationLayer, type Pin } from '@molecule/app-annotation-pin-react'
 *
 * function ImageAnnotator({ src, pins, setPins, activeId, setActiveId }) {
 *   return (
 *     <AnnotationLayer
 *       pins={pins}
 *       activePinId={activeId}
 *       onPinClick={(id) => setActiveId(id === activeId ? null : id)}
 *       onSurfaceClick={({ x, y }) => {
 *         const id = crypto.randomUUID()
 *         setPins([...pins, { id, position: { x, y }, label: pins.length + 1 }])
 *         setActiveId(id)
 *       }}
 *     >
 *       <img src={src} alt="" style={{ width: '100%', display: 'block' }} />
 *     </AnnotationLayer>
 *   )
 * }
 * ```
 *
 * @module
 */

export * from './AnnotationPin.js'
export * from './AnnotationLayer.js'
