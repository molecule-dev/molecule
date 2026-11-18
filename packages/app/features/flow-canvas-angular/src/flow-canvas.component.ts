/**
 * FlowCanvas component (React parity): the Angular counterpart of
 * `@molecule/app-flow-canvas-react`'s `<FlowCanvas>` — the same props (React
 * names), the same ClassMap classes, the same inline geometry and the same DOM
 * for the same input.
 *
 * @module
 */

import { NgTemplateOutlet } from '@angular/common'
import {
  type AfterViewInit,
  ChangeDetectorRef,
  Component,
  type DoCheck,
  ElementRef,
  inject,
  type OnDestroy,
  type OnInit,
  type Renderer2,
  RendererFactory2,
  type TemplateRef,
  ViewChild,
} from '@angular/core'

import { useTranslation } from '@molecule/app-angular'
import { getClassMap, type UIClassMap } from '@molecule/app-ui'

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

/**
 * A connection being drawn from a source handle.
 *
 * @module
 */
interface PendingConnection {
  /** The source node the drag started from. */
  sourceId: string
  /** Optional source handle id. */
  sourceHandle?: string
  /** The pointer position in world coordinates. */
  pointer: FlowPoint
}

/** One edge's rendered geometry. */
interface RenderableEdge {
  /** The edge. */
  edge: FlowEdge
  /** The SVG path between its default ports. */
  d: string
  /** Whether the edge is in the current selection. */
  selected: boolean
}

/** The `ngTemplateOutlet` context a node renderer receives. */
type NodeTemplateContext = {
  /** The node (React's first renderer argument). */
  $implicit: FlowNode
  /** The node, Angular's `let-a0` binding. */
  a0: FlowNode
  /** React's second renderer argument (unused by this renderer). */
  a1?: unknown
  /** React's third renderer argument (unused by this renderer). */
  a2?: unknown
}

/** Counter that makes each mounted canvas's generated ids unique. */
let canvasInstances = 0

/**
 * FlowCanvas component.
 *
 * The host IS the outer `<div>` (`div[mol-flow-canvas]`), matching React's
 * root exactly. Renders nodes as absolutely-positioned `<div>` slots and edges
 * as a single `<svg>` overlay containing one `<path>` per edge.
 *
 * Node renderers are templates (`nodeRenderers[type]`, context `$implicit` =
 * the node); children passed as projected content render inside every node
 * that has no matching renderer — React renders one copy per node, so each
 * fallback node receives its own clone of the projected DOM.
 */
@Component({
  selector: 'div[mol-flow-canvas]',
  standalone: true,
  imports: [NgTemplateOutlet],
  inputs: [
    'nodes',
    'edges',
    'onChange',
    'nodeRenderers',
    'onSelectionChange',
    'onEdgeClick',
    'onNodeClick',
    'disableDeleteShortcut',
    'disablePan',
    'disableZoom',
    'showGrid',
    'initialViewport',
    'className',
  ],
  host: {
    role: 'application',
    '[attr.aria-label]': 'canvasLabel()',
    'data-mol-id': 'flow-canvas',
    '[class]': 'classes()',
    '[style.overflow]': '"hidden"',
    '[style.touch-action]': '"none"',
    '[style.width]': '"100%"',
    '[style.height]': '"100%"',
    '(pointerdown)': 'canvasPointerDown($event)',
    '(pointermove)': 'canvasPointerMove($event)',
    '(pointerup)': 'canvasPointerUp($event)',
    '(wheel)': 'wheel($event)',
  },
  // prettier-ignore
  template: `@if (showGridValue()) {<div aria-hidden="true" data-mol-id="flow-canvas-grid" [style.position]="'absolute'" [style.inset]="'0px'" [style.background-image]="'radial-gradient(circle, rgba(127,127,127,0.35) 1px, transparent 1px)'" [style.background-size]="gridSize()" [style.background-position]="gridPosition()" [style.pointer-events]="'none'"></div>}<div data-mol-id="flow-canvas-world" [style.transform]="worldTransform()" [style.transform-origin]="'0 0'" [style.position]="'absolute'" [style.inset]="'0px'"><svg aria-hidden="true" data-mol-id="flow-canvas-edges" width="100%" height="100%" [style.position]="'absolute'" [style.inset]="'0px'" [style.overflow]="'visible'" [style.pointer-events]="'none'">@for (item of renderableEdges(); track item.edge.id) {<g><path [attr.d]="item.d" [attr.data-mol-id]="'flow-canvas-edge-hit-' + item.edge.id" fill="none" stroke="transparent" stroke-width="14" [style.pointer-events]="'stroke'" [style.cursor]="'pointer'" (click)="edgeClick($event, item.edge)"></path><path [attr.d]="item.d" [attr.data-mol-id]="'flow-canvas-edge-' + item.edge.id" [attr.data-selected]="item.selected ? 'true' : 'false'" fill="none" stroke="currentColor" [attr.stroke-width]="item.selected ? 2.5 : 1.5" [attr.opacity]="item.selected ? 1 : 0.6" [style.pointer-events]="'none'"></path></g>}@if (pendingPath(); as pendingD) {<path [attr.d]="pendingD" data-mol-id="flow-canvas-pending-edge" fill="none" stroke="currentColor" stroke-width="1.5" stroke-dasharray="4 4" opacity="0.7" [style.pointer-events]="'none'"></path>}</svg>@for (node of nodeList(); track node.id; let i = $index) {<div role="group" [attr.data-mol-id]="'flow-canvas-node-' + node.id" [attr.data-selected]="isNodeSelected(node) ? 'true' : 'false'" [attr.data-node-type]="node.type" [class]="nodeClasses(node)" (pointerdown)="nodePointerDown($event, node)" (pointermove)="nodePointerMove($event)" (pointerup)="nodePointerUp($event, node)" [style.position]="'absolute'" [style.transform]="nodeTransform(node)" [style.width.px]="nodeWidth(node)" [style.height.px]="nodeHeight(node)"><button type="button" [attr.data-mol-id]="'flow-canvas-node-select-' + node.id" [attr.aria-label]="selectButtonName(node, i)" [attr.aria-labelledby]="selectButtonLabel(node, i)" (click)="selectClick($event, node)" [class]="selectClasses()" [style.background]="'transparent'" [style.border]="'none'" [style.padding]="'0px'"></button><div [attr.id]="contentId(i)" [class]="relativeClass()" [style.width]="'100%'" [style.height]="'100%'">@if (rendererFor(node); as nodeTpl) {<ng-container [ngTemplateOutlet]="nodeTpl" [ngTemplateOutletContext]="rendererContext(node)" />} @else {<ng-container #fallback></ng-container>}</div><div role="button" [attr.aria-label]="handleLabel()" [attr.data-mol-id]="'flow-canvas-node-handle-' + node.id" (pointerdown)="handlePointerDown($event, node)" [style.position]="'absolute'" [style.right]="'-6px'" [style.top]="'50%'" [style.width]="'12px'" [style.height]="'12px'" [style.margin-top]="'-6px'" [style.border-radius]="'50%'" [style.background]="'currentColor'" [style.cursor]="'crosshair'"></div></div>}<div #childSlot [style.display]="'none'"><ng-content></ng-content></div></div>`,
})
export class FlowCanvas implements OnInit, AfterViewInit, DoCheck, OnDestroy {
  /** Nodes (controlled) or initial nodes (uncontrolled). */
  nodes?: FlowNode[]
  /** Edges (controlled) or initial edges (uncontrolled). */
  edges?: FlowEdge[]
  /** If provided, the canvas runs in controlled mode. */
  onChange?: (next: FlowChange) => void
  /** Map of node `type` → renderer template. */
  nodeRenderers?: FlowNodeRenderers
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
  /** Show the dotted background grid (defaults to true at read time). */
  showGrid?: boolean
  /** Initial viewport (uncontrolled only). */
  initialViewport?: FlowViewport
  /** Extra classes merged onto the outer wrapper. */
  className?: string

  /** Internal nodes used in uncontrolled mode (React's `useState`). */
  private internalNodes: FlowNode[] = []
  /** Internal edges used in uncontrolled mode. */
  private internalEdges: FlowEdge[] = []
  /** Current selection. */
  private selection: FlowSelection = { nodeIds: [], edgeIds: [] }
  /** Current pan + zoom. */
  private viewport: FlowViewport = DEFAULT_VIEWPORT
  /** The connection being drawn, if any. */
  private pendingConnection: PendingConnection | null = null
  // The stamp of the last edge this canvas drew: the epoch ms, moved past the
  // previous stamp so two edges drawn in one millisecond still get distinct ids.
  private lastEdgeStamp = 0

  /** The node drag in progress. */
  private drag: { id: string; pointerId: number; lastWorld: FlowPoint } | null = null
  /** The pan in progress. */
  private pan: { pointerId: number; startClient: FlowPoint; startVp: FlowViewport } | null = null

  /** The projected children's source nodes, once the capture point is detached. */
  private projectedChildren: Node[] = []
  /** The copies inserted into each no-renderer node's content element. */
  private readonly clones = new Map<HTMLElement, Node[]>()

  /** This canvas's generated-id base (React's `useId`). */
  private readonly idBase = `mol-flow-${++canvasInstances}`

  /** The `<ng-content>` capture point for fallback children. */
  @ViewChild('childSlot') private childSlot?: ElementRef<HTMLElement>

  /** The host element — React's root `<div>`. */
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef)
  /** Marks the view dirty after a window-level (non-template) event. */
  private readonly cdr = inject(ChangeDetectorRef)
  /** The DOM renderer, for detaching the capture point. */
  private readonly renderer: Renderer2 = inject(RendererFactory2).createRenderer(null, null)
  /** The window keydown listener, so it can be removed on destroy. */
  private readonly onKeyDown = (event: KeyboardEvent): void => this.handleKeyDown(event)

  /**
   * Reactive translation, read in the injection context. Its `t` reads the
   * locale, so the view re-renders the text on a locale switch.
   */
  private readonly i18n = useTranslation()

  /** Snapshots the initial (uncontrolled) state, as React's `useState` does. */
  ngOnInit(): void {
    this.internalNodes = this.nodes ?? []
    this.internalEdges = this.edges ?? []
    this.viewport = this.initialViewport ?? DEFAULT_VIEWPORT
    window.addEventListener('keydown', this.onKeyDown)
  }

  /**
   * Schedules the children capture for right after this change-detection pass.
   * The projected nodes are created by the declaring view, so they can land
   * inside the capture point after this component's own view is set up — and
   * Angular runs no further change detection for a static view. A microtask runs
   * once the whole synchronous refresh (projection included) has finished.
   */
  ngAfterViewInit(): void {
    Promise.resolve().then(() => this.captureChildren())
  }

  /** Reconciles each no-renderer node's fallback content after input writes. */
  ngDoCheck(): void {
    this.reconcileFallbackChildren()
  }

  /** Removes the window keydown listener. */
  ngOnDestroy(): void {
    window.removeEventListener('keydown', this.onKeyDown)
  }

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /** Whether `onChange` makes the canvas controlled. */
  isControlled(): boolean {
    return typeof this.onChange === 'function'
  }

  /** The nodes the canvas renders. */
  nodeList(): FlowNode[] {
    return this.isControlled() ? (this.nodes ?? []) : this.internalNodes
  }

  /** The edges the canvas renders. */
  edgeList(): FlowEdge[] {
    return this.isControlled() ? (this.edges ?? []) : this.internalEdges
  }

  /** Whether the grid is shown (React's `showGrid = true` default). */
  showGridValue(): boolean {
    return this.showGrid ?? true
  }

  /**
   * The canvas' accessible name (React's `flowCanvas.aria.canvas`).
   * @returns The translated label.
   */
  canvasLabel(): string {
    return this.i18n.t('flowCanvas.aria.canvas', {}, { defaultValue: 'Flow canvas' })
  }

  /**
   * A source handle's accessible name (React's `flowCanvas.aria.sourceHandle`).
   * @returns The translated label.
   */
  handleLabel(): string {
    return this.i18n.t('flowCanvas.aria.sourceHandle', {}, { defaultValue: 'Drag to connect' })
  }

  /**
   * The wrapper class list (React's `cm.cn(cm.position('relative'), cm.surfaceSecondary, className)`).
   * @returns The class string.
   */
  classes(): string {
    const cm = this.cm()
    return cm.cn(cm.position('relative'), cm.surfaceSecondary, this.className)
  }

  /**
   * A node's class list.
   * @param node - The node.
   * @returns The class string.
   */
  nodeClasses(node: FlowNode): string {
    const cm = this.cm()
    return cm.cn(
      cm.surface,
      cm.borderAll,
      this.isNodeSelected(node) ? cm.borderBPrimary : '',
      cm.cursorPointer,
    )
  }

  /**
   * The select button's class list.
   * @returns The class string.
   */
  selectClasses(): string {
    const cm = this.cm()
    return cm.cn(cm.position('absolute'), cm.inset0, cm.cursorPointer)
  }

  /**
   * The content wrapper's class list.
   * @returns The class string.
   */
  relativeClass(): string {
    return this.cm().position('relative')
  }

  /**
   * The world layer's inline style (React's viewport transform).
   * @returns The transform string.
   */
  worldTransform(): string {
    return `translate(${this.viewport.x}px, ${this.viewport.y}px) scale(${this.viewport.zoom})`
  }

  /**
   * The grid's background size.
   * @returns The background-size string.
   */
  gridSize(): string {
    return `${24 * this.viewport.zoom}px ${24 * this.viewport.zoom}px`
  }

  /**
   * The grid's background position.
   * @returns The background-position string.
   */
  gridPosition(): string {
    return `${this.viewport.x}px ${this.viewport.y}px`
  }

  /**
   * A node's transform.
   * @param node - The node.
   * @returns The transform string.
   */
  nodeTransform(node: FlowNode): string {
    return `translate(${node.position.x}px, ${node.position.y}px)`
  }

  /**
   * A node's width (React's `node.width ?? 180`).
   * @param node - The node.
   * @returns The width in world units.
   */
  nodeWidth(node: FlowNode): number {
    return node.width ?? DEFAULT_NODE_WIDTH
  }

  /**
   * A node's height (React's `node.height ?? 80`).
   * @param node - The node.
   * @returns The height in world units.
   */
  nodeHeight(node: FlowNode): number {
    return node.height ?? DEFAULT_NODE_HEIGHT
  }

  /**
   * Whether a node is in the selection.
   * @param node - The node.
   * @returns True when selected.
   */
  isNodeSelected(node: FlowNode): boolean {
    return this.selection.nodeIds.includes(node.id)
  }

  /**
   * A node content element's generated id (index-based: ids may hold spaces).
   * @param index - The node index.
   * @returns The id.
   */
  contentId(index: number): string {
    return `${this.idBase}-node-${index}`
  }

  /**
   * The select button's accessible name: the node's own `ariaLabel` when it
   * has one, else the translated numbered label when neither a renderer nor
   * projected children fill the node (a nameless button is unoperable for a
   * screen reader), else null — the button is named by its content element.
   *
   * @param node - The node.
   * @param index - The node index.
   * @returns The name, or null when the content names the button.
   */
  selectButtonName(node: FlowNode, index: number): string | null {
    if (node.ariaLabel) return node.ariaLabel
    if (!this.rendererFor(node) && this.projectedChildren.length === 0) {
      return this.i18n.t(
        'flowCanvas.aria.node',
        { number: index + 1 },
        { defaultValue: 'Node {{number}}' },
      )
    }
    return null
  }

  /**
   * The content element that names the select button, when the button is
   * named by its content rather than an aria-label (see
   * {@link selectButtonName}).
   *
   * @param node - The node.
   * @param index - The node index.
   * @returns The content id, or null.
   */
  selectButtonLabel(node: FlowNode, index: number): string | null {
    if (node.ariaLabel) return null
    if (!this.rendererFor(node) && this.projectedChildren.length === 0) return null
    return this.contentId(index)
  }

  /**
   * The renderer template for a node's type, when one is registered.
   * @param node - The node.
   * @returns The template, or null.
   */
  rendererFor(node: FlowNode): TemplateRef<NodeTemplateContext> | null {
    return this.nodeRenderers?.[node.type] ?? null
  }

  /**
   * The context a node renderer receives (React passes the node as its first argument).
   * @param node - The node.
   * @returns The template context.
   */
  rendererContext(node: FlowNode): NodeTemplateContext {
    return { $implicit: node, a0: node, a1: undefined, a2: undefined }
  }

  /**
   * The node with this id, when it exists.
   * @param id - The node id.
   * @returns The node, or undefined.
   */
  findNode(id: string): FlowNode | undefined {
    return this.nodeList().find((node) => node.id === id)
  }

  /**
   * The edges whose endpoints both exist, with their rendered geometry.
   * @returns The renderable edges.
   */
  renderableEdges(): RenderableEdge[] {
    const out: RenderableEdge[] = []
    for (const edge of this.edgeList()) {
      const src = this.findNode(edge.source)
      const tgt = this.findNode(edge.target)
      if (!src || !tgt) continue
      out.push({
        edge,
        d: bezierPath(defaultSourcePort(src), defaultTargetPort(tgt)),
        selected: this.selection.edgeIds.includes(edge.id),
      })
    }
    return out
  }

  /**
   * The pending connection's SVG path, when its source node still exists.
   * @returns The path string, or null.
   */
  pendingPath(): string | null {
    const pending = this.pendingConnection
    if (!pending) return null
    const src = this.findNode(pending.sourceId)
    return src ? bezierPath(defaultSourcePort(src), pending.pointer) : null
  }

  /**
   * Commits a graph mutation.
   * @param next - New `{ nodes, edges }` after the mutation.
   */
  commit(next: FlowChange): void {
    if (this.isControlled()) this.onChange?.(next)
    else {
      this.internalNodes = next.nodes
      this.internalEdges = next.edges
    }
  }

  /**
   * Updates the selection and surfaces it through the optional callback.
   * @param next - New selection.
   */
  setSelectionAndNotify(next: FlowSelection): void {
    this.selection = next
    this.onSelectionChange?.(next)
  }

  /**
   * Selects a single node and surfaces the node-click callback.
   * @param node - The node to select.
   */
  selectNode(node: FlowNode): void {
    this.setSelectionAndNotify({ nodeIds: [node.id], edgeIds: [] })
    this.onNodeClick?.(node)
  }

  /**
   * Selects a node from the keyboard-activated select button (React's `detail === 0` path).
   * @param event - The click event.
   * @param node - The node.
   */
  selectClick(event: MouseEvent, node: FlowNode): void {
    if (event.detail === 0) this.selectNode(node)
  }

  /**
   * Selects an edge (single-edge selection on click).
   * @param event - The click event.
   * @param edge - The clicked edge.
   */
  edgeClick(event: MouseEvent, edge: FlowEdge): void {
    event.stopPropagation()
    this.setSelectionAndNotify({ nodeIds: [], edgeIds: [edge.id] })
    this.onEdgeClick?.(edge)
  }

  /**
   * The window-level Backspace / Delete shortcut handler.
   * @param event - Native keyboard event.
   */
  handleKeyDown(event: KeyboardEvent): void {
    if (this.disableDeleteShortcut) return
    if (event.key !== 'Backspace' && event.key !== 'Delete') return
    const target = event.target as HTMLElement | null
    // Don't steal text-editing keystrokes.
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return
    if (target && target.isContentEditable) return
    if (this.selection.nodeIds.length === 0 && this.selection.edgeIds.length === 0) return
    let nextNodes = this.nodeList()
    let nextEdges = this.edgeList()
    for (const id of this.selection.nodeIds) {
      const pruned = removeNode(nextNodes, nextEdges, id)
      nextNodes = pruned.nodes
      nextEdges = pruned.edges
    }
    for (const id of this.selection.edgeIds) nextEdges = removeEdge(nextEdges, id)
    this.commit({ nodes: nextNodes, edges: nextEdges })
    this.setSelectionAndNotify({ nodeIds: [], edgeIds: [] })
    this.cdr.markForCheck()
  }

  /**
   * Begins a node drag.
   * @param event - Pointer-down event on the node body.
   * @param node - The node being dragged.
   */
  nodePointerDown(event: PointerEvent, node: FlowNode): void {
    if (event.button !== 0) return
    event.stopPropagation()
    const rect = this.host.nativeElement.getBoundingClientRect()
    if (!rect) return
    const world = clientToWorld(event.clientX, event.clientY, rect, this.viewport)
    this.drag = { id: node.id, pointerId: event.pointerId, lastWorld: world }
    try {
      ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
    } catch (_error) {
      // Safe to ignore: setPointerCapture is unsupported in jsdom and very old
      // browsers; dragging still works, just without implicit pointer capture.
    }
    this.selectNode(node)
  }

  /**
   * Translates the dragged node by the world-space delta since the last frame.
   * @param event - Pointer-move event.
   */
  nodePointerMove(event: PointerEvent): void {
    const current = this.drag
    if (!current || current.pointerId !== event.pointerId) return
    const rect = this.host.nativeElement.getBoundingClientRect()
    if (!rect) return
    const world = clientToWorld(event.clientX, event.clientY, rect, this.viewport)
    const dx = world.x - current.lastWorld.x
    const dy = world.y - current.lastWorld.y
    if (dx === 0 && dy === 0) return
    current.lastWorld = world
    this.commit({
      nodes: translateNode(this.nodeList(), current.id, dx, dy),
      edges: this.edgeList(),
    })
  }

  /**
   * Ends a drag and completes a pending connection over a target node.
   * @param event - Pointer-up event.
   * @param node - The node the pointer was released over.
   */
  nodePointerUp(event: PointerEvent, node: FlowNode): void {
    if (this.drag?.pointerId === event.pointerId) {
      try {
        ;(event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId)
      } catch (_error) {
        // Safe to ignore: releasePointerCapture may throw in jsdom or if
        // the pointer was never captured (e.g. drag started outside window).
      }
      this.drag = null
    }
    const pending = this.pendingConnection
    if (pending && pending.sourceId !== node.id) this.completeConnection(node)
  }

  /**
   * Begins a viewport pan on empty canvas space.
   * @param event - Pointer-down event on the root.
   */
  canvasPointerDown(event: PointerEvent): void {
    if (this.disablePan) return
    if (event.button !== 0) return
    if (event.target !== this.host.nativeElement) return
    this.pan = {
      pointerId: event.pointerId,
      startClient: { x: event.clientX, y: event.clientY },
      startVp: this.viewport,
    }
    try {
      this.host.nativeElement.setPointerCapture(event.pointerId)
    } catch (_error) {
      // Safe to ignore: setPointerCapture is unsupported in jsdom and very old
      // browsers; panning still works, just without implicit pointer capture.
    }
    this.setSelectionAndNotify({ nodeIds: [], edgeIds: [] })
  }

  /**
   * Pans the viewport, or updates the pending-connection pointer.
   * @param event - Pointer-move event.
   */
  canvasPointerMove(event: PointerEvent): void {
    const pending = this.pendingConnection
    if (pending) {
      const rect = this.host.nativeElement.getBoundingClientRect()
      if (!rect) return
      const world = clientToWorld(event.clientX, event.clientY, rect, this.viewport)
      this.pendingConnection = { ...pending, pointer: world }
      return
    }
    const current = this.pan
    if (!current || current.pointerId !== event.pointerId) return
    const dx = event.clientX - current.startClient.x
    const dy = event.clientY - current.startClient.y
    this.viewport = { ...current.startVp, x: current.startVp.x + dx, y: current.startVp.y + dy }
  }

  /**
   * Finishes a pan or cancels a pending connection.
   * @param event - Pointer-up event.
   */
  canvasPointerUp(event: PointerEvent): void {
    if (this.pan?.pointerId === event.pointerId) {
      try {
        this.host.nativeElement.releasePointerCapture(event.pointerId)
      } catch (_error) {
        // Safe to ignore: releasePointerCapture may throw in jsdom or if the
        // pointer was never captured (e.g. pan started outside window).
      }
      this.pan = null
    }
    if (this.pendingConnection) {
      // No target node was hit → cancel.
      this.pendingConnection = null
    }
  }

  /**
   * Anchored zoom around the cursor.
   * @param event - Wheel event.
   */
  wheel(event: WheelEvent): void {
    if (this.disableZoom) return
    event.preventDefault()
    const rect = this.host.nativeElement.getBoundingClientRect()
    if (!rect) return
    const factor = Math.exp(-event.deltaY * 0.001)
    const nextZoom = Math.max(0.2, Math.min(4, this.viewport.zoom * factor))
    const cx = event.clientX - rect.left
    const cy = event.clientY - rect.top
    const wx = (cx - this.viewport.x) / this.viewport.zoom
    const wy = (cy - this.viewport.y) / this.viewport.zoom
    this.viewport = {
      x: cx - wx * nextZoom,
      y: cy - wy * nextZoom,
      zoom: nextZoom,
    }
  }

  /**
   * Begins drawing a connection edge from a source handle.
   * @param event - Pointer-down on the handle.
   * @param node - Source node.
   */
  handlePointerDown(event: PointerEvent, node: FlowNode): void {
    if (event.button !== 0) return
    event.stopPropagation()
    const rect = this.host.nativeElement.getBoundingClientRect()
    if (!rect) return
    const world = clientToWorld(event.clientX, event.clientY, rect, this.viewport)
    this.pendingConnection = { sourceId: node.id, pointer: world }
    try {
      this.host.nativeElement.setPointerCapture(event.pointerId)
    } catch (_error) {
      // Safe to ignore: setPointerCapture is unsupported in jsdom and very old
      // browsers; connection drawing still works without pointer capture.
    }
  }

  /**
   * Completes a pending connection on pointer-up over a target node.
   * @param node - The target node.
   */
  completeConnection(node: FlowNode): void {
    const pending = this.pendingConnection
    if (!pending) return
    if (pending.sourceId === node.id) {
      this.pendingConnection = null
      return
    }
    const stamp = Math.max(Date.now(), this.lastEdgeStamp + 1)
    this.lastEdgeStamp = stamp
    const newEdge: FlowEdge = {
      id: `e-${pending.sourceId}-${node.id}-${stamp}`,
      source: pending.sourceId,
      sourceHandle: pending.sourceHandle,
      target: node.id,
      targetHandle: undefined,
    }
    this.commit({ nodes: this.nodeList(), edges: addEdge(this.edgeList(), newEdge) })
    this.pendingConnection = null
  }

  /**
   * Takes the projected children out of the always-mounted capture point and
   * detaches it, leaving a comment where it sat (the normalizer strips comments),
   * then fills every no-renderer node's content element with a copy.
   *
   * Projection anchor comments and whitespace-only text nodes are dropped: they
   * carry nothing the caller projected, and "did the caller project children"
   * decides each select button's accessible name (see {@link selectButtonName}).
   */
  private captureChildren(): void {
    const capture = this.childSlot?.nativeElement
    if (!capture) return
    this.projectedChildren = Array.from(capture.childNodes).filter(
      (child) =>
        child.nodeType !== Node.COMMENT_NODE &&
        !(child.nodeType === Node.TEXT_NODE && !(child.textContent ?? '').trim()),
    )
    const parent = capture.parentNode
    if (parent) {
      const anchor = this.renderer.createComment('flow-canvas-children')
      parent.insertBefore(anchor, capture)
      this.renderer.removeChild(parent, capture)
    }
    this.reconcileFallbackChildren()
    this.syncSelectButtonNames()
  }

  /**
   * Fills each no-renderer node's content element with a copy of the projected
   * children, and drops those copies once a renderer applies (React renders a
   * fresh copy per node and keeps it mounted while the node stays).
   */
  private reconcileFallbackChildren(): void {
    if (this.projectedChildren.length === 0) return
    const host = this.host.nativeElement
    const list = this.nodeList()
    for (let index = 0; index < list.length; index++) {
      const node = list[index]!
      const element = host.querySelector<HTMLElement>(`[id="${this.contentId(index)}"]`)
      if (!element) continue
      const existing = this.clones.get(element)
      if (this.rendererFor(node)) {
        if (existing) {
          for (const clone of existing) clone.parentNode?.removeChild(clone)
          this.clones.delete(element)
        }
        continue
      }
      if (existing) continue
      const copies = this.projectedChildren.map((child) => child.cloneNode(true))
      for (const copy of copies) element.appendChild(copy)
      this.clones.set(element, copies)
    }
    for (const [element, clones] of [...this.clones]) {
      if (element.isConnected) continue
      for (const clone of clones) clone.parentNode?.removeChild(clone)
      this.clones.delete(element)
    }
  }

  /**
   * Writes each select button's accessible name to match its node (see
   * {@link selectButtonName}). The template bindings re-evaluate only in a
   * change-detection pass, but the projected children land in a microtask
   * after the view is created — with no pass guaranteed to follow — so the
   * buttons are synced here, right where the children arrive. A later pass
   * re-applies exactly these values, and the values agree wherever they came
   * from.
   */
  private syncSelectButtonNames(): void {
    const list = this.nodeList()
    for (let index = 0; index < list.length; index++) {
      const node = list[index]!
      const content = this.host.nativeElement.querySelector<HTMLElement>(
        `[id="${this.contentId(index)}"]`,
      )
      const button = content?.previousElementSibling
      if (!button) continue
      const name = this.selectButtonName(node, index)
      const labelledBy = this.selectButtonLabel(node, index)
      if (name !== null) {
        this.renderer.setAttribute(button, 'aria-label', name)
        this.renderer.removeAttribute(button, 'aria-labelledby')
      } else {
        this.renderer.removeAttribute(button, 'aria-label')
        if (labelledBy !== null) this.renderer.setAttribute(button, 'aria-labelledby', labelledBy)
        else this.renderer.removeAttribute(button, 'aria-labelledby')
      }
    }
  }
}
