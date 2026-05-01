import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import type { CSSProperties, PointerEvent as ReactPointerEvent, ReactNode } from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import {
  addEdge,
  bezierPath,
  clientToWorld,
  DEFAULT_NODE_HEIGHT,
  DEFAULT_NODE_WIDTH,
  defaultSourcePort,
  defaultTargetPort,
  removeEdge,
  removeNode,
  translateNode,
} from './geometry.js'
import type {
  FlowChange,
  FlowEdge,
  FlowNode,
  FlowNodeRenderers,
  FlowPoint,
  FlowSelection,
  FlowViewport,
} from './types.js'

/** `<FlowCanvas>` props. */
export interface FlowCanvasProps {
  /** Nodes (controlled) or initial nodes (uncontrolled). */
  nodes: FlowNode[]
  /** Edges (controlled) or initial edges (uncontrolled). */
  edges: FlowEdge[]
  /**
   * If provided, the canvas runs in **controlled** mode: built-in
   * interactions (drag, connect, delete) call `onChange` instead of
   * mutating internal state.
   */
  onChange?: (next: FlowChange) => void
  /** Map of node `type` → renderer. */
  nodeRenderers?: FlowNodeRenderers
  /** Fallback children rendered inside every node when `nodeRenderers` has no match. */
  children?: ReactNode
  /** Fired when the selection changes. */
  onSelectionChange?: (selection: FlowSelection) => void
  /** Fired when an edge is clicked. */
  onEdgeClick?: (edge: FlowEdge) => void
  /** Fired when a node is clicked. */
  onNodeClick?: (node: FlowNode) => void
  /** Disables the built-in delete-key shortcut. */
  disableDeleteShortcut?: boolean
  /** Disables panning of the canvas. */
  disablePan?: boolean
  /** Disables zooming via mouse wheel. */
  disableZoom?: boolean
  /** Show the dotted background grid. Defaults to true. */
  showGrid?: boolean
  /** Initial viewport (uncontrolled only). */
  initialViewport?: FlowViewport
  /** Extra classes merged onto the outer wrapper. */
  className?: string
}

const DEFAULT_VIEWPORT: FlowViewport = { x: 0, y: 0, zoom: 1 }

/**
 * Visual flow / DAG editor.
 *
 * Renders nodes as absolutely-positioned `<div>` slots and edges as a
 * single `<svg>` overlay containing one `<path>` per edge. Built-in
 * interactions:
 *
 * - **Drag a node** — press on a node body and drag to reposition.
 * - **Pan the canvas** — press on empty space and drag.
 * - **Zoom** — mouse-wheel scroll (anchored on the cursor).
 * - **Connect ports** — press on a source handle (right edge of a node)
 *   and drag onto another node to create an edge.
 * - **Select** — click a node or edge; Backspace / Delete removes
 *   everything in the selection.
 *
 * Style is driven entirely by `getClassMap()`. Inline styles are reserved
 * for geometry — node `transform: translate(...)`, viewport pan/zoom,
 * SVG attributes — which classes can't express.
 *
 * @param props - Component props.
 * @returns The flow canvas element.
 * @example
 * ```tsx
 * <FlowCanvas
 *   nodes={[
 *     { id: 'a', type: 'task', position: { x: 40, y: 40 }, data: { label: 'Start' } },
 *     { id: 'b', type: 'task', position: { x: 320, y: 160 }, data: { label: 'End' } },
 *   ]}
 *   edges={[{ id: 'e1', source: 'a', target: 'b' }]}
 *   nodeRenderers={{ task: (n) => <div>{(n.data as { label: string }).label}</div> }}
 *   onChange={({ nodes, edges }) => save({ nodes, edges })}
 * />
 * ```
 */
export function FlowCanvas(props: FlowCanvasProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  const {
    nodes: nodesProp,
    edges: edgesProp,
    onChange,
    nodeRenderers,
    children,
    onSelectionChange,
    onEdgeClick,
    onNodeClick,
    disableDeleteShortcut = false,
    disablePan = false,
    disableZoom = false,
    showGrid = true,
    initialViewport,
    className,
  } = props

  const controlled = typeof onChange === 'function'

  // Internal mirror used in uncontrolled mode.
  const [internalNodes, setInternalNodes] = useState<FlowNode[]>(nodesProp)
  const [internalEdges, setInternalEdges] = useState<FlowEdge[]>(edgesProp)

  // In controlled mode the props ARE the state. In uncontrolled mode we
  // ignore later prop changes (mirroring React's `defaultValue` semantics).
  const nodes = controlled ? nodesProp : internalNodes
  const edges = controlled ? edgesProp : internalEdges

  const [selection, setSelection] = useState<FlowSelection>({ nodeIds: [], edgeIds: [] })
  const [viewport, setViewport] = useState<FlowViewport>(initialViewport ?? DEFAULT_VIEWPORT)
  const rootRef = useRef<HTMLDivElement | null>(null)

  // Pending-connection drag (drawing an edge from a source handle).
  const [pendingConnection, setPendingConnection] = useState<{
    sourceId: string
    sourceHandle?: string
    pointer: FlowPoint
  } | null>(null)

  /**
   * Commit a graph mutation.
   *
   * @param next - New `{ nodes, edges }` after the mutation.
   */
  const commit = useCallback(
    (next: FlowChange) => {
      if (controlled) {
        onChange!(next)
      } else {
        setInternalNodes(next.nodes)
        setInternalEdges(next.edges)
      }
    },
    [controlled, onChange],
  )

  /**
   * Update selection state and surface the change via the optional callback.
   *
   * @param next - New selection.
   */
  const setSelectionAndNotify = useCallback(
    (next: FlowSelection) => {
      setSelection(next)
      onSelectionChange?.(next)
    },
    [onSelectionChange],
  )

  // ---- Delete-key shortcut ----

  useEffect(() => {
    if (disableDeleteShortcut) return
    /**
     * Window-level keydown listener for Backspace / Delete.
     *
     * @param e - Native keyboard event.
     */
    function onKey(e: KeyboardEvent): void {
      if (e.key !== 'Backspace' && e.key !== 'Delete') return
      const target = e.target as HTMLElement | null
      // Don't steal text-editing keystrokes.
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return
      if (target && target.isContentEditable) return
      if (selection.nodeIds.length === 0 && selection.edgeIds.length === 0) return
      let nextNodes = nodes
      let nextEdges = edges
      for (const id of selection.nodeIds) {
        const pruned = removeNode(nextNodes, nextEdges, id)
        nextNodes = pruned.nodes
        nextEdges = pruned.edges
      }
      for (const id of selection.edgeIds) {
        nextEdges = removeEdge(nextEdges, id)
      }
      commit({ nodes: nextNodes, edges: nextEdges })
      setSelectionAndNotify({ nodeIds: [], edgeIds: [] })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [disableDeleteShortcut, selection, nodes, edges, commit, setSelectionAndNotify])

  // ---- Node drag ----

  const dragRef = useRef<{ id: string; pointerId: number; lastWorld: FlowPoint } | null>(null)

  /**
   * Begin a node drag.
   *
   * @param e - Pointer-down event on the node body.
   * @param node - The node being dragged.
   */
  function onNodePointerDown(e: ReactPointerEvent<HTMLDivElement>, node: FlowNode): void {
    if (e.button !== 0) return
    e.stopPropagation()
    const rect = rootRef.current?.getBoundingClientRect()
    if (!rect) return
    const world = clientToWorld(e.clientX, e.clientY, rect, viewport)
    dragRef.current = { id: node.id, pointerId: e.pointerId, lastWorld: world }
    try {
      ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    } catch {
      // ignore — jsdom / very old browsers may not support pointer capture
    }
    setSelectionAndNotify({ nodeIds: [node.id], edgeIds: [] })
    onNodeClick?.(node)
  }

  /**
   * Translate the node by the world-space delta since the previous frame.
   *
   * @param e - Pointer-move event.
   */
  function onNodePointerMove(e: ReactPointerEvent<HTMLDivElement>): void {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== e.pointerId) return
    const rect = rootRef.current?.getBoundingClientRect()
    if (!rect) return
    const world = clientToWorld(e.clientX, e.clientY, rect, viewport)
    const dx = world.x - drag.lastWorld.x
    const dy = world.y - drag.lastWorld.y
    if (dx === 0 && dy === 0) return
    drag.lastWorld = world
    commit({ nodes: translateNode(nodes, drag.id, dx, dy), edges })
  }

  /**
   * End the drag, releasing pointer capture.
   *
   * @param e - Pointer-up event.
   */
  function onNodePointerUp(e: ReactPointerEvent<HTMLDivElement>): void {
    if (dragRef.current?.pointerId === e.pointerId) {
      try {
        ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
      } catch {
        // ignore
      }
      dragRef.current = null
    }
  }

  // ---- Pan ----

  const panRef = useRef<{
    pointerId: number
    startClient: FlowPoint
    startVp: FlowViewport
  } | null>(null)

  /**
   * Begin a viewport pan when the user presses on empty canvas space.
   *
   * @param e - Pointer-down event on the root.
   */
  function onCanvasPointerDown(e: ReactPointerEvent<HTMLDivElement>): void {
    if (disablePan) return
    if (e.button !== 0) return
    if (e.target !== rootRef.current) return
    panRef.current = {
      pointerId: e.pointerId,
      startClient: { x: e.clientX, y: e.clientY },
      startVp: viewport,
    }
    try {
      rootRef.current.setPointerCapture(e.pointerId)
    } catch {
      // ignore
    }
    setSelectionAndNotify({ nodeIds: [], edgeIds: [] })
  }

  /**
   * Pan the viewport, or update the pending-connection pointer.
   *
   * @param e - Pointer-move event.
   */
  function onCanvasPointerMove(e: ReactPointerEvent<HTMLDivElement>): void {
    if (pendingConnection) {
      const rect = rootRef.current?.getBoundingClientRect()
      if (!rect) return
      const world = clientToWorld(e.clientX, e.clientY, rect, viewport)
      setPendingConnection({ ...pendingConnection, pointer: world })
      return
    }
    const pan = panRef.current
    if (!pan || pan.pointerId !== e.pointerId) return
    const dx = e.clientX - pan.startClient.x
    const dy = e.clientY - pan.startClient.y
    setViewport({ ...pan.startVp, x: pan.startVp.x + dx, y: pan.startVp.y + dy })
  }

  /**
   * Finish a pan or cancel a pending connection.
   *
   * @param e - Pointer-up event.
   */
  function onCanvasPointerUp(e: ReactPointerEvent<HTMLDivElement>): void {
    if (panRef.current?.pointerId === e.pointerId) {
      try {
        rootRef.current?.releasePointerCapture(e.pointerId)
      } catch {
        // ignore
      }
      panRef.current = null
    }
    if (pendingConnection) {
      // No target node was hit → cancel.
      setPendingConnection(null)
    }
  }

  // ---- Zoom ----

  /**
   * Anchored zoom around the cursor.
   *
   * @param e - Wheel event.
   */
  function onWheel(e: React.WheelEvent<HTMLDivElement>): void {
    if (disableZoom) return
    e.preventDefault()
    const rect = rootRef.current?.getBoundingClientRect()
    if (!rect) return
    const factor = Math.exp(-e.deltaY * 0.001)
    const nextZoom = Math.max(0.2, Math.min(4, viewport.zoom * factor))
    const cx = e.clientX - rect.left
    const cy = e.clientY - rect.top
    const wx = (cx - viewport.x) / viewport.zoom
    const wy = (cy - viewport.y) / viewport.zoom
    setViewport({
      x: cx - wx * nextZoom,
      y: cy - wy * nextZoom,
      zoom: nextZoom,
    })
  }

  // ---- Connection draw ----

  /**
   * Begin drawing a connection edge from a source handle.
   *
   * @param e - Pointer-down on the handle.
   * @param node - Source node.
   * @param handle - Optional source handle id.
   */
  function onHandlePointerDown(
    e: ReactPointerEvent<HTMLDivElement>,
    node: FlowNode,
    handle?: string,
  ): void {
    if (e.button !== 0) return
    e.stopPropagation()
    const rect = rootRef.current?.getBoundingClientRect()
    if (!rect) return
    const world = clientToWorld(e.clientX, e.clientY, rect, viewport)
    setPendingConnection({ sourceId: node.id, sourceHandle: handle, pointer: world })
    try {
      rootRef.current?.setPointerCapture(e.pointerId)
    } catch {
      // ignore
    }
  }

  /**
   * Complete a pending connection on pointer-up over a target node.
   *
   * @param node - The target node.
   * @param handle - Optional target handle id.
   */
  function completeConnection(node: FlowNode, handle?: string): void {
    if (!pendingConnection) return
    if (pendingConnection.sourceId === node.id) {
      setPendingConnection(null)
      return
    }
    const newEdge: FlowEdge = {
      id: `e-${pendingConnection.sourceId}-${node.id}-${Date.now()}`,
      source: pendingConnection.sourceId,
      sourceHandle: pendingConnection.sourceHandle,
      target: node.id,
      targetHandle: handle,
    }
    commit({ nodes, edges: addEdge(edges, newEdge) })
    setPendingConnection(null)
  }

  // ---- Edge selection ----

  /**
   * Select an edge (single-edge selection on click).
   *
   * @param edge - The clicked edge.
   * @param e - The mouse event.
   */
  function selectEdge(edge: FlowEdge, e: React.MouseEvent): void {
    e.stopPropagation()
    setSelectionAndNotify({ nodeIds: [], edgeIds: [edge.id] })
    onEdgeClick?.(edge)
  }

  // ---- Computed: lookup tables for rendering ----

  const nodeById = useMemo(() => {
    const m = new Map<string, FlowNode>()
    for (const n of nodes) m.set(n.id, n)
    return m
  }, [nodes])

  // ---- Render ----

  const viewportTransform: CSSProperties = {
    transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
    transformOrigin: '0 0',
    position: 'absolute',
    inset: 0,
  }

  const ariaLabel = t('flowCanvas.aria.canvas', {}, { defaultValue: 'Flow canvas' })

  return (
    <div
      ref={rootRef}
      role="application"
      aria-label={ariaLabel}
      data-mol-id="flow-canvas"
      tabIndex={0}
      className={cm.cn(cm.position('relative'), cm.surfaceSecondary, className)}
      onPointerDown={onCanvasPointerDown}
      onPointerMove={onCanvasPointerMove}
      onPointerUp={onCanvasPointerUp}
      onWheel={onWheel}
      style={{ overflow: 'hidden', touchAction: 'none', width: '100%', height: '100%' }}
    >
      {showGrid && (
        <div
          aria-hidden
          data-mol-id="flow-canvas-grid"
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: 'radial-gradient(circle, rgba(127,127,127,0.35) 1px, transparent 1px)',
            backgroundSize: `${24 * viewport.zoom}px ${24 * viewport.zoom}px`,
            backgroundPosition: `${viewport.x}px ${viewport.y}px`,
            pointerEvents: 'none',
          }}
        />
      )}

      {/* World-transform layer holds nodes + the SVG edge overlay. */}
      <div data-mol-id="flow-canvas-world" style={viewportTransform}>
        <svg
          aria-hidden
          data-mol-id="flow-canvas-edges"
          width="100%"
          height="100%"
          style={{ position: 'absolute', inset: 0, overflow: 'visible', pointerEvents: 'none' }}
        >
          {edges.map((edge) => {
            const src = nodeById.get(edge.source)
            const tgt = nodeById.get(edge.target)
            if (!src || !tgt) return null
            const a = defaultSourcePort(src)
            const b = defaultTargetPort(tgt)
            const isSelected = selection.edgeIds.includes(edge.id)
            return (
              <g key={edge.id}>
                {/* Wide invisible hit-target so clicks land on thin lines. */}
                <path
                  d={bezierPath(a, b)}
                  data-mol-id={`flow-canvas-edge-hit-${edge.id}`}
                  fill="none"
                  stroke="transparent"
                  strokeWidth={14}
                  style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
                  onClick={(e) => selectEdge(edge, e)}
                />
                <path
                  d={bezierPath(a, b)}
                  data-mol-id={`flow-canvas-edge-${edge.id}`}
                  data-selected={isSelected ? 'true' : 'false'}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={isSelected ? 2.5 : 1.5}
                  opacity={isSelected ? 1 : 0.6}
                  style={{ pointerEvents: 'none' }}
                />
              </g>
            )
          })}
          {pendingConnection &&
            (() => {
              const src = nodeById.get(pendingConnection.sourceId)
              if (!src) return null
              const a = defaultSourcePort(src)
              const b = pendingConnection.pointer
              return (
                <path
                  d={bezierPath(a, b)}
                  data-mol-id="flow-canvas-pending-edge"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  opacity={0.7}
                  style={{ pointerEvents: 'none' }}
                />
              )
            })()}
        </svg>

        {nodes.map((node) => {
          const w = node.width ?? DEFAULT_NODE_WIDTH
          const h = node.height ?? DEFAULT_NODE_HEIGHT
          const isSelected = selection.nodeIds.includes(node.id)
          const renderer = nodeRenderers?.[node.type]
          return (
            <div
              key={node.id}
              role="group"
              data-mol-id={`flow-canvas-node-${node.id}`}
              data-selected={isSelected ? 'true' : 'false'}
              data-node-type={node.type}
              className={cm.cn(
                cm.surface,
                cm.borderAll,
                isSelected ? cm.borderBPrimary : '',
                cm.cursorPointer,
              )}
              onPointerDown={(e) => onNodePointerDown(e, node)}
              onPointerMove={onNodePointerMove}
              onPointerUp={(e) => {
                onNodePointerUp(e)
                if (pendingConnection && pendingConnection.sourceId !== node.id) {
                  completeConnection(node)
                }
              }}
              style={{
                position: 'absolute',
                transform: `translate(${node.position.x}px, ${node.position.y}px)`,
                width: w,
                height: h,
              }}
            >
              {renderer ? renderer(node) : children}
              <div
                role="button"
                aria-label={t(
                  'flowCanvas.aria.sourceHandle',
                  {},
                  { defaultValue: 'Drag to connect' },
                )}
                data-mol-id={`flow-canvas-node-handle-${node.id}`}
                onPointerDown={(e) => onHandlePointerDown(e, node)}
                style={{
                  position: 'absolute',
                  right: -6,
                  top: '50%',
                  width: 12,
                  height: 12,
                  marginTop: -6,
                  borderRadius: '50%',
                  background: 'currentColor',
                  cursor: 'crosshair',
                }}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
