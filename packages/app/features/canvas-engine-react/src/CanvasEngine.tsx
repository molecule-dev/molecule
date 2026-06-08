/**
 * `<CanvasEngine>` — vector design-tool wrapper around the shared
 * `<CanvasSurface>` (pan/zoom) base. Adds multi-select, marquee,
 * alignment, group/ungroup, snap-to-grid, and undo/redo.
 *
 * The component is dual-mode: `document` is treated as controlled
 * when `onChange` is supplied, otherwise the initial document seeds
 * internal state. `selection` follows the same convention.
 *
 * @module
 */

import type {
  CSSProperties,
  ForwardedRef,
  PointerEvent as ReactPointerEvent,
  ReactElement,
} from 'react'
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react'

import type { Bounds, CanvasViewport } from '@molecule/app-feature-canvas-react'
import { CanvasSurface, screenToCanvas } from '@molecule/app-feature-canvas-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { alignLayers, distributeLayers } from './alignment.js'
import { combinedBounds, elementBounds, rectsIntersect, snapToGrid } from './geometry.js'
import { DEFAULT_HISTORY_LIMIT, HistoryStack } from './history.js'
import type {
  CanvasAlignment,
  CanvasDistribution,
  CanvasDocument,
  CanvasEngineHandle,
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
   * Called whenever the engine mutates the document (drag, align,
   * group, undo, redo). Required for controlled mode; absent in
   * uncontrolled mode.
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
  // Crypto.randomUUID is widely available in modern runtimes; fall
  // back to a counter when missing (jsdom 27 ships it but be safe).
  const cryptoApi = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto
  if (cryptoApi?.randomUUID) return `${prefix}-${cryptoApi.randomUUID()}`
  return `${prefix}-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`
}

/**
 * Vector design-tool canvas engine. Read the module-level docstring
 * for the high-level behaviour summary.
 */
export const CanvasEngine = forwardRef(function CanvasEngine(
  props: CanvasEngineProps,
  ref: ForwardedRef<CanvasEngineHandle>,
): ReactElement {
  const cm = getClassMap()
  const { t } = useTranslation()

  const {
    document: docProp,
    onChange,
    selection: selectionProp,
    onSelectionChange,
    snapToGrid: snapEnabled = true,
    gridSize = 8,
    width: widthProp,
    height: heightProp,
    showGrid = snapEnabled,
    ariaLabel,
    historyLimit = DEFAULT_HISTORY_LIMIT,
    className,
  } = props

  const isDocControlled = onChange != null
  const [internalDoc, setInternalDoc] = useState<CanvasDocument>(docProp)
  // Keep internal state in sync when `document` changes in uncontrolled mode.
  useEffect(() => {
    if (!isDocControlled) setInternalDoc(docProp)
  }, [docProp, isDocControlled])
  const document = isDocControlled ? docProp : internalDoc

  const isSelectionControlled = onSelectionChange != null
  const [internalSelection, setInternalSelection] = useState<CanvasSelection>(selectionProp ?? [])
  const selection = isSelectionControlled ? (selectionProp ?? []) : internalSelection

  const [viewport, setViewport] = useState<CanvasViewport>({ x: 0, y: 0, zoom: 1 })

  const historyRef = useRef<HistoryStack>(new HistoryStack(historyLimit))

  const commitDoc = useCallback(
    (next: CanvasDocument, recordHistory = true): void => {
      if (recordHistory) historyRef.current.push({ document })
      if (isDocControlled) onChange!(next)
      else setInternalDoc(next)
    },
    [document, isDocControlled, onChange],
  )

  const commitSelection = useCallback(
    (next: CanvasSelection): void => {
      if (isSelectionControlled) onSelectionChange!(next)
      else setInternalSelection(next)
    },
    [isSelectionControlled, onSelectionChange],
  )

  // ---------------------------------------------------------------------
  // Public imperative handle
  // ---------------------------------------------------------------------

  useImperativeHandle<CanvasEngineHandle, CanvasEngineHandle>(
    ref,
    () => ({
      undo: () => {
        const prev = historyRef.current.undo({ document })
        if (!prev) return
        if (isDocControlled) onChange!(prev.document)
        else setInternalDoc(prev.document)
      },
      redo: () => {
        const next = historyRef.current.redo({ document })
        if (!next) return
        if (isDocControlled) onChange!(next.document)
        else setInternalDoc(next.document)
      },
      canUndo: () => historyRef.current.canUndo(),
      canRedo: () => historyRef.current.canRedo(),
      align: (mode: CanvasAlignment) => {
        const layers = alignLayers(document.layers, selection, mode)
        commitDoc({ ...document, layers })
      },
      distribute: (axis: CanvasDistribution) => {
        const layers = distributeLayers(document.layers, selection, axis)
        commitDoc({ ...document, layers })
      },
      group: () => {
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
        // Drop selected layers from top-level, splice group at the
        // position of the topmost selected layer.
        const remaining = document.layers.filter((l) => !selection.includes(l.id))
        const topmostIdx = document.layers.findIndex((l) => selection.includes(l.id))
        const insertAt = Math.max(0, remaining.length - (document.layers.length - topmostIdx) + 1)
        const layers = [...remaining.slice(0, insertAt), groupEl, ...remaining.slice(insertAt)]
        commitDoc({ ...document, layers })
        commitSelection([groupId])
      },
      ungroup: () => {
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
    }),
    [document, selection, isDocControlled, onChange, commitDoc, commitSelection],
  )

  // ---------------------------------------------------------------------
  // Marquee + click selection
  // ---------------------------------------------------------------------

  const surfaceRef = useRef<HTMLDivElement | null>(null)
  // Active marquee gesture in canvas-space coordinates.
  const [marquee, setMarquee] = useState<Bounds | null>(null)
  const marqueeOriginRef = useRef<{ x: number; y: number; pointerId: number } | null>(null)
  const additiveRef = useRef<boolean>(false)
  const baseSelectionRef = useRef<CanvasSelection>([])

  const screenToDocCoords = useCallback(
    (clientX: number, clientY: number): { x: number; y: number } => {
      const rect = surfaceRef.current?.getBoundingClientRect()
      if (!rect) return { x: 0, y: 0 }
      return screenToCanvas({ x: clientX - rect.left, y: clientY - rect.top }, viewport)
    },
    [viewport],
  )

  const onBackgroundPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>): void => {
      // Begin a marquee gesture; clear selection unless modifier held.
      const additive = e.shiftKey || e.metaKey || e.ctrlKey
      additiveRef.current = additive
      baseSelectionRef.current = additive ? selection.slice() : []
      const start = screenToDocCoords(e.clientX, e.clientY)
      marqueeOriginRef.current = { x: start.x, y: start.y, pointerId: e.pointerId }
      setMarquee({ x: start.x, y: start.y, width: 0, height: 0 })
      if (!additive) commitSelection([])
    },
    [commitSelection, screenToDocCoords, selection],
  )

  const onSurfacePointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>): void => {
      const origin = marqueeOriginRef.current
      if (!origin || origin.pointerId !== e.pointerId) return
      const cur = screenToDocCoords(e.clientX, e.clientY)
      const x = Math.min(origin.x, cur.x)
      const y = Math.min(origin.y, cur.y)
      const width = Math.abs(cur.x - origin.x)
      const height = Math.abs(cur.y - origin.y)
      const next = { x, y, width, height }
      setMarquee(next)
      // Update selection live during drag.
      const hits = document.layers
        .filter((l) => rectsIntersect(elementBounds(l), next))
        .map((l) => l.id)
      const merged = additiveRef.current
        ? Array.from(new Set([...baseSelectionRef.current, ...hits]))
        : hits
      commitSelection(merged)
    },
    [commitSelection, document.layers, screenToDocCoords],
  )

  const onSurfacePointerUp = useCallback((e: ReactPointerEvent<HTMLDivElement>): void => {
    const origin = marqueeOriginRef.current
    if (!origin || origin.pointerId !== e.pointerId) return
    marqueeOriginRef.current = null
    setMarquee(null)
  }, [])

  const onElementPointerDown = useCallback(
    (e: ReactPointerEvent<SVGGElement>, id: VectorElementId): void => {
      e.stopPropagation()
      const additive = e.shiftKey || e.metaKey || e.ctrlKey
      if (additive) {
        const next = selection.includes(id) ? selection.filter((s) => s !== id) : [...selection, id]
        commitSelection(next)
      } else if (!selection.includes(id)) {
        commitSelection([id])
      }
      // Begin a drag gesture for moving the selection.
      const start = screenToDocCoords(e.clientX, e.clientY)
      dragStateRef.current = {
        pointerId: e.pointerId,
        last: start,
        baseDoc: document,
        committed: false,
      }
      try {
        e.currentTarget.setPointerCapture(e.pointerId)
      } catch (_error) {
        /* jsdom may throw — ignore: pointer capture is best-effort. */
      }
    },
    [commitSelection, screenToDocCoords, selection, document],
  )

  // Drag state for the selection-move gesture.
  const dragStateRef = useRef<{
    pointerId: number
    last: { x: number; y: number }
    baseDoc: CanvasDocument
    committed: boolean
  } | null>(null)

  const onElementPointerMove = useCallback(
    (e: ReactPointerEvent<SVGGElement>): void => {
      const state = dragStateRef.current
      if (!state || state.pointerId !== e.pointerId) return
      const cur = screenToDocCoords(e.clientX, e.clientY)
      const dx = cur.x - state.last.x
      const dy = cur.y - state.last.y
      state.last = cur
      if (dx === 0 && dy === 0) return
      const layers = document.layers.map((layer) => {
        if (!selection.includes(layer.id)) return layer
        return moveElement(layer, dx, dy, snapEnabled ? gridSize : 0)
      })
      // Only push history once per drag gesture.
      const recordHistory = !state.committed
      state.committed = true
      commitDoc({ ...document, layers }, recordHistory)
    },
    [commitDoc, document, gridSize, screenToDocCoords, selection, snapEnabled],
  )

  const onElementPointerUp = useCallback((e: ReactPointerEvent<SVGGElement>): void => {
    const state = dragStateRef.current
    if (!state || state.pointerId !== e.pointerId) return
    dragStateRef.current = null
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch (_error) {
      /* jsdom may throw — ignore: pointer release is best-effort. */
    }
  }, [])

  // ---------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------

  const surfaceWidth = widthProp ?? document.width
  const surfaceHeight = heightProp ?? document.height

  // SVG inner-layer style — origin-aligned with `<CanvasSurface>`'s
  // canvas-space transform; SVG sits at (0, 0) in canvas-space.
  const svgStyle: CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    pointerEvents: 'auto',
    overflow: 'visible',
  }

  // Grid pattern id is unique per render so multiple engines can
  // coexist without `<defs>` collisions.
  const gridId = useMemo(() => `canvas-engine-grid-${nextId('g')}`, [])

  const resolvedAriaLabel =
    ariaLabel ?? t('canvasEngine.aria.surface', {}, { defaultValue: 'Vector canvas editor' })

  return (
    <div
      ref={surfaceRef}
      data-mol-id="canvas-engine"
      data-canvas-engine-snap={snapEnabled ? 'true' : 'false'}
      data-canvas-engine-grid={gridSize}
      className={cm.cn(cm.position('relative'), className)}
      style={{ position: 'relative' }}
    >
      <CanvasSurface
        viewport={viewport}
        onViewportChange={setViewport}
        width={surfaceWidth}
        height={surfaceHeight}
        ariaLabel={resolvedAriaLabel}
        onBackgroundPointerDown={onBackgroundPointerDown}
      >
        <svg
          data-mol-id="canvas-engine-svg"
          width={document.width}
          height={document.height}
          viewBox={`0 0 ${document.width} ${document.height}`}
          style={svgStyle}
          onPointerMove={(e) => {
            onSurfacePointerMove(e as unknown as ReactPointerEvent<HTMLDivElement>)
            onElementPointerMove(e)
          }}
          onPointerUp={(e) => {
            onSurfacePointerUp(e as unknown as ReactPointerEvent<HTMLDivElement>)
            onElementPointerUp(e)
          }}
          onPointerCancel={(e) => {
            onSurfacePointerUp(e as unknown as ReactPointerEvent<HTMLDivElement>)
            onElementPointerUp(e)
          }}
        >
          {showGrid ? (
            <defs>
              <pattern id={gridId} width={gridSize} height={gridSize} patternUnits="userSpaceOnUse">
                <path
                  d={`M ${gridSize} 0 L 0 0 0 ${gridSize}`}
                  fill="none"
                  stroke="currentColor"
                  strokeOpacity={0.08}
                  strokeWidth={1}
                />
              </pattern>
            </defs>
          ) : null}
          {showGrid ? (
            <rect
              x={0}
              y={0}
              width={document.width}
              height={document.height}
              fill={`url(#${gridId})`}
              data-mol-id="canvas-engine-grid"
            />
          ) : null}
          {document.layers.map((layer) => (
            <g key={layer.id} onPointerDown={(e) => onElementPointerDown(e, layer.id)}>
              <VectorElementSvg element={layer} selected={selection.includes(layer.id)} />
            </g>
          ))}
          {marquee ? (
            <rect
              data-mol-id="canvas-engine-marquee"
              x={marquee.x}
              y={marquee.y}
              width={marquee.width}
              height={marquee.height}
              fill="currentColor"
              fillOpacity={0.08}
              stroke="currentColor"
              strokeOpacity={0.4}
              strokeWidth={1}
              strokeDasharray="4 2"
              pointerEvents="none"
            />
          ) : null}
        </svg>
      </CanvasSurface>
    </div>
  )
}) as ReturnType<typeof forwardRef<CanvasEngineHandle, CanvasEngineProps>>

// ---------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------

/**
 * Translate an element by `(dx, dy)` and snap its origin to the grid
 * when `gridSize > 0`. Group children translate uniformly; lines
 * translate both endpoints.
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
