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
 * @remarks
 * Selection is fully controlled — the layer never stores the active pin;
 * manage `activePinId` yourself and toggle it in `onPinClick`. `position`
 * is normalised 0..1 by default (fractions of the layer box, so pins
 * re-anchor on resize); pass `normalised={false}` for raw pixel offsets —
 * on BOTH `<AnnotationLayer>` and any directly-rendered `<AnnotationPin>`,
 * or clicks and markers will disagree. The layer wraps `children` in a
 * `position: relative` box; a bare `<AnnotationPin>` needs its own
 * positioned ancestor. Translations come from the companion
 * `@molecule/app-locales-annotation-pin` locale bond.
 *
 * @module
 */

export * from './AnnotationLayer.js'
export * from './AnnotationPin.js'
