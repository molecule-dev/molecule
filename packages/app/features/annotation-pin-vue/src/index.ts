/**
 * Vue annotation pin / hotspot overlay primitives.
 *
 * Exports `<AnnotationPin>` (single click-to-toggle marker) and
 * `<AnnotationLayer>` (parent wrapper that manages many pins on a
 * surface). Reusable for 3d-model viewers, image annotations, map
 * pins, and hotspot tours. It is the Vue counterpart of
 * `@molecule/app-annotation-pin-react`: same props (React names) and the
 * same DOM for the same input, so an app switches framework by changing
 * only the package name in its imports.
 *
 * @example
 * ```ts
 * import { defineComponent, h, ref } from 'vue'
 * import { AnnotationLayer, type Pin } from '@molecule/app-annotation-pin-vue'
 *
 * const ImageAnnotator = defineComponent({
 *   props: { src: { type: String, required: true } },
 *   setup(props) {
 *     const pins = ref<Pin[]>([])
 *     const activeId = ref<string | null>(null)
 *
 *     const addPin = ({ x, y }: { x: number; y: number }): void => {
 *       const id = crypto.randomUUID()
 *       pins.value = [...pins.value, { id, position: { x, y }, label: pins.value.length + 1 }]
 *       activeId.value = id
 *     }
 *
 *     return () =>
 *       h(
 *         AnnotationLayer,
 *         {
 *           pins: pins.value,
 *           activePinId: activeId.value,
 *           onPinClick: (id: string) => {
 *             activeId.value = id === activeId.value ? null : id
 *           },
 *           onSurfaceClick: addPin,
 *         },
 *         { default: () => [h('img', { src: props.src, alt: '', style: { width: '100%', display: 'block' } })] },
 *       )
 *   },
 * })
 * ```
 *
 * @remarks
 * Selection is fully controlled — the layer never stores the active pin;
 * manage `activePinId` yourself and toggle it in `onPinClick`. `position`
 * is normalised 0..1 by default (fractions of the layer box, so pins
 * re-anchor on resize); pass `normalised={false}` for raw pixel offsets —
 * on BOTH `<AnnotationLayer>` and any directly-rendered `<AnnotationPin>`,
 * or clicks and markers will disagree. The layer wraps the default slot in
 * a `position: relative` box; a bare `<AnnotationPin>` needs its own
 * positioned ancestor. Node-valued props (`label`, `note`, the layer's
 * content) arrive as a prop AND a same-named slot; components accept
 * either. Translations come from the companion
 * `@molecule/app-locales-annotation-pin` locale bond.
 *
 * @module
 */

export * from './AnnotationLayer.js'
export * from './AnnotationPin.js'
export * from './types.js'
