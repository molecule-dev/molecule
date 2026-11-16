/**
 * Solid annotation pin / hotspot overlay primitives.
 *
 * Exports `AnnotationPin` (single click-to-toggle marker) and
 * `AnnotationLayer` (parent wrapper that manages many pins on a
 * surface). Reusable for 3d-model viewers, image annotations, map
 * pins, and hotspot tours. It is the Solid counterpart of
 * `@molecule/app-annotation-pin-react`: same props (React names) and the
 * same DOM for the same input, so an app switches framework by changing
 * only the package name in its imports.
 *
 * @example
 * ```tsx
 * import { createSignal, For } from 'solid-js'
 * import { AnnotationLayer, type Pin } from '@molecule/app-annotation-pin-solid'
 *
 * export function ImageAnnotator(props: { src: string }) {
 *   const [pins, setPins] = createSignal<Pin[]>([])
 *   const [activeId, setActiveId] = createSignal<string | null>(null)
 *
 *   return (
 *     <AnnotationLayer
 *       pins={pins()}
 *       activePinId={activeId()}
 *       onPinClick={(id) => setActiveId(id === activeId() ? null : id)}
 *       onSurfaceClick={({ x, y }) => {
 *         const id = crypto.randomUUID()
 *         setPins([...pins(), { id, position: { x, y }, label: pins().length + 1 }])
 *         setActiveId(id)
 *       }}
 *     >
 *       <img src={props.src} alt="" style={{ width: '100%', display: 'block' }} />
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

export * from './AnnotationLayer.jsx'
export * from './AnnotationPin.jsx'
export * from './types.js'
