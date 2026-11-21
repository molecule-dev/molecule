/**
 * Vue `<CanvasEngine>` — vector design-tool wrapper around the shared
 * `<CanvasSurface>` (pan/zoom) base. Adds multi-select, marquee, alignment,
 * group/ungroup, snap-to-grid and undo/redo.
 *
 * The Vue counterpart of `@molecule/app-canvas-engine-react`'s `<CanvasEngine>`:
 * the same props (React names), the same ClassMap classes, the same inline
 * styles and the same DOM for the same input, and the same callbacks. The
 * imperative handle (`undo`, `redo`, `align`, `group`, …) is exposed on the
 * component instance, so a host reaches it through a template ref:
 * `engine.value?.undo()`.
 *
 * The component is dual-mode: `document` is treated as controlled when
 * `onChange` is supplied, otherwise the initial document seeds internal state.
 * `selection` follows the same convention.
 *
 * @module
 */

import { defineComponent, h, type PropType, ref, type VNode, watch } from 'vue'

import type { Bounds, CanvasViewport } from '@molecule/app-feature-canvas-vue'
import { CanvasSurface, screenToCanvas } from '@molecule/app-feature-canvas-vue'
import { getClassMap } from '@molecule/app-ui'
import { useTranslation } from '@molecule/app-vue'

import { alignLayers, distributeLayers } from './alignment.js'
import { combinedBounds, elementBounds, rectsIntersect, snapToGrid } from './geometry.js'
import { DEFAULT_HISTORY_LIMIT, HistoryStack } from './history.js'
import type {
  CanvasAlignment,
  CanvasDistribution,
  CanvasDocument,
  CanvasSelection,
  VectorElement,
  VectorElementId,
  VectorGroup,
} from './types.js'
import { VectorElementSvg } from './VectorElementSvg.js'

/** `<CanvasEngine>` props. */
export interface CanvasEngineProps {
  /** Document to render. Treated as controlled when `onChange` is set. */
  document: CanvasDocument
  /**
   * Called whenever the engine mutates the document (drag, align, group,
   * undo, redo). Required for controlled mode; absent in uncontrolled mode.
   */
  onChange?: (next: CanvasDocument) => void
  /** Currently-selected element ids. Treated as controlled when `onSelectionChange` is set. */
  selection?: CanvasSelection
  /** Notified whenever the selection set changes. */
  onSelectionChange?: (next: CanvasSelection) => void
  /** Snap newly-positioned elements to the nearest grid line. Defaults to `true`. */
  snapToGrid?: boolean
  /** Grid spacing in canvas units (visual + snap target). Defaults to `8`. */
  gridSize?: number
  /** Width of the surface in CSS pixels. Defaults to `document.width`. */
  width?: number
  /** Height of the surface in CSS pixels. Defaults to `document.height`. */
  height?: number
  /** Whether to draw the snap grid. Defaults to `true` when snap on. */
  showGrid?: boolean
  /** Optional aria-label override (defaults to a translated label). */
  ariaLabel?: string
  /** Maximum number of undo entries kept. Defaults to 100. */
  historyLimit?: number
  /** Extra classes merged onto the outer surface. */
  className?: string
}

/** Helper — produce a fresh element id, opaque to consumers. */
function nextId(prefix: string): VectorElementId {
  const cryptoApi = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto
  if (cryptoApi?.randomUUID) return `${prefix}-${cryptoApi.randomUUID()}`
  return `${prefix}-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`
}

/**
 * Translate an element by `(dx, dy)` and snap its origin to the grid when
 * `gridSize > 0`. Group children translate uniformly; lines translate both
 * endpoints.
 *
 * @param element - Element to move.
 * @param dx - X-axis displacement in canvas units.
 * @param dy - Y-axis displacement in canvas units.
 * @param gridSize - Grid spacing; `<= 0` disables snapping.
 * @returns The moved element.
 */
function moveElement(
  element: VectorElement,
  dx: number,
  dy: number,
  gridSize: number,
): VectorElement {
  if (element.kind === 'line') {
    const x1 = snapToGrid(element.x1 + dx, gridSize)
    const y1 = snapToGrid(element.y1 + dy, gridSize)
    const offsetX = x1 - element.x1
    const offsetY = y1 - element.y1
    return {
      ...element,
      x1,
      y1,
      x2: element.x2 + offsetX,
      y2: element.y2 + offsetY,
    }
  }
  if (element.kind === 'group') {
    const x = snapToGrid(element.x + dx, gridSize)
    const y = snapToGrid(element.y + dy, gridSize)
    const offsetX = x - element.x
    const offsetY = y - element.y
    return {
      ...element,
      x,
      y,
      children: element.children.map((c) => moveElement(c, offsetX, offsetY, 0)),
    }
  }
  return {
    ...element,
    x: snapToGrid(element.x + dx, gridSize),
    y: snapToGrid(element.y + dy, gridSize),
  }
}

/**
 * Vector design-tool canvas engine: the pan/zoom surface plus the grid,
 * marquee selector, element drag and undo/redo.
 *
 * @param props - Component props (see {@link CanvasEngineProps}).
 * @returns The canvas engine component.
 */
export const CanvasEngine = defineComponent({
  name: 'CanvasEngine',
  props: {
    document: { type: Object as PropType<CanvasDocument>, required: true },
    onChange: {
      type: Function as PropType<(next: CanvasDocument) => void>,
      default: undefined,
    },
    selection: { type: Array as PropType<CanvasSelection>, default: undefined },
    onSelectionChange: {
      type: Function as PropType<(next: CanvasSelection) => void>,
      default: undefined,
    },
    snapToGrid: { type: Boolean, default: true },
    gridSize: { type: Number, default: 8 },
    width: { type: Number, default: undefined },
    height: { type: Number, default: undefined },
    showGrid: { type: Boolean as PropType<boolean | undefined>, default: undefined },
    ariaLabel: { type: String, default: undefined },
    historyLimit: { type: Number, default: DEFAULT_HISTORY_LIMIT },
    className: { type: String, default: undefined },
  },
  setup(props, { expose }) {
    const cm = getClassMap()
    const { t } = useTranslation()

    const isDocControlled = (): boolean => props.onChange != null
    const internalDoc = ref<CanvasDocument>(props.document)
    // Keep internal state in sync when `document` changes in uncontrolled mode.
    watch(
      () => props.document,
      (next) => {
        if (!isDocControlled()) internalDoc.value = next
      },
    )
    const currentDoc = (): CanvasDocument =>
      isDocControlled() ? props.document : internalDoc.value

    const isSelectionControlled = (): boolean => props.onSelectionChange != null
    const internalSelection = ref<CanvasSelection>(props.selection ?? [])
    const currentSelection = (): CanvasSelection =>
      isSelectionControlled() ? (props.selection ?? []) : internalSelection.value

    const viewport = ref<CanvasViewport>({ x: 0, y: 0, zoom: 1 })

    // React's `useRef(new HistoryStack(historyLimit))`: built once, with the
    // limit the component was given at mount.
    const history = new HistoryStack(props.historyLimit)

    const commitDoc = (next: CanvasDocument, recordHistory = true): void => {
      if (recordHistory) history.push({ document: currentDoc() })
      if (isDocControlled()) props.onChange!(next)
      else internalDoc.value = next
    }

    const commitSelection = (next: CanvasSelection): void => {
      if (isSelectionControlled()) props.onSelectionChange!(next)
      else internalSelection.value = next
    }

    // ---------------------------------------------------------------------
    // Public imperative handle (a template ref exposes these methods)
    // ---------------------------------------------------------------------

    expose({
      undo: (): void => {
        const prev = history.undo({ document: currentDoc() })
        if (!prev) return
        if (isDocControlled()) props.onChange!(prev.document)
        else internalDoc.value = prev.document
      },
      redo: (): void => {
        const next = history.redo({ document: currentDoc() })
        if (!next) return
        if (isDocControlled()) props.onChange!(next.document)
        else internalDoc.value = next.document
      },
      canUndo: (): boolean => history.canUndo(),
      canRedo: (): boolean => history.canRedo(),
      align: (mode: CanvasAlignment): void => {
        const layers = alignLayers(currentDoc().layers, currentSelection(), mode)
        commitDoc({ ...currentDoc(), layers })
      },
      distribute: (axis: CanvasDistribution): void => {
        const layers = distributeLayers(currentDoc().layers, currentSelection(), axis)
        commitDoc({ ...currentDoc(), layers })
      },
      group: (): void => {
        const document = currentDoc()
        const selection = currentSelection()
        if (selection.length < 2) return
        const selectedLayers = document.layers.filter((l) => selection.includes(l.id))
        if (selectedLayers.length < 2) return
        const env = combinedBounds(selectedLayers)
        const groupId = nextId('group')
        const groupEl: VectorGroup = {
          id: groupId,
          kind: 'group',
          x: env.x,
          y: env.y,
          width: env.width,
          height: env.height,
          children: selectedLayers,
        }
        const remaining = document.layers.filter((l) => !selection.includes(l.id))
        const topmostIdx = document.layers.findIndex((l) => selection.includes(l.id))
        const insertAt = Math.max(0, remaining.length - (document.layers.length - topmostIdx) + 1)
        const layers = [...remaining.slice(0, insertAt), groupEl, ...remaining.slice(insertAt)]
        commitDoc({ ...document, layers })
        commitSelection([groupId])
      },
      ungroup: (): void => {
        const document = currentDoc()
        const selection = currentSelection()
        if (selection.length === 0) return
        const layers: VectorElement[] = []
        const newSelection: VectorElementId[] = []
        for (const layer of document.layers) {
          if (selection.includes(layer.id) && layer.kind === 'group') {
            for (const child of layer.children) {
              layers.push(child)
              newSelection.push(child.id)
            }
          } else {
            layers.push(layer)
            if (selection.includes(layer.id)) newSelection.push(layer.id)
          }
        }
        commitDoc({ ...document, layers })
        commitSelection(newSelection)
      },
    })

    // ---------------------------------------------------------------------
    // Marquee + click selection
    // ---------------------------------------------------------------------

    // The engine's own root element, for screen-space reference measurements.
    let surfaceEl: HTMLDivElement | null = null
    // Active marquee gesture in canvas-space coordinates.
    const marquee = ref<Bounds | null>(null)
    let marqueeOrigin: { x: number; y: number; pointerId: number } | null = null
    let additive = false
    let baseSelection: CanvasSelection = []

    const screenToDocCoords = (clientX: number, clientY: number): { x: number; y: number } => {
      const rect = surfaceEl?.getBoundingClientRect()
      if (!rect) return { x: 0, y: 0 }
      return screenToCanvas({ x: clientX - rect.left, y: clientY - rect.top }, viewport.value)
    }

    const onBackgroundPointerDown = (e: PointerEvent): void => {
      // Begin a marquee gesture; clear selection unless modifier held.
      const isAdditive = e.shiftKey || e.metaKey || e.ctrlKey
      additive = isAdditive
      baseSelection = isAdditive ? currentSelection().slice() : []
      const start = screenToDocCoords(e.clientX, e.clientY)
      marqueeOrigin = { x: start.x, y: start.y, pointerId: e.pointerId }
      marquee.value = { x: start.x, y: start.y, width: 0, height: 0 }
      if (!isAdditive) commitSelection([])
    }

    const onSurfacePointerMove = (e: PointerEvent): void => {
      const origin = marqueeOrigin
      if (!origin || origin.pointerId !== e.pointerId) return
      const cur = screenToDocCoords(e.clientX, e.clientY)
      const x = Math.min(origin.x, cur.x)
      const y = Math.min(origin.y, cur.y)
      const width = Math.abs(cur.x - origin.x)
      const height = Math.abs(cur.y - origin.y)
      const next = { x, y, width, height }
      marquee.value = next
      // Update selection live during drag.
      const hits = currentDoc()
        .layers.filter((l) => rectsIntersect(elementBounds(l), next))
        .map((l) => l.id)
      const merged = additive ? Array.from(new Set([...baseSelection, ...hits])) : hits
      commitSelection(merged)
    }

    const onSurfacePointerUp = (e: PointerEvent): void => {
      const origin = marqueeOrigin
      if (!origin || origin.pointerId !== e.pointerId) return
      marqueeOrigin = null
      marquee.value = null
    }

    // Drag state for the selection-move gesture.
    let dragState: {
      pointerId: number
      last: { x: number; y: number }
      committed: boolean
    } | null = null

    const onElementPointerDown = (e: PointerEvent, id: VectorElementId): void => {
      e.stopPropagation()
      const isAdditive = e.shiftKey || e.metaKey || e.ctrlKey
      const selection = currentSelection()
      if (isAdditive) {
        const next = selection.includes(id) ? selection.filter((s) => s !== id) : [...selection, id]
        commitSelection(next)
      } else if (!selection.includes(id)) {
        commitSelection([id])
      }
      // Begin a drag gesture for moving the selection.
      const start = screenToDocCoords(e.clientX, e.clientY)
      dragState = { pointerId: e.pointerId, last: start, committed: false }
      try {
        ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
      } catch (_error) {
        /* jsdom may throw — ignore: pointer capture is best-effort. */
      }
    }

    const onElementPointerMove = (e: PointerEvent): void => {
      const state = dragState
      if (!state || state.pointerId !== e.pointerId) return
      const cur = screenToDocCoords(e.clientX, e.clientY)
      const dx = cur.x - state.last.x
      const dy = cur.y - state.last.y
      state.last = cur
      if (dx === 0 && dy === 0) return
      const document = currentDoc()
      const selection = currentSelection()
      const gridStep = props.snapToGrid ? props.gridSize : 0
      const layers = document.layers.map((layer) => {
        if (!selection.includes(layer.id)) return layer
        return moveElement(layer, dx, dy, gridStep)
      })
      // Only push history once per drag gesture.
      const recordHistory = !state.committed
      state.committed = true
      commitDoc({ ...document, layers }, recordHistory)
    }

    const onElementPointerUp = (e: PointerEvent): void => {
      const state = dragState
      if (!state || state.pointerId !== e.pointerId) return
      dragState = null
      try {
        ;(e.currentTarget as Element).releasePointerCapture(e.pointerId)
      } catch (_error) {
        /* jsdom may throw — ignore: pointer release is best-effort. */
      }
    }

    // ---------------------------------------------------------------------
    // Render
    // ---------------------------------------------------------------------

    // Grid pattern id is unique per instance so multiple engines can coexist
    // without `<defs>` collisions.
    const gridId = `canvas-engine-grid-${nextId('g')}`

    return (): VNode => {
      const document = currentDoc()
      const selection = currentSelection()
      const snapEnabled = props.snapToGrid
      const showGrid = props.showGrid ?? snapEnabled
      const gridSize = props.gridSize
      const surfaceWidth = props.width ?? document.width
      const surfaceHeight = props.height ?? document.height
      const resolvedAriaLabel =
        props.ariaLabel ??
        t('canvasEngine.aria.surface', {}, { defaultValue: 'Vector canvas editor' })

      return h(
        'div',
        {
          ref: (el: unknown) => {
            surfaceEl = el as HTMLDivElement | null
          },
          'data-mol-id': 'canvas-engine',
          'data-canvas-engine-snap': snapEnabled ? 'true' : 'false',
          'data-canvas-engine-grid': gridSize,
          class: cm.cn(cm.position('relative'), props.className),
          style: { position: 'relative' },
        },
        [
          h(
            CanvasSurface,
            {
              viewport: viewport.value,
              onViewportChange: (next: CanvasViewport) => {
                viewport.value = next
              },
              width: surfaceWidth,
              height: surfaceHeight,
              ariaLabel: resolvedAriaLabel,
              onBackgroundPointerDown,
            },
            () => [
              h(
                'svg',
                {
                  'data-mol-id': 'canvas-engine-svg',
                  width: document.width,
                  height: document.height,
                  viewBox: `0 0 ${document.width} ${document.height}`,
                  style: {
                    position: 'absolute',
                    top: '0px',
                    left: '0px',
                    pointerEvents: 'auto',
                    overflow: 'visible',
                  },
                  onPointermove: (e: PointerEvent) => {
                    onSurfacePointerMove(e)
                    onElementPointerMove(e)
                  },
                  onPointerup: (e: PointerEvent) => {
                    onSurfacePointerUp(e)
                    onElementPointerUp(e)
                  },
                  onPointercancel: (e: PointerEvent) => {
                    onSurfacePointerUp(e)
                    onElementPointerUp(e)
                  },
                },
                [
                  ...(showGrid
                    ? [
                        h('defs', [
                          h(
                            'pattern',
                            {
                              id: gridId,
                              width: gridSize,
                              height: gridSize,
                              patternUnits: 'userSpaceOnUse',
                            },
                            [
                              h('path', {
                                d: `M ${gridSize} 0 L 0 0 0 ${gridSize}`,
                                fill: 'none',
                                stroke: 'currentColor',
                                'stroke-opacity': 0.08,
                                'stroke-width': 1,
                              }),
                            ],
                          ),
                        ]),
                      ]
                    : []),
                  ...(showGrid
                    ? [
                        h('rect', {
                          x: 0,
                          y: 0,
                          width: document.width,
                          height: document.height,
                          fill: `url(#${gridId})`,
                          'data-mol-id': 'canvas-engine-grid',
                        }),
                      ]
                    : []),
                  ...document.layers.map((layer) =>
                    h(
                      'g',
                      {
                        key: layer.id,
                        onPointerdown: (e: PointerEvent) => onElementPointerDown(e, layer.id),
                      },
                      [
                        h(VectorElementSvg, {
                          element: layer,
                          selected: selection.includes(layer.id),
                        }),
                      ],
                    ),
                  ),
                  ...(marquee.value
                    ? [
                        h('rect', {
                          'data-mol-id': 'canvas-engine-marquee',
                          x: marquee.value.x,
                          y: marquee.value.y,
                          width: marquee.value.width,
                          height: marquee.value.height,
                          fill: 'currentColor',
                          'fill-opacity': 0.08,
                          stroke: 'currentColor',
                          'stroke-opacity': 0.4,
                          'stroke-width': 1,
                          'stroke-dasharray': '4 2',
                          'pointer-events': 'none',
                        }),
                      ]
                    : []),
                ],
              ),
            ],
          ),
        ],
      )
    }
  },
})
