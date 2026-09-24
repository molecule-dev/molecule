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
 * import { useState } from 'react'
 *
 * import { AnnotationLayer, type Pin } from '@molecule/app-annotation-pin-react'
 *
 * export function ImageAnnotator() {
 *   const [pins, setPins] = useState<Pin[]>([
 *     { id: 'pin-1', position: { x: 0.25, y: 0.4 }, label: 1, note: 'Scratch on the lid' },
 *   ])
 *   const [activeId, setActiveId] = useState<string | null>(null)
 *   return (
 *     <AnnotationLayer
 *       pins={pins}
 *       activePinId={activeId}
 *       onPinClick={(id) => setActiveId(id === activeId ? null : id)}
 *       onSurfaceClick={({ x, y }) => {
 *         const id = `pin-${pins.length + 1}`
 *         setPins([...pins, { id, position: { x, y }, label: pins.length + 1 }])
 *         setActiveId(id)
 *       }}
 *     >
 *       <img src="/uploads/product-photo.jpg" alt="" style={{ width: '100%', display: 'block' }} />
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
 * Both components call `useTranslation()` from `@molecule/app-react`, so they
 * MUST render inside `<I18nProvider>` / `<MoleculeProvider>` (it throws
 * otherwise), and `getClassMap()` throws unless `setClassMap(classMap)` from
 * `@molecule/app-ui` ran at startup. Nothing is persisted: `onSurfaceClick`
 * only reports coordinates — adding the pin to state (and saving it) is yours.
 * A selected pin with no `note` shows the translated "No notes for this pin."
 *
 * @module
 */

export * from './AnnotationLayer.js'
export * from './AnnotationPin.js'
