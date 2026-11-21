/**
 * Vue pan/zoom container: the shared base every canvas variant builds on.
 *
 * @module
 */

import { defineComponent, h, type PropType, type VNode, type VNodeChild } from 'vue'

import { getClassMap } from '@molecule/app-ui'
import { useTranslation } from '@molecule/app-vue'

import { useCanvasViewport } from './hooks.js'
import type { CanvasViewport, ViewportLimits } from './types.js'

/**
 * Resolves the children that may arrive as the default slot or as a `children`
 * prop: the slot wins, and an absent pair contributes nothing.
 *
 * @param slot - The default slot render function, when the caller passed one.
 * @param prop - The `children` prop, when the caller passed it.
 * @returns The children to render.
 */
const slotOrProp = (
  slot: (() => VNodeChild[]) | undefined,
  prop: VNodeChild | null | undefined,
): VNodeChild[] => {
  if (slot) return slot()
  return prop != null ? [prop] : []
}

/**
 * Pan/zoom container — the shared base every canvas variant builds on.
 *
 * Wheel scroll zooms around the cursor; primary-button drag on the
 * empty surface pans; children render inside a CSS-transformed inner
 * layer so they live in canvas-coordinate-space (use
 * `screenToCanvas` / `canvasToScreen` to translate as needed).
 *
 * Children that handle their own pointer gestures (e.g.
 * `<CanvasNode>`) should call `e.stopPropagation()` on pointerdown to
 * suppress surface pan.
 *
 * This is the Vue counterpart of `@molecule/app-feature-canvas-react`'s
 * `<CanvasSurface>`: the same props (React names) and the same DOM for the
 * same input. Children arrive as the default slot or a `children` prop.
 *
 * @param props - Component props (React names).
 * @returns The canvas surface component.
 */
export const CanvasSurface = defineComponent({
  name: 'CanvasSurface',
  props: {
    viewport: { type: Object as PropType<CanvasViewport>, default: undefined },
    initialViewport: { type: Object as PropType<CanvasViewport>, default: undefined },
    onViewportChange: {
      type: Function as PropType<(next: CanvasViewport) => void>,
      default: undefined,
    },
    limits: { type: Object as PropType<ViewportLimits>, default: undefined },
    zoomFactor: { type: Number, default: 1.1 },
    panOnDrag: { type: Boolean, default: true },
    onBackgroundPointerDown: {
      type: Function as PropType<(e: PointerEvent) => void>,
      default: undefined,
    },
    width: { type: Number, required: true },
    height: { type: Number, required: true },
    ariaLabel: String,
    children: null,
    className: String,
  },
  setup(props, { slots }) {
    const cm = getClassMap()
    const { t } = useTranslation()

    const { viewport, panBy, zoomBy } = useCanvasViewport(() => ({
      initial: props.initialViewport,
      limits: props.limits,
      value: props.viewport,
      onChange: props.onViewportChange,
    }))

    // The root element, for the wheel's cursor-relative focal point.
    let rootEl: HTMLDivElement | null = null
    // Pointer id of the active pan gesture (null = no active pan).
    let panPointerId: number | null = null
    // Last screen-space position seen during the active pan, so each tick's
    // delta comes from the events themselves, never from `movementX`.
    let lastScreen: { x: number; y: number } | null = null

    const onPointerDown = (e: PointerEvent): void => {
      // Only react to gestures on the surface itself, not on children.
      if (e.target !== e.currentTarget) return
      props.onBackgroundPointerDown?.(e)
      if (!props.panOnDrag) return
      if (e.button !== 0 && e.pointerType === 'mouse') return
      panPointerId = e.pointerId
      lastScreen = { x: e.clientX, y: e.clientY }
      try {
        ;(e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId)
      } catch (_error) {
        // setPointerCapture throws in jsdom; the pan still works without it.
      }
    }

    const onPointerMove = (e: PointerEvent): void => {
      if (panPointerId !== e.pointerId) return
      const last = lastScreen
      if (!last) return
      const dx = e.clientX - last.x
      const dy = e.clientY - last.y
      lastScreen = { x: e.clientX, y: e.clientY }
      panBy(dx, dy)
    }

    const endPan = (e: PointerEvent): void => {
      if (panPointerId !== e.pointerId) return
      panPointerId = null
      lastScreen = null
      try {
        ;(e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId)
      } catch (_error) {
        // releasePointerCapture throws in jsdom; capture was never held there.
      }
    }

    const onWheel = (e: WheelEvent): void => {
      const rect = rootEl?.getBoundingClientRect()
      if (!rect) return
      const focalX = e.clientX - rect.left
      const focalY = e.clientY - rect.top
      const factor = e.deltaY < 0 ? props.zoomFactor : 1 / props.zoomFactor
      zoomBy(factor, focalX, focalY)
    }

    return (): VNode => {
      const vp = viewport.value
      const resolvedAriaLabel =
        props.ariaLabel ?? t('canvas.aria.surface', {}, { defaultValue: 'Canvas surface' })
      return h(
        'div',
        {
          ref: (el: unknown) => {
            rootEl = el as HTMLDivElement | null
          },
          role: 'application',
          'aria-label': resolvedAriaLabel,
          'data-mol-id': 'canvas-surface',
          class: cm.cn(cm.position('relative'), cm.surfaceSecondary, props.className),
          style: {
            position: 'relative',
            overflow: 'hidden',
            touchAction: 'none',
            width: `${props.width}px`,
            height: `${props.height}px`,
          },
          onPointerdown: onPointerDown,
          onPointermove: onPointerMove,
          onPointerup: endPan,
          onPointercancel: endPan,
          onWheel,
        },
        [
          h(
            'div',
            {
              'data-mol-id': 'canvas-surface-inner',
              'data-canvas-zoom': vp.zoom,
              'data-canvas-x': vp.x,
              'data-canvas-y': vp.y,
              style: {
                position: 'absolute',
                top: '0px',
                left: '0px',
                transformOrigin: '0 0',
                transform: `scale(${vp.zoom}) translate(${-vp.x}px, ${-vp.y}px)`,
                width: '0px',
                height: '0px',
              },
            },
            slotOrProp(slots.default, props.children),
          ),
        ],
      )
    }
  },
})
