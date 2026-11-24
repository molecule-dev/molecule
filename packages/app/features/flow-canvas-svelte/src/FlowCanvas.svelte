<!--
  FlowCanvas: the Svelte counterpart of `@molecule/app-flow-canvas-react`'s
  `<FlowCanvas>` — a node-and-edge editor with drag, connect, pan, zoom,
  select and delete built in. Same props (React names), same ClassMap
  classes, same inline geometry, same DOM for the same input. Node renderers
  and the children fallback are snippets.
-->
<script lang="ts">
  import { onMount, untrack } from 'svelte'
  import type { Attachment } from 'svelte/attachments'

  import { contentNodes, useTranslation } from '@molecule/app-svelte'
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
    FlowEdge,
    FlowNode,
    FlowPoint,
    FlowSelection,
    FlowViewport,
  } from './types.js'

  /** A connection being drawn from a source handle. */
  interface PendingConnection {
    /** The source node the drag started from. */
    sourceId: string
    /** Optional source handle id. */
    sourceHandle?: string
    /** The pointer position in world coordinates. */
    pointer: FlowPoint
  }

  /** The viewport the canvas starts with when `initialViewport` is unset. */
  const DEFAULT_VIEWPORT: FlowViewport = { x: 0, y: 0, zoom: 1 }

  let {
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
  }: FlowCanvasProps = $props()

  const cm = getClassMap()
  const { t } = useTranslation()

  // Internal mirrors used in uncontrolled mode (React's `useState`): the
  // initial props are snapshotted once.
  let internalNodes = $state<FlowNode[]>(untrack(() => nodesProp))
  let internalEdges = $state<FlowEdge[]>(untrack(() => edgesProp))

  let selection = $state<FlowSelection>({ nodeIds: [], edgeIds: [] })
  let viewport = $state<FlowViewport>(untrack(() => initialViewport ?? DEFAULT_VIEWPORT))
  let pendingConnection = $state<PendingConnection | null>(null)

  /** The canvas root element, for rect maths and pointer capture. */
  let rootEl: HTMLDivElement | undefined = $state()

  // Pending drags and pans (React's `useRef` holders): not rendered.
  let drag: { id: string; pointerId: number; lastWorld: FlowPoint } | null = null
  let pan: { pointerId: number; startClient: FlowPoint; startVp: FlowViewport } | null = null

  // This instance's stable id (React's `useId()`).
  const idBase = $props.id()

  /** Whether `onChange` makes the canvas controlled. */
  const controlled = $derived(typeof onChange === 'function')
  /** The nodes the canvas renders. */
  const nodes = $derived(controlled ? nodesProp : internalNodes)
  /** The edges the canvas renders. */
  const edges = $derived(controlled ? edgesProp : internalEdges)

  /**
   * Commit a graph mutation.
   *
   * @param next - New `{ nodes, edges }` after the mutation.
   */
  const commit = (next: { nodes: FlowNode[]; edges: FlowEdge[] }): void => {
    if (controlled) onChange?.(next)
    else {
      internalNodes = next.nodes
      internalEdges = next.edges
    }
  }

  /**
   * Update selection state and surface the change via the optional callback.
   *
   * @param next - New selection.
   */
  const setSelectionAndNotify = (next: FlowSelection): void => {
    selection = next
    onSelectionChange?.(next)
  }

  /**
   * Select a single node and surface the node-click callback.
   *
   * @param node - The node to select.
   */
  const selectNode = (node: FlowNode): void => {
    setSelectionAndNotify({ nodeIds: [node.id], edgeIds: [] })
    onNodeClick?.(node)
  }

  // ---- Delete-key shortcut ----

  /**
   * Window-level keydown listener for Backspace / Delete.
   *
   * @param event - Native keyboard event.
   */
  const onKeyDown = (event: KeyboardEvent): void => {
    if (disableDeleteShortcut) return
    if (event.key !== 'Backspace' && event.key !== 'Delete') return
    const target = event.target as HTMLElement | null
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
    for (const id of selection.edgeIds) nextEdges = removeEdge(nextEdges, id)
    commit({ nodes: nextNodes, edges: nextEdges })
    setSelectionAndNotify({ nodeIds: [], edgeIds: [] })
  }

  onMount(() => {
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  })

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
    const world = clientToWorld(event.clientX, event.clientY, rect, viewport)
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
    const world = clientToWorld(event.clientX, event.clientY, rect, viewport)
    const dx = world.x - current.lastWorld.x
    const dy = world.y - current.lastWorld.y
    if (dx === 0 && dy === 0) return
    current.lastWorld = world
    commit({ nodes: translateNode(nodes, current.id, dx, dy), edges })
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
    if (disablePan) return
    if (event.button !== 0) return
    if (event.target !== rootEl) return
    pan = {
      pointerId: event.pointerId,
      startClient: { x: event.clientX, y: event.clientY },
      startVp: viewport,
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
    if (pendingConnection) {
      const rect = rootEl?.getBoundingClientRect()
      if (!rect) return
      const world = clientToWorld(event.clientX, event.clientY, rect, viewport)
      pendingConnection = { ...pendingConnection, pointer: world }
      return
    }
    const current = pan
    if (!current || current.pointerId !== event.pointerId) return
    const dx = event.clientX - current.startClient.x
    const dy = event.clientY - current.startClient.y
    viewport = { ...current.startVp, x: current.startVp.x + dx, y: current.startVp.y + dy }
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
    if (pendingConnection) {
      // No target node was hit → cancel.
      pendingConnection = null
    }
  }

  // ---- Zoom ----

  /**
   * Anchored zoom around the cursor.
   *
   * @param event - Wheel event.
   */
  const onWheel = (event: WheelEvent): void => {
    if (disableZoom) return
    event.preventDefault()
    const rect = rootEl?.getBoundingClientRect()
    if (!rect) return
    const factor = Math.exp(-event.deltaY * 0.001)
    const nextZoom = Math.max(0.2, Math.min(4, viewport.zoom * factor))
    const cx = event.clientX - rect.left
    const cy = event.clientY - rect.top
    const wx = (cx - viewport.x) / viewport.zoom
    const wy = (cy - viewport.y) / viewport.zoom
    viewport = {
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
    const world = clientToWorld(event.clientX, event.clientY, rect, viewport)
    pendingConnection = { sourceId: node.id, sourceHandle: handle, pointer: world }
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
    const pending = pendingConnection
    if (!pending) return
    if (pending.sourceId === node.id) {
      pendingConnection = null
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
    commit({ nodes, edges: addEdge(edges, newEdge) })
    pendingConnection = null
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
    onEdgeClick?.(edge)
  }

  // ---- Render helpers ----

  /**
   * The node with this id, when it exists.
   *
   * @param id - The node id.
   * @returns The node, or undefined.
   */
  const findNode = (id: string): FlowNode | undefined => nodes.find((node) => node.id === id)

  /** The content id of the node at this index (index-based: ids may hold spaces). */
  const contentId = (index: number): string => `${idBase}-node-${index}`

  // React's `slot(children) == null`: a children snippet that renders nothing (an empty list)
  // leaves the node content empty, so its select button falls back to the numbered aria-label. A
  // snippet's `{#each}` over no rows changes the DOM without changing the prop, so presence is
  // read per node's rendered content.
  let contentPresent = $state<Record<number, boolean>>({})
  const trackContent =
    (index: number): Attachment<HTMLElement> =>
    (element) => {
      const sync = (): void => {
        const present = contentNodes(element).some(
          (node) => node.nodeType === 1 || (node.textContent ?? '').trim() !== '',
        )
        if (contentPresent[index] !== present)
          contentPresent = { ...contentPresent, [index]: present }
      }
      sync()
      const observer = new MutationObserver(sync)
      observer.observe(element, { childList: true, characterData: true, subtree: true })
      return () => observer.disconnect()
    }
</script>

<div
  bind:this={rootEl}
  role="application"
  aria-label={t('flowCanvas.aria.canvas', {}, { defaultValue: 'Flow canvas' })}
  data-mol-id="flow-canvas"
  class={cm.cn(cm.position('relative'), cm.surfaceSecondary, className)}
  onpointerdown={onCanvasPointerDown}
  onpointermove={onCanvasPointerMove}
  onpointerup={onCanvasPointerUp}
  onwheel={onWheel}
  style:overflow="hidden"
  style:touch-action="none"
  style:width="100%"
  style:height="100%"
>
  {#if showGrid}
    <div
      aria-hidden="true"
      data-mol-id="flow-canvas-grid"
      style:position="absolute"
      style:inset="0px"
      style:background-image="radial-gradient(circle, rgba(127,127,127,0.35) 1px, transparent 1px)"
      style:background-size="{24 * viewport.zoom}px {24 * viewport.zoom}px"
      style:background-position="{viewport.x}px {viewport.y}px"
      style:pointer-events="none"
    ></div>
  {/if}

  <!-- World-transform layer holds nodes + the SVG edge overlay. -->
  <div
    data-mol-id="flow-canvas-world"
    style:transform="translate({viewport.x}px, {viewport.y}px) scale({viewport.zoom})"
    style:transform-origin="0 0"
    style:position="absolute"
    style:inset="0px"
  >
    <svg
      aria-hidden="true"
      data-mol-id="flow-canvas-edges"
      width="100%"
      height="100%"
      style:position="absolute"
      style:inset="0px"
      style:overflow="visible"
      style:pointer-events="none"
    >
      {#each edges as edge (edge.id)}
        {@const src = findNode(edge.source)}
        {@const tgt = findNode(edge.target)}
        {#if src && tgt}
          {@const a = defaultSourcePort(src)}
          {@const b = defaultTargetPort(tgt)}
          {@const isSelected = selection.edgeIds.includes(edge.id)}
          <g>
            <!-- Wide invisible hit-target so clicks land on thin lines.
                 It mirrors React's DOM exactly: no role, no tab stop, and the
                 node's select button is the keyboard path to a node. -->
            <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
            <path
              d={bezierPath(a, b)}
              data-mol-id="flow-canvas-edge-hit-{edge.id}"
              fill="none"
              stroke="transparent"
              stroke-width="14"
              style:pointer-events="stroke"
              style:cursor="pointer"
              onclick={(event) => selectEdge(edge, event)}
            ></path>
            <path
              d={bezierPath(a, b)}
              data-mol-id="flow-canvas-edge-{edge.id}"
              data-selected={isSelected ? 'true' : 'false'}
              fill="none"
              stroke="currentColor"
              stroke-width={isSelected ? 2.5 : 1.5}
              opacity={isSelected ? 1 : 0.6}
              style:pointer-events="none"
            ></path>
          </g>
        {/if}
      {/each}
      {#if pendingConnection && findNode(pendingConnection.sourceId)}
        {@const pendingSource = findNode(pendingConnection.sourceId)!}
        <path
          d={bezierPath(defaultSourcePort(pendingSource), pendingConnection.pointer)}
          data-mol-id="flow-canvas-pending-edge"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-dasharray="4 4"
          opacity="0.7"
          style:pointer-events="none"
        ></path>
      {/if}
    </svg>

    {#each nodes as node, index (node.id)}
      {@const w = node.width ?? DEFAULT_NODE_WIDTH}
      {@const h = node.height ?? DEFAULT_NODE_HEIGHT}
      {@const isSelected = selection.nodeIds.includes(node.id)}
      <!-- The select button's name: the node's own `ariaLabel` when it has one,
           else the translated numbered label when neither a renderer nor
           children fills the node (a nameless button is unoperable for a screen
           reader), else the node's content as before. -->
      {@const buttonName =
        node.ariaLabel ??
        (!nodeRenderers?.[node.type] && !(children && contentPresent[index])
          ? t('flowCanvas.aria.node', { number: index + 1 }, { defaultValue: 'Node {{number}}' })
          : null)}
      <!-- The keyboard path to selection: a select button covering the node,
           beneath its content and named by the node's `ariaLabel`, the content
           it wraps, or the canvas's numbered node label. A sibling, not a
           wrapper, so a renderer may hold its own inputs and buttons. -->
      <div
        role="group"
        data-mol-id="flow-canvas-node-{node.id}"
        data-selected={isSelected ? 'true' : 'false'}
        data-node-type={node.type}
        class={cm.cn(
          cm.surface,
          cm.borderAll,
          isSelected ? cm.borderBPrimary : '',
          cm.cursorPointer,
        )}
        onpointerdown={(event) => onNodePointerDown(event, node)}
        onpointermove={onNodePointerMove}
        onpointerup={(event) => {
          onNodePointerUp(event)
          if (pendingConnection && pendingConnection.sourceId !== node.id) completeConnection(node)
        }}
        style:position="absolute"
        style:transform="translate({node.position.x}px, {node.position.y}px)"
        style:width="{w}px"
        style:height="{h}px"
      >
        <button
          type="button"
          data-mol-id="flow-canvas-node-select-{node.id}"
          aria-label={buttonName}
          aria-labelledby={buttonName == null ? contentId(index) : null}
          onclick={(event) => {
            // Only keyboard activation (Enter / Space on the focused button) —
            // a browser synthesizes those clicks with `detail === 0`.
            if (event.detail === 0) selectNode(node)
          }}
          class={cm.cn(cm.position('absolute'), cm.inset0, cm.cursorPointer)}
          style:background="transparent"
          style:border="none"
          style:padding="0px"
        ></button>
        <div
          id={contentId(index)}
          class={cm.position('relative')}
          style:width="100%"
          style:height="100%"
          {@attach trackContent(index)}
        >
          {#if nodeRenderers?.[node.type]}
            {@render nodeRenderers[node.type]?.(node)}
          {:else if children}
            {@render children?.()}
          {/if}
        </div>
        <!-- The connection handle is dragged, never focused: React's DOM gives it
             role="button" without a tab stop. -->
        <!-- svelte-ignore a11y_interactive_supports_focus -->
        <div
          role="button"
          aria-label={t('flowCanvas.aria.sourceHandle', {}, { defaultValue: 'Drag to connect' })}
          data-mol-id="flow-canvas-node-handle-{node.id}"
          onpointerdown={(event) => onHandlePointerDown(event, node)}
          style:position="absolute"
          style:right="-6px"
          style:top="50%"
          style:width="12px"
          style:height="12px"
          style:margin-top="-6px"
          style:border-radius="50%"
          style:background="currentColor"
          style:cursor="crosshair"
        ></div>
      </div>
    {/each}
  </div>
</div>
