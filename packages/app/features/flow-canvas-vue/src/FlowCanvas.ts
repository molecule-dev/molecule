/**
 * Vue flow / DAG editor: the Vue counterpart of
 * `@molecule/app-flow-canvas-react`'s `<FlowCanvas>` — the same props (React
 * names), the same ClassMap classes, the same inline geometry and the same DOM
 * for the same input.
 *
 * @module
 */

import {
  defineComponent,
  h,
  onBeforeUnmount,
  onMounted,
  type PropType,
  ref,
  useId,
  type VNode,
  type VNodeChild,
} from 'vue'

import { getClassMap } from '@molecule/app-ui'
import { useTranslation } from '@molecule/app-vue'

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

/** The viewport the canvas starts with when `initialViewport` is unset. */
const DEFAULT_VIEWPORT: FlowViewport = { x: 0, y: 0, zoom: 1 }

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
 * @returns The flow-canvas component.
 */
export const FlowCanvas = defineComponent({
  name: 'FlowCanvas',
  props: {
    nodes: { type: Array as PropType<FlowNode[]>, required: true },
    edges: { type: Array as PropType<FlowEdge[]>, required: true },
    onChange: Function as PropType<(next: FlowChange) => void>,
    nodeRenderers: Object as PropType<FlowNodeRenderers>,
    onSelectionChange: Function as PropType<(selection: FlowSelection) => void>,
    onEdgeClick: Function as PropType<(edge: FlowEdge) => void>,
    onNodeClick: Function as PropType<(node: FlowNode) => void>,
    disableDeleteShortcut: { type: Boolean, default: false },
    disablePan: { type: Boolean, default: false },
    disableZoom: { type: Boolean, default: false },
    showGrid: { type: Boolean, default: true },
    initialViewport: Object as PropType<FlowViewport>,
    className: String,
  },
  setup(props, { slots }) {
    const cm = getClassMap()
    const { t } = useTranslation()

    // Internal mirrors used in uncontrolled mode (React's `useState`). Refs so
    // an interaction re-renders the canvas, as React's state setters do.
    const internalNodes = ref<FlowNode[]>(props.nodes)
    const internalEdges = ref<FlowEdge[]>(props.edges)

    const selection = ref<FlowSelection>({ nodeIds: [], edgeIds: [] })
    const viewport = ref<FlowViewport>(props.initialViewport ?? DEFAULT_VIEWPORT)
    const pendingConnection = ref<PendingConnection | null>(null)
    let rootEl: HTMLElement | null = null

    // Pending drags and pans (React's `useRef` holders).
    let drag: { id: string; pointerId: number; lastWorld: FlowPoint } | null = null
    let pan: { pointerId: number; startClient: FlowPoint; startVp: FlowViewport } | null = null

    const idBase = useId()

    /** Whether `onChange` makes the canvas controlled. */
    const controlled = (): boolean => typeof props.onChange === 'function'
    /** The nodes the canvas renders. */
    const nodes = (): FlowNode[] => (controlled() ? props.nodes : internalNodes.value)
    /** The edges the canvas renders. */
    const edges = (): FlowEdge[] => (controlled() ? props.edges : internalEdges.value)

    /**
     * Commit a graph mutation.
     *
     * @param next - New `{ nodes, edges }` after the mutation.
     */
    const commit = (next: FlowChange): void => {
      if (controlled()) props.onChange?.(next)
      else {
        internalNodes.value = next.nodes
        internalEdges.value = next.edges
      }
    }

    /**
     * Update selection state and surface the change via the optional callback.
     *
     * @param next - New selection.
     */
    const setSelectionAndNotify = (next: FlowSelection): void => {
      selection.value = next
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
     * Window-level keydown listener for Backspace / Delete, as React's effect
     * installs: it reads the current selection, nodes and edges at each key.
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
      if (selection.value.nodeIds.length === 0 && selection.value.edgeIds.length === 0) return
      let nextNodes = nodes()
      let nextEdges = edges()
      for (const id of selection.value.nodeIds) {
        const pruned = removeNode(nextNodes, nextEdges, id)
        nextNodes = pruned.nodes
        nextEdges = pruned.edges
      }
      for (const id of selection.value.edgeIds) nextEdges = removeEdge(nextEdges, id)
      commit({ nodes: nextNodes, edges: nextEdges })
      setSelectionAndNotify({ nodeIds: [], edgeIds: [] })
    }

    onMounted(() => window.addEventListener('keydown', onKeyDown))
    onBeforeUnmount(() => window.removeEventListener('keydown', onKeyDown))

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
      const world = clientToWorld(event.clientX, event.clientY, rect, viewport.value)
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
      const world = clientToWorld(event.clientX, event.clientY, rect, viewport.value)
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
        startVp: viewport.value,
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
      const pending = pendingConnection.value
      if (pending) {
        const rect = rootEl?.getBoundingClientRect()
        if (!rect) return
        const world = clientToWorld(event.clientX, event.clientY, rect, viewport.value)
        pendingConnection.value = { ...pending, pointer: world }
        return
      }
      const current = pan
      if (!current || current.pointerId !== event.pointerId) return
      const dx = event.clientX - current.startClient.x
      const dy = event.clientY - current.startClient.y
      viewport.value = { ...current.startVp, x: current.startVp.x + dx, y: current.startVp.y + dy }
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
      if (pendingConnection.value) {
        // No target node was hit → cancel.
        pendingConnection.value = null
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
      const factor = Math.exp(-event.deltaY * 0.001)
      const nextZoom = Math.max(0.2, Math.min(4, viewport.value.zoom * factor))
      const cx = event.clientX - rect.left
      const cy = event.clientY - rect.top
      const wx = (cx - viewport.value.x) / viewport.value.zoom
      const wy = (cy - viewport.value.y) / viewport.value.zoom
      viewport.value = {
        x: cx - wx * nextZoom,
        y: cy - wy * nextZoom,
        zoom: nextZoom,
      }
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
      const world = clientToWorld(event.clientX, event.clientY, rect, viewport.value)
      pendingConnection.value = { sourceId: node.id, sourceHandle: handle, pointer: world }
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
      const pending = pendingConnection.value
      if (!pending) return
      if (pending.sourceId === node.id) {
        pendingConnection.value = null
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
      pendingConnection.value = null
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
    const nodeById = (): Map<string, FlowNode> => {
      const map = new Map<string, FlowNode>()
      for (const node of nodes()) map.set(node.id, node)
      return map
    }

    /**
     * The content a node renders: its renderer's nodes, else the fallback slot.
     *
     * @param node - The node.
     * @returns The content children.
     */
    const nodeContent = (node: FlowNode): VNodeChild[] => {
      const renderer = props.nodeRenderers?.[node.type]
      if (renderer) return [renderer(node)]
      return slots.default ? slots.default() : []
    }

    return (): VNode => {
      const currentViewport = viewport.value
      const currentSelection = selection.value
      const currentPending = pendingConnection.value
      const byId = nodeById()

      const viewportTransform = {
        transform: `translate(${currentViewport.x}px, ${currentViewport.y}px) scale(${currentViewport.zoom})`,
        transformOrigin: '0 0',
        position: 'absolute',
        inset: '0px',
      } as const

      const edgeChildren: VNodeChild[] = []
      for (const edge of edges()) {
        const src = byId.get(edge.source)
        const tgt = byId.get(edge.target)
        if (!src || !tgt) continue
        const a = defaultSourcePort(src)
        const b = defaultTargetPort(tgt)
        const isSelected = currentSelection.edgeIds.includes(edge.id)
        edgeChildren.push(
          h('g', { key: edge.id }, [
            // Wide invisible hit-target so clicks land on thin lines.
            h('path', {
              d: bezierPath(a, b),
              'data-mol-id': `flow-canvas-edge-hit-${edge.id}`,
              fill: 'none',
              stroke: 'transparent',
              'stroke-width': 14,
              style: { pointerEvents: 'stroke', cursor: 'pointer' },
              onClick: (event: MouseEvent) => selectEdge(edge, event),
            }),
            h('path', {
              d: bezierPath(a, b),
              'data-mol-id': `flow-canvas-edge-${edge.id}`,
              'data-selected': isSelected ? 'true' : 'false',
              fill: 'none',
              stroke: 'currentColor',
              'stroke-width': isSelected ? 2.5 : 1.5,
              opacity: isSelected ? 1 : 0.6,
              style: { pointerEvents: 'none' },
            }),
          ]),
        )
      }
      if (currentPending) {
        const src = byId.get(currentPending.sourceId)
        if (src) {
          edgeChildren.push(
            h('path', {
              d: bezierPath(defaultSourcePort(src), currentPending.pointer),
              'data-mol-id': 'flow-canvas-pending-edge',
              fill: 'none',
              stroke: 'currentColor',
              'stroke-width': 1.5,
              'stroke-dasharray': '4 4',
              opacity: 0.7,
              style: { pointerEvents: 'none' },
            }),
          )
        }
      }

      const worldChildren: VNodeChild[] = [
        h(
          'svg',
          {
            'aria-hidden': 'true',
            'data-mol-id': 'flow-canvas-edges',
            width: '100%',
            height: '100%',
            style: {
              position: 'absolute',
              inset: '0px',
              overflow: 'visible',
              pointerEvents: 'none',
            },
          },
          edgeChildren,
        ),
      ]

      nodes().forEach((node, index) => {
        const w = node.width ?? DEFAULT_NODE_WIDTH
        const hgt = node.height ?? DEFAULT_NODE_HEIGHT
        const isSelected = currentSelection.nodeIds.includes(node.id)
        // Index-based: a node id may hold spaces, which aria-labelledby would split.
        const contentId = `${idBase}-node-${index}`
        // The select button's name: the node's own `ariaLabel` when it has
        // one, else the translated numbered label when neither a renderer
        // nor the fallback slot fills the node (a nameless button is
        // unoperable for a screen reader), else the node's content as before.
        const buttonName =
          node.ariaLabel ??
          (!props.nodeRenderers?.[node.type] && !slots.default
            ? t('flowCanvas.aria.node', { number: index + 1 }, { defaultValue: 'Node {{number}}' })
            : null)
        const buttonLabelledBy = buttonName == null ? contentId : null
        worldChildren.push(
          h(
            'div',
            {
              key: node.id,
              role: 'group',
              'data-mol-id': `flow-canvas-node-${node.id}`,
              'data-selected': isSelected ? 'true' : 'false',
              'data-node-type': node.type,
              class: cm.cn(
                cm.surface,
                cm.borderAll,
                isSelected ? cm.borderBPrimary : '',
                cm.cursorPointer,
              ),
              onPointerdown: (event: PointerEvent) => onNodePointerDown(event, node),
              onPointermove: onNodePointerMove,
              onPointerup: (event: PointerEvent) => {
                onNodePointerUp(event)
                const pending = pendingConnection.value
                if (pending && pending.sourceId !== node.id) completeConnection(node)
                // Vue's event invoker drops the same event after the first handler
                // when the clock is pinned (its duplicate-event guard compares equal
                // Date.now() timestamps), so the root's own pointer-up cleanup would
                // not run. It is idempotent: in real time the bubbled root handler
                // then finds nothing left to do.
                onCanvasPointerUp(event)
              },
              style: {
                position: 'absolute',
                transform: `translate(${node.position.x}px, ${node.position.y}px)`,
                width: `${w}px`,
                height: `${hgt}px`,
              },
            },
            [
              // The keyboard path to selection: a select button covering the node,
              // beneath its content and named by the node's `ariaLabel`, the content
              // it wraps, or the canvas's numbered node label. A sibling, not a
              // wrapper, so a renderer may hold its own inputs and buttons (nothing
              // interactive may nest in a button).
              h('button', {
                type: 'button',
                'data-mol-id': `flow-canvas-node-select-${node.id}`,
                'aria-label': buttonName,
                'aria-labelledby': buttonLabelledBy,
                onClick: (event: MouseEvent) => {
                  // Only keyboard activation (Enter / Space on the focused
                  // button) — a browser synthesizes those clicks with `detail === 0`.
                  if (event.detail === 0) selectNode(node)
                },
                class: cm.cn(cm.position('absolute'), cm.inset0, cm.cursorPointer),
                style: { background: 'transparent', border: 'none', padding: '0px' },
              }),
              h(
                'div',
                {
                  id: contentId,
                  class: cm.position('relative'),
                  style: { width: '100%', height: '100%' },
                },
                nodeContent(node),
              ),
              h('div', {
                role: 'button',
                'aria-label': t(
                  'flowCanvas.aria.sourceHandle',
                  {},
                  { defaultValue: 'Drag to connect' },
                ),
                'data-mol-id': `flow-canvas-node-handle-${node.id}`,
                onPointerdown: (event: PointerEvent) => onHandlePointerDown(event, node),
                style: {
                  position: 'absolute',
                  right: '-6px',
                  top: '50%',
                  width: '12px',
                  height: '12px',
                  marginTop: '-6px',
                  borderRadius: '50%',
                  background: 'currentColor',
                  cursor: 'crosshair',
                },
              }),
            ],
          ),
        )
      })

      return h(
        'div',
        {
          ref: (el) => {
            rootEl = (el as HTMLElement | null) ?? null
          },
          role: 'application',
          'aria-label': t('flowCanvas.aria.canvas', {}, { defaultValue: 'Flow canvas' }),
          'data-mol-id': 'flow-canvas',
          class: cm.cn(cm.position('relative'), cm.surfaceSecondary, props.className),
          onPointerdown: onCanvasPointerDown,
          onPointermove: onCanvasPointerMove,
          onPointerup: onCanvasPointerUp,
          onWheel,
          style: {
            overflow: 'hidden',
            touchAction: 'none',
            width: '100%',
            height: '100%',
          },
        },
        [
          props.showGrid
            ? h('div', {
                'aria-hidden': 'true',
                'data-mol-id': 'flow-canvas-grid',
                style: {
                  position: 'absolute',
                  inset: '0px',
                  backgroundImage:
                    'radial-gradient(circle, rgba(127,127,127,0.35) 1px, transparent 1px)',
                  backgroundSize: `${24 * currentViewport.zoom}px ${24 * currentViewport.zoom}px`,
                  backgroundPosition: `${currentViewport.x}px ${currentViewport.y}px`,
                  pointerEvents: 'none',
                },
              })
            : null,
          // World-transform layer holds nodes + the SVG edge overlay.
          h('div', { 'data-mol-id': 'flow-canvas-world', style: viewportTransform }, worldChildren),
        ],
      )
    }
  },
})
