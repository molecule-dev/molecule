/**
 * Vue positioned + draggable + resizable canvas node.
 *
 * @module
 */

import { defineComponent, h, type PropType, useId, type VNode, type VNodeChild } from 'vue'

import { getClassMap } from '@molecule/app-ui'
import { useTranslation } from '@molecule/app-vue'

import type { CanvasDragInfo, CanvasItemId, CanvasResizeInfo, Point, Size } from './types.js'

/**
 * Read the canvas zoom from the nearest surface ancestor (defaults to 1).
 *
 * @param el - The element the gesture runs on.
 * @returns The surface zoom, or 1 when no ancestor carries one.
 */
function readSurfaceZoom(el: Element | null): number {
  let cur: Element | null = el
  while (cur) {
    const z = cur.getAttribute?.('data-canvas-zoom')
    if (z != null) {
      const parsed = parseFloat(z)
      if (Number.isFinite(parsed) && parsed > 0) return parsed
    }
    cur = cur.parentElement
  }
  return 1
}

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
 * Generic positioned + draggable + resizable wrapper. Renders into the
 * canvas-coordinate-space layer of `<CanvasSurface>`.
 *
 * The base is intentionally minimal — it owns:
 *   - absolute positioning at `position` (canvas units).
 *   - optional explicit `size` (canvas units).
 *   - `onSelect` on pointerdown (with `e.stopPropagation()` so the
 *     surface doesn't pan).
 *   - `onDrag` from any pointerdown on the node body.
 *   - `onResize` from a SE-corner handle (only rendered if `onResize`
 *     is supplied).
 *
 * It does NOT own visual chrome — wrapper packages compose chrome on
 * top via the default slot.
 *
 * Accessibility: the base renders as `role="group"` named by `aria-label`.
 * `aria-selected` is not valid on a group, and the selectable roles
 * (`option`, `gridcell`, `treeitem`) need a listbox, grid or tree parent the
 * `role="application"` surface is not; `option` would also flatten the
 * resize handle button. A selected node is therefore described by a hidden
 * "Selected" text through `aria-describedby`.
 *
 * This is the Vue counterpart of `@molecule/app-feature-canvas-react`'s
 * `<CanvasNode>`: the same props (React names) and the same DOM for the same
 * input.
 *
 * @param props - Component props (React names).
 * @returns The node component.
 */
export const CanvasNode = defineComponent({
  name: 'CanvasNode',
  props: {
    id: { type: String as PropType<CanvasItemId>, default: undefined },
    position: { type: Object as PropType<Point>, required: true },
    size: { type: Object as PropType<Size>, default: undefined },
    selected: { type: Boolean, default: false },
    onSelect: {
      type: Function as PropType<(id: CanvasItemId | undefined, e: PointerEvent) => void>,
      default: undefined,
    },
    onDrag: { type: Function as PropType<(info: CanvasDragInfo) => void>, default: undefined },
    onResize: {
      type: Function as PropType<(info: CanvasResizeInfo) => void>,
      default: undefined,
    },
    ariaLabel: String,
    children: null,
    className: String,
  },
  setup(props, { slots }) {
    const cm = getClassMap()
    const { t } = useTranslation()

    // Drag gesture state.
    let dragPointerId: number | null = null
    let dragLastScreen: { x: number; y: number } | null = null
    let dragPosition: Point = props.position
    let movedDuringGesture = false

    // Resize gesture state.
    let resizePointerId: number | null = null
    let resizeStartScreen: { x: number; y: number } | null = null
    let resizeStartSize: Size | null = null

    const onPointerDown = (e: PointerEvent): void => {
      // Block surface pan.
      e.stopPropagation()
      if (e.button !== 0 && e.pointerType === 'mouse') return
      dragPointerId = e.pointerId
      dragLastScreen = { x: e.clientX, y: e.clientY }
      dragPosition = props.position
      movedDuringGesture = false
      try {
        ;(e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId)
      } catch (_error) {
        // setPointerCapture throws in jsdom; the drag still works without it.
      }
    }

    const onPointerMove = (e: PointerEvent): void => {
      if (dragPointerId !== e.pointerId) return
      const last = dragLastScreen
      if (!last) return
      const zoom = readSurfaceZoom(e.currentTarget as Element) || 1
      const dx = (e.clientX - last.x) / zoom
      const dy = (e.clientY - last.y) / zoom
      if (dx === 0 && dy === 0) return
      dragLastScreen = { x: e.clientX, y: e.clientY }
      const next: Point = { x: dragPosition.x + dx, y: dragPosition.y + dy }
      const start = !movedDuringGesture
      movedDuringGesture = true
      dragPosition = next
      props.onDrag?.({ position: next, delta: { x: dx, y: dy }, start, end: false })
    }

    const onPointerUp = (e: PointerEvent): void => {
      if (dragPointerId !== e.pointerId) return
      dragPointerId = null
      dragLastScreen = null
      try {
        ;(e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId)
      } catch (_error) {
        // releasePointerCapture throws in jsdom; capture was never held there.
      }
      if (movedDuringGesture) {
        props.onDrag?.({
          position: dragPosition,
          delta: { x: 0, y: 0 },
          start: false,
          end: true,
        })
      } else {
        props.onSelect?.(props.id, e)
      }
      movedDuringGesture = false
    }

    const onResizePointerDown = (e: PointerEvent): void => {
      e.stopPropagation()
      if (!props.onResize || !props.size) return
      if (e.button !== 0 && e.pointerType === 'mouse') return
      resizePointerId = e.pointerId
      resizeStartScreen = { x: e.clientX, y: e.clientY }
      resizeStartSize = { width: props.size.width, height: props.size.height }
      try {
        ;(e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId)
      } catch (_error) {
        // setPointerCapture throws in jsdom; the resize still works without it.
      }
    }

    const onResizePointerMove = (e: PointerEvent): void => {
      if (resizePointerId !== e.pointerId) return
      if (!props.onResize) return
      const start = resizeStartScreen
      const startSize = resizeStartSize
      if (!start || !startSize) return
      const zoom = readSurfaceZoom(e.currentTarget as Element) || 1
      const dx = (e.clientX - start.x) / zoom
      const dy = (e.clientY - start.y) / zoom
      props.onResize({
        position: props.position,
        size: {
          width: Math.max(0, startSize.width + dx),
          height: Math.max(0, startSize.height + dy),
        },
        end: false,
      })
    }

    const onResizePointerUp = (e: PointerEvent): void => {
      if (resizePointerId !== e.pointerId) return
      resizePointerId = null
      const startSize = resizeStartSize
      resizeStartScreen = null
      resizeStartSize = null
      try {
        ;(e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId)
      } catch (_error) {
        // releasePointerCapture throws in jsdom; capture was never held there.
      }
      if (props.onResize && startSize) {
        props.onResize({
          position: props.position,
          size: props.size ?? startSize,
          end: true,
        })
      }
    }

    const selectedDescriptionId = useId()

    return (): VNode => {
      const resolvedAriaLabel =
        props.ariaLabel ?? t('canvas.aria.node', {}, { defaultValue: 'Canvas node' })
      const resolvedHandleAriaLabel = t(
        'canvas.aria.resizeHandle',
        {},
        {
          defaultValue: 'Resize node',
        },
      )

      const wrapperStyle: Record<string, string> = {
        position: 'absolute',
        left: `${props.position.x}px`,
        top: `${props.position.y}px`,
      }
      if (props.size) {
        wrapperStyle.width = `${props.size.width}px`
        wrapperStyle.height = `${props.size.height}px`
      }
      wrapperStyle.touchAction = 'none'

      const children: VNodeChild[] = slotOrProp(slots.default, props.children)
      if (props.selected)
        children.push(
          h(
            'span',
            { id: selectedDescriptionId, hidden: true },
            t('canvas.aria.nodeSelected', {}, { defaultValue: 'Selected' }),
          ),
        )
      if (props.onResize && props.size)
        children.push(
          h('div', {
            role: 'button',
            'aria-label': resolvedHandleAriaLabel,
            'data-mol-id': props.id
              ? `canvas-node-resize-handle-${props.id}`
              : 'canvas-node-resize-handle',
            style: {
              position: 'absolute',
              right: '0px',
              bottom: '0px',
              width: '12px',
              height: '12px',
              cursor: 'se-resize',
              touchAction: 'none',
            },
            onPointerdown: onResizePointerDown,
            onPointermove: onResizePointerMove,
            onPointerup: onResizePointerUp,
            onPointercancel: onResizePointerUp,
          }),
        )

      return h(
        'div',
        {
          role: 'group',
          'aria-label': resolvedAriaLabel,
          'aria-describedby': props.selected ? selectedDescriptionId : undefined,
          'data-mol-id': props.id ? `canvas-node-${props.id}` : 'canvas-node',
          'data-canvas-node-id': props.id,
          'data-selected': props.selected ? 'true' : undefined,
          class: cm.cn(cm.position('absolute'), props.className),
          style: wrapperStyle,
          onPointerdown: onPointerDown,
          onPointermove: onPointerMove,
          onPointerup: onPointerUp,
          onPointercancel: onPointerUp,
        },
        children,
      )
    }
  },
})
