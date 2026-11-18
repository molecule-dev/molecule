/**
 * Solid flow / DAG editor: the Solid counterpart of
 * `@molecule/app-flow-canvas-react`'s `<FlowCanvas>` — the same props (React
 * names), the same ClassMap classes, the same inline geometry and the same DOM
 * for the same input.
 *
 * @module
 */

import {
  type Component,
  createMemo,
  createSignal,
  createUniqueId,
  For,
  onCleanup,
  onMount,
  Show,
} from 'solid-js'

import { useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'

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
  FlowCanvasProps,
  FlowChange,
  FlowEdge,
  FlowNode,
  FlowPoint,
  FlowSelection,
  FlowViewport,
} from './types.js'

/** The viewport the canvas starts with when `initialViewport` is unset. */
const DEFAULT_VIEWPORT: FlowViewport = { x: 0, y: 0, zoom: 1 }

// The two inline styles whose values the CSSOM normalizes: written straight
// into the template (a static JSX style object or string is compiled to a style
// attribute) they keep the raw text, while React's own inline styles are parsed
// ("currentColor" -> "currentcolor", "border: none" -> "border: medium").
// A function call keeps them on the runtime style path, which parses the string
// exactly as React's inline styles are parsed.
/** The select button's inline style — the native button chrome reset. */
const selectButtonStyle = (): string => 'background: transparent; border: none; padding: 0px'
/** A source handle's inline style. */
const handleStyle = (): string =>
  'position: absolute; right: -6px; top: 50%; width: 12px; height: 12px; ' +
  'margin-top: -6px; border-radius: 50%; background: currentColor; cursor: crosshair'

/** A connection being drawn from a source handle. */
interface PendingConnection {
  /** The source node the drag started from. */
  sourceId: string
  /** Optional source handle id. */
  sourceHandle?: string
  /** The pointer position in world coordinates. */
  pointer: FlowPoint
}

/**
 * Visual flow / DAG editor.
 *
 * Renders nodes as absolutely-positioned `<div>` slots and edges as a single
 * `<svg>` overlay containing one `<path>` per edge. Built-in interactions:
 *
 * - **Drag a node** — press on a node body and drag to reposition.
 * - **Pan the canvas** — press on empty space and drag.
 * - **Zoom** — mouse-wheel scroll (anchored on the cursor).
 * - **Connect ports** — press on a source handle (right edge of a node) and
 *   drag onto another node to create an edge.
 * - **Select** — click a node or edge, or Tab to a node's select button and
 *   press Enter / Space; Backspace / Delete removes everything in the
 *   selection.
 *
 * Style is driven entirely by `getClassMap()`. Inline styles are reserved for
 * geometry — node `transform: translate(...)`, viewport pan/zoom, SVG
 * attributes — which classes can't express.
 *
 * This is the Solid counterpart of `@molecule/app-flow-canvas-react`: the same
 * props (React names), the same ClassMap tokens, and the same DOM for the same
 * input.
 *
 * @param props - Component props (see {@link FlowCanvasProps}).
 * @returns The flow-canvas element.
 */
export const FlowCanvas: Component<FlowCanvasProps> = (props) => {
  const cm = getClassMap()
  const { t } = useTranslation()

  // Internal mirrors used in uncontrolled mode (React's `useState`): the
  // initial props are read once, at mount.
  const [internalNodes, setInternalNodes] = createSignal<FlowNode[]>(props.nodes)
  const [internalEdges, setInternalEdges] = createSignal<FlowEdge[]>(props.edges)

  const [selection, setSelection] = createSignal<FlowSelection>({ nodeIds: [], edgeIds: [] })
  const [viewport, setViewport] = createSignal<FlowViewport>(
    props.initialViewport ?? DEFAULT_VIEWPORT,
  )
  const [pendingConnection, setPendingConnection] = createSignal<PendingConnection | null>(null)
  const idBase = createUniqueId()
  let rootEl: HTMLDivElement | undefined

  // Pending drags and pans (React's `useRef` holders): not rendered, so plain
  // mutable state.
  let drag: { id: string; pointerId: number; lastWorld: FlowPoint } | null = null
  let pan: { pointerId: number; startClient: FlowPoint; startVp: FlowViewport } | null = null

  /** Whether `onChange` makes the canvas controlled. */
  const controlled = (): boolean => typeof props.onChange === 'function'
  /** The nodes the canvas renders. */
  const nodes = (): FlowNode[] => (controlled() ? props.nodes : internalNodes())
  /** The edges the canvas renders. */
  const edges = (): FlowEdge[] => (controlled() ? props.edges : internalEdges())

  /**
   * Commit a graph mutation.
   *
   * @param next - New `{ nodes, edges }` after the mutation.
   */
  const commit = (next: FlowChange): void => {
    if (controlled()) props.onChange?.(next)
    else {
      setInternalNodes(next.nodes)
      setInternalEdges(next.edges)
    }
  }

  /**
   * Update selection state and surface the change via the optional callback.
   *
   * @param next - New selection.
   */
  const setSelectionAndNotify = (next: FlowSelection): void => {
    setSelection(next)
    props.onSelectionChange?.(next)
  }

  /**
   * Select a single node and surface the node-click callback. Shared by the
   * pointer-down path and the node's select button (keyboard).
   *
   * @param node - The node to select.
   */
  const selectNode = (node: FlowNode): void => {
    setSelectionAndNotify({ nodeIds: [node.id], edgeIds: [] })
    props.onNodeClick?.(node)
  }

  // ---- Delete-key shortcut ----

  /**
   * Window-level keydown listener for Backspace / Delete, registered on mount
   * like React's effect.
   *
   * @param event - Native keyboard event.
   */
  const onKeyDown = (event: KeyboardEvent): void => {
    if (props.disableDeleteShortcut) return
    if (event.key !== 'Backspace' && event.key !== 'Delete') return
    const target = event.target as HTMLElement | null
    // Don't steal text-editing keystrokes.
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return
    if (target && target.isContentEditable) return
    const current = selection()
    if (current.nodeIds.length === 0 && current.edgeIds.length === 0) return
    let nextNodes = nodes()
    let nextEdges = edges()
    for (const id of current.nodeIds) {
      const pruned = removeNode(nextNodes, nextEdges, id)
      nextNodes = pruned.nodes
      nextEdges = pruned.edges
    }
    for (const id of current.edgeIds) nextEdges = removeEdge(nextEdges, id)
    commit({ nodes: nextNodes, edges: nextEdges })
    setSelectionAndNotify({ nodeIds: [], edgeIds: [] })
  }

  onMount(() => window.addEventListener('keydown', onKeyDown))
  onCleanup(() => window.removeEventListener('keydown', onKeyDown))

  // ---- Node drag ----

  /**
   * Begin a node drag.
   *
   * @param event - Pointer-down event on the node body.
   * @param node - The node being dragged.
   */
  const onNodePointerDown = (event: PointerEvent, node: FlowNode): void => {
    if (event.button !== 0) return
    event.stopPropagation()
    const rect = rootEl?.getBoundingClientRect()
    if (!rect) return
    const world = clientToWorld(event.clientX, event.clientY, rect, viewport())
    drag = { id: node.id, pointerId: event.pointerId, lastWorld: world }
    try {
      ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
    } catch (_error) {
      // Safe to ignore: setPointerCapture is unsupported in jsdom and very old
      // browsers; dragging still works, just without implicit pointer capture.
    }
    selectNode(node)
  }

  /**
   * Translate the node by the world-space delta since the previous frame.
   *
   * @param event - Pointer-move event.
   */
  const onNodePointerMove = (event: PointerEvent): void => {
    const current = drag
    if (!current || current.pointerId !== event.pointerId) return
    const rect = rootEl?.getBoundingClientRect()
    if (!rect) return
    const world = clientToWorld(event.clientX, event.clientY, rect, viewport())
    const dx = world.x - current.lastWorld.x
    const dy = world.y - current.lastWorld.y
    if (dx === 0 && dy === 0) return
    current.lastWorld = world
    commit({ nodes: translateNode(nodes(), current.id, dx, dy), edges: edges() })
  }

  /**
   * End the drag, releasing pointer capture.
   *
   * @param event - Pointer-up event.
   */
  const onNodePointerUp = (event: PointerEvent): void => {
    if (drag?.pointerId === event.pointerId) {
      try {
        ;(event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId)
      } catch (_error) {
        // Safe to ignore: releasePointerCapture may throw in jsdom or if
        // the pointer was never captured (e.g. drag started outside window).
      }
      drag = null
    }
  }

  // ---- Pan ----

  /**
   * Begin a viewport pan when the user presses on empty canvas space.
   *
   * @param event - Pointer-down event on the root.
   */
  const onCanvasPointerDown = (event: PointerEvent): void => {
    if (props.disablePan) return
    if (event.button !== 0) return
    if (event.target !== rootEl) return
    pan = {
      pointerId: event.pointerId,
      startClient: { x: event.clientX, y: event.clientY },
      startVp: viewport(),
    }
    try {
      rootEl?.setPointerCapture(event.pointerId)
    } catch (_error) {
      // Safe to ignore: setPointerCapture is unsupported in jsdom and very old
      // browsers; panning still works, just without implicit pointer capture.
    }
    setSelectionAndNotify({ nodeIds: [], edgeIds: [] })
  }

  /**
   * Pan the viewport, or update the pending-connection pointer.
   *
   * @param event - Pointer-move event.
   */
  const onCanvasPointerMove = (event: PointerEvent): void => {
    const pending = pendingConnection()
    if (pending) {
      const rect = rootEl?.getBoundingClientRect()
      if (!rect) return
      const world = clientToWorld(event.clientX, event.clientY, rect, viewport())
      setPendingConnection({ ...pending, pointer: world })
      return
    }
    const current = pan
    if (!current || current.pointerId !== event.pointerId) return
    const dx = event.clientX - current.startClient.x
    const dy = event.clientY - current.startClient.y
    setViewport({ ...current.startVp, x: current.startVp.x + dx, y: current.startVp.y + dy })
  }

  /**
   * Finish a pan or cancel a pending connection.
   *
   * @param event - Pointer-up event.
   */
  const onCanvasPointerUp = (event: PointerEvent): void => {
    if (pan?.pointerId === event.pointerId) {
      try {
        rootEl?.releasePointerCapture(event.pointerId)
      } catch (_error) {
        // Safe to ignore: releasePointerCapture may throw in jsdom or if the
        // pointer was never captured (e.g. pan started outside window).
      }
      pan = null
    }
    if (pendingConnection()) {
      // No target node was hit → cancel.
      setPendingConnection(null)
    }
  }

  // ---- Zoom ----

  /**
   * Anchored zoom around the cursor.
   *
   * @param event - Wheel event.
   */
  const onWheel = (event: WheelEvent): void => {
    if (props.disableZoom) return
    event.preventDefault()
    const rect = rootEl?.getBoundingClientRect()
    if (!rect) return
    const current = viewport()
    const factor = Math.exp(-event.deltaY * 0.001)
    const nextZoom = Math.max(0.2, Math.min(4, current.zoom * factor))
    const cx = event.clientX - rect.left
    const cy = event.clientY - rect.top
    const wx = (cx - current.x) / current.zoom
    const wy = (cy - current.y) / current.zoom
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
   * @param event - Pointer-down on the handle.
   * @param node - Source node.
   * @param handle - Optional source handle id.
   */
  const onHandlePointerDown = (event: PointerEvent, node: FlowNode, handle?: string): void => {
    if (event.button !== 0) return
    event.stopPropagation()
    const rect = rootEl?.getBoundingClientRect()
    if (!rect) return
    const world = clientToWorld(event.clientX, event.clientY, rect, viewport())
    setPendingConnection({ sourceId: node.id, sourceHandle: handle, pointer: world })
    try {
      rootEl?.setPointerCapture(event.pointerId)
    } catch (_error) {
      // Safe to ignore: setPointerCapture is unsupported in jsdom and very old
      // browsers; connection drawing still works without pointer capture.
    }
  }

  /**
   * Complete a pending connection on pointer-up over a target node.
   *
   * @param node - The target node.
   * @param handle - Optional target handle id.
   */
  // The stamp of the last edge this canvas drew: the epoch ms, moved past the
  // previous stamp so two edges drawn in one millisecond still get distinct ids.
  let lastEdgeStamp = 0
  const completeConnection = (node: FlowNode, handle?: string): void => {
    const pending = pendingConnection()
    if (!pending) return
    if (pending.sourceId === node.id) {
      setPendingConnection(null)
      return
    }
    const stamp = Math.max(Date.now(), lastEdgeStamp + 1)
    lastEdgeStamp = stamp
    const newEdge: FlowEdge = {
      id: `e-${pending.sourceId}-${node.id}-${stamp}`,
      source: pending.sourceId,
      sourceHandle: pending.sourceHandle,
      target: node.id,
      targetHandle: handle,
    }
    commit({ nodes: nodes(), edges: addEdge(edges(), newEdge) })
    setPendingConnection(null)
  }

  // ---- Edge selection ----

  /**
   * Select an edge (single-edge selection on click).
   *
   * @param edge - The clicked edge.
   * @param event - The mouse event.
   */
  const selectEdge = (edge: FlowEdge, event: MouseEvent): void => {
    event.stopPropagation()
    setSelectionAndNotify({ nodeIds: [], edgeIds: [edge.id] })
    props.onEdgeClick?.(edge)
  }

  // ---- Render ----

  /** The node lookup the edge overlay uses. */
  const nodeById = createMemo(() => {
    const map = new Map<string, FlowNode>()
    for (const node of nodes()) map.set(node.id, node)
    return map
  })

  /** The pending connection's path, or null while there is none. */
  const pendingPath = createMemo(() => {
    const pending = pendingConnection()
    if (!pending) return null
    const src = nodeById().get(pending.sourceId)
    return src ? bezierPath(defaultSourcePort(src), pending.pointer) : null
  })

  return (
    <div
      ref={(element) => {
        rootEl = element
      }}
      role="application"
      aria-label={t('flowCanvas.aria.canvas', {}, { defaultValue: 'Flow canvas' })}
      data-mol-id="flow-canvas"
      class={cm.cn(cm.position('relative'), cm.surfaceSecondary, props.className)}
      onPointerDown={onCanvasPointerDown}
      onPointerMove={onCanvasPointerMove}
      onPointerUp={onCanvasPointerUp}
      onWheel={onWheel}
      style={{
        overflow: 'hidden',
        'touch-action': 'none',
        width: '100%',
        height: '100%',
      }}
    >
      <Show when={props.showGrid !== false}>
        <div
          aria-hidden="true"
          data-mol-id="flow-canvas-grid"
          style={{
            position: 'absolute',
            inset: '0px',
            'background-image':
              'radial-gradient(circle, rgba(127,127,127,0.35) 1px, transparent 1px)',
            'background-size': `${24 * viewport().zoom}px ${24 * viewport().zoom}px`,
            'background-position': `${viewport().x}px ${viewport().y}px`,
            'pointer-events': 'none',
          }}
        />
      </Show>

      {/* World-transform layer holds nodes + the SVG edge overlay. */}
      <div
        data-mol-id="flow-canvas-world"
        style={{
          transform: `translate(${viewport().x}px, ${viewport().y}px) scale(${viewport().zoom})`,
          'transform-origin': '0 0',
          position: 'absolute',
          inset: '0px',
        }}
      >
        <svg
          aria-hidden="true"
          data-mol-id="flow-canvas-edges"
          width="100%"
          height="100%"
          style={{
            position: 'absolute',
            inset: '0px',
            overflow: 'visible',
            'pointer-events': 'none',
          }}
        >
          <For each={edges()}>
            {(edge) => {
              const ports = createMemo(() => {
                const src = nodeById().get(edge.source)
                const tgt = nodeById().get(edge.target)
                return src && tgt ? { a: defaultSourcePort(src), b: defaultTargetPort(tgt) } : null
              })
              return (
                <Show when={ports()}>
                  {(p) => (
                    <g>
                      {/* Wide invisible hit-target so clicks land on thin lines. */}
                      <path
                        d={bezierPath(p().a, p().b)}
                        data-mol-id={`flow-canvas-edge-hit-${edge.id}`}
                        fill="none"
                        stroke="transparent"
                        stroke-width={14}
                        style={{ 'pointer-events': 'stroke', cursor: 'pointer' }}
                        onClick={(event) => selectEdge(edge, event)}
                      />
                      <path
                        d={bezierPath(p().a, p().b)}
                        data-mol-id={`flow-canvas-edge-${edge.id}`}
                        data-selected={selection().edgeIds.includes(edge.id) ? 'true' : 'false'}
                        fill="none"
                        stroke="currentColor"
                        stroke-width={selection().edgeIds.includes(edge.id) ? 2.5 : 1.5}
                        opacity={selection().edgeIds.includes(edge.id) ? 1 : 0.6}
                        style={{ 'pointer-events': 'none' }}
                      />
                    </g>
                  )}
                </Show>
              )
            }}
          </For>
          <Show when={pendingPath()}>
            {(d) => (
              <path
                d={d()}
                data-mol-id="flow-canvas-pending-edge"
                fill="none"
                stroke="currentColor"
                stroke-width={1.5}
                stroke-dasharray="4 4"
                opacity={0.7}
                style={{ 'pointer-events': 'none' }}
              />
            )}
          </Show>
        </svg>

        <For each={nodes()}>
          {(node, index) => {
            const w = (): number => node.width ?? DEFAULT_NODE_WIDTH
            const h = (): number => node.height ?? DEFAULT_NODE_HEIGHT
            const isSelected = (): boolean => selection().nodeIds.includes(node.id)
            // Index-based: a node id may hold spaces, which aria-labelledby would split.
            const contentId = `${idBase}-node-${index()}`
            // The select button's name: the node's own `ariaLabel` when it has
            // one, else the translated numbered label when neither a renderer
            // nor children fills the node (a nameless button is unoperable for
            // a screen reader), else the node's content as before.
            const buttonName = (): string | undefined =>
              node.ariaLabel ??
              (!props.nodeRenderers?.[node.type] && props.children == null
                ? t(
                    'flowCanvas.aria.node',
                    { number: index() + 1 },
                    { defaultValue: 'Node {{number}}' },
                  )
                : undefined)
            return (
              <div
                role="group"
                data-mol-id={`flow-canvas-node-${node.id}`}
                data-selected={isSelected() ? 'true' : 'false'}
                data-node-type={node.type}
                class={cm.cn(
                  cm.surface,
                  cm.borderAll,
                  isSelected() ? cm.borderBPrimary : '',
                  cm.cursorPointer,
                )}
                onPointerDown={(event) => onNodePointerDown(event, node)}
                onPointerMove={onNodePointerMove}
                onPointerUp={(event) => {
                  onNodePointerUp(event)
                  const pending = pendingConnection()
                  if (pending && pending.sourceId !== node.id) completeConnection(node)
                }}
                style={{
                  position: 'absolute',
                  transform: `translate(${node.position.x}px, ${node.position.y}px)`,
                  width: `${w()}px`,
                  height: `${h()}px`,
                }}
              >
                {/* The keyboard path to selection: a select button covering the node,
                    beneath its content and named by the node's `ariaLabel`, the content
                    it wraps, or the canvas's numbered node label. A sibling, not a
                    wrapper, so a renderer may hold its own inputs and buttons (nothing
                    interactive may nest in a button). */}
                <button
                  type="button"
                  data-mol-id={`flow-canvas-node-select-${node.id}`}
                  aria-label={buttonName()}
                  aria-labelledby={buttonName() == null ? contentId : undefined}
                  onClick={(event) => {
                    // Only keyboard activation (Enter / Space on the focused
                    // button) — a browser synthesizes those clicks with `detail === 0`.
                    if (event.detail === 0) selectNode(node)
                  }}
                  class={cm.cn(cm.position('absolute'), cm.inset0, cm.cursorPointer)}
                  style={selectButtonStyle()}
                />
                <div
                  id={contentId}
                  class={cm.position('relative')}
                  style={{ width: '100%', height: '100%' }}
                >
                  {props.nodeRenderers?.[node.type]
                    ? props.nodeRenderers[node.type]!(node)
                    : props.children}
                </div>
                <div
                  role="button"
                  aria-label={t(
                    'flowCanvas.aria.sourceHandle',
                    {},
                    { defaultValue: 'Drag to connect' },
                  )}
                  data-mol-id={`flow-canvas-node-handle-${node.id}`}
                  onPointerDown={(event) => onHandlePointerDown(event, node)}
                  style={handleStyle()}
                />
              </div>
            )
          }}
        </For>
      </div>
    </div>
  )
}
