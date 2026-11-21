/**
 * MindMapCanvas component (React parity): the Angular counterpart of
 * `@molecule/app-mind-map-canvas-react`'s `<MindMapCanvas>` — the same props
 * (React names), the same ClassMap classes, the same inline geometry and the
 * same DOM for the same input.
 *
 * @module
 */

import {
  afterEveryRender,
  Component,
  ElementRef,
  inject,
  type OnDestroy,
  type OnInit,
  ViewChild,
} from '@angular/core'

import { useTranslation } from '@molecule/app-angular'
import { CanvasEdge, CanvasNode, CanvasSurface } from '@molecule/app-feature-canvas-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import {
  computeHorizontalTreePositions,
  computeRadialPositions,
  DEFAULT_NODE_HEIGHT,
  DEFAULT_NODE_WIDTH,
} from './layout.js'
import { addChild, setNodeText, toggleCollapsed } from './tree.js'
import type { MindMapLayoutResult, MindMapNode } from './types.js'

/** One edge's endpoints, as React's `edgeEndpoints` memo entry. */
interface EdgeEndpoint {
  /** `${parentId}->${childId}`, the key React renders the edge under. */
  id: string
  /** The parent node's center. */
  from: { x: number; y: number }
  /** The child node's center. */
  to: { x: number; y: number }
}

/**
 * The layout inputs React destructures with defaults, cached so a render pass
 * computes the layout once.
 */
interface LayoutInputs {
  /** The tree the layout ran on. */
  root: MindMapNode
  /** Layout strategy. */
  layout: 'radial' | 'horizontal' | 'vertical'
  /** Surface width. */
  width: number
  /** Surface height. */
  height: number
  /** Node width. */
  nodeWidth: number
  /** Node height. */
  nodeHeight: number
}

/**
 * MindMapCanvas component.
 *
 * The host IS the outer `<div>` (`div[mol-mind-map]`), matching React's root
 * exactly. Composes `<CanvasSurface>` for pan/zoom, `<CanvasNode>` for each
 * tree node, and `<CanvasEdge kind="bezier">` for parent → child links.
 * Domain-specific behavior lives here, not in the base: auto-layout (radial /
 * horizontal / vertical), fold/unfold subtrees, inline edit-on-double-click,
 * and the add-child button.
 */
@Component({
  selector: 'div[mol-mind-map]',
  standalone: true,
  imports: [CanvasSurface, CanvasNode, CanvasEdge],
  inputs: [
    'root',
    'onChange',
    'layout',
    'width',
    'height',
    'nodeWidth',
    'nodeHeight',
    'onNodeClick',
    'onNodeEdit',
    'className',
  ],
  host: {
    'data-mol-id': 'mind-map-canvas',
    '[attr.data-mind-map-layout]': 'layoutValue()',
    '[class]': 'classes()',
  },
  template: `<div
    mol-canvas-surface
    [width]="surfaceWidth()"
    [height]="surfaceHeight()"
    [ariaLabel]="canvasLabel()"
  >
    @for (edge of edgeEndpoints(); track edge.id) {
      <svg mol-canvas-edge [from]="edge.from" [to]="edge.to" [kind]="'bezier'"></svg>
    }
    @for (node of visibleNodes(); track node.id) {
      @if (positionOf(node); as pos) {
        <div
          mol-canvas-node
          [id]="node.id"
          [position]="pos"
          [size]="nodeSize()"
          [onSelect]="selectHandler(node)"
        >
          <!-- React's body div carries no role; the dblclick handler opens the
              inline editor, which the <input> receives focus for. -->
          <div
            [attr.data-mol-id]="'mind-map-node-body-' + node.id"
            [class]="bodyClasses(node)"
            [style]="bodyStyle(node)"
            (dblclick)="beginEdit(node, $event)"
          >
            @if (editingId === node.id) {
              <input
                #editInput
                [attr.aria-label]="editLabel()"
                [attr.data-mol-id]="'mind-map-node-input-' + node.id"
                [value]="editingDraft"
                [attr.value]="editingDraft"
                [style]="editInputStyle()"
                (input)="onDraftInput($event)"
                (blur)="commitEdit()"
                (keydown)="onEditKeyDown($event)"
                (pointerdown)="$event.stopPropagation()"
              />
            } @else {
              <span [attr.data-mol-id]="'mind-map-node-text-' + node.id">{{ node.text }}</span>
            }
            @if (hasChildren(node)) {
              <button
                type="button"
                [attr.aria-label]="node.collapsed ? expandLabel() : collapseLabel()"
                [attr.aria-expanded]="!node.collapsed"
                [attr.data-mol-id]="'mind-map-node-toggle-' + node.id"
                [class]="roundButtonClasses()"
                [style]="toggleButtonStyle()"
                (pointerdown)="$event.stopPropagation()"
                (click)="toggleNode($event, node)"
              >
                {{ node.collapsed ? '+' : '−' }}
              </button>
            }
            <button
              type="button"
              [attr.aria-label]="addChildLabel()"
              [attr.data-mol-id]="'mind-map-node-add-' + node.id"
              [class]="roundButtonClasses()"
              [style]="addButtonStyle(node)"
              (pointerdown)="$event.stopPropagation()"
              (click)="addNode($event, node)"
            >
              +
            </button>
          </div>
        </div>
      }
    }
  </div>`,
})
export class MindMapCanvas implements OnInit, OnDestroy {
  /** Root of the mind-map tree (controlled) or its initial value (uncontrolled). */
  root?: MindMapNode
  /** If provided, the canvas runs in controlled mode. */
  onChange?: (next: MindMapNode) => void
  /** Layout strategy (defaults to `'radial'` at read time). */
  layout?: 'radial' | 'horizontal' | 'vertical'
  /** Width of the surface in CSS pixels (defaults to `800` at read time). */
  width?: number
  /** Height of the surface in CSS pixels (defaults to `600` at read time). */
  height?: number
  /** Node width in canvas units (defaults to {@link DEFAULT_NODE_WIDTH}). */
  nodeWidth?: number
  /** Node height in canvas units (defaults to {@link DEFAULT_NODE_HEIGHT}). */
  nodeHeight?: number
  /** Fired when a node is clicked (single click, no drag). */
  onNodeClick?: (node: MindMapNode) => void
  /** Fired when a node's text is committed via inline edit. */
  onNodeEdit?: (id: string, text: string) => void
  /** Extra classes merged onto the outer wrapper. */
  className?: string

  /** Internal mirror used in uncontrolled mode (React's `useState` seed). */
  private internalRoot: MindMapNode | null = null
  /** The node currently being edited, or null. */
  private editingId: string | null = null
  /** The draft text of the open inline editor. */
  private editingDraft = ''
  /** The node id the inline editor last moved focus into (focus-once guard). */
  private focusedFor: string | null = null
  /** The cached layout (React's `useMemo`). */
  private cachedLayout: { inputs: LayoutInputs; result: MindMapLayoutResult } | null = null

  /** The inline editor's input, when it is mounted. */
  @ViewChild('editInput') private editInput?: ElementRef<HTMLInputElement>

  /** The host element (React's root `<div>`). */
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef)

  /**
   * Reactive translation, read in the injection context. Its `t` reads the
   * locale, so the view re-renders the text on a locale switch.
   */
  private readonly i18n = useTranslation()

  /** Seeds the uncontrolled tree, as React's `useState` does. */
  ngOnInit(): void {
    this.internalRoot = this.root ?? null
  }

  /**
   * Registers the inline editor's focus as an after-render write: moves focus
   * into the freshly-mounted editor (the WAI-ARIA inline-edit pattern) once the
   * view carries it — React's `useEffect(… focus …)` — where a `focusin`
   * listener's state change renders. The focus-once guard keeps later render
   * passes from stealing focus back.
   */
  constructor() {
    afterEveryRender({ write: () => this.focusInlineEditor() })
  }

  /**
   * Focuses the inline editor once per opened node; a later pass whose node is
   * still the focused one does nothing.
   */
  private focusInlineEditor(): void {
    if (this.editingId !== null && this.focusedFor !== this.editingId && this.editInput) {
      this.editInput.nativeElement.focus()
      this.focusedFor = this.editingId
    }
  }

  /** No subscriptions to release; the hook documents the lifecycle. */
  ngOnDestroy(): void {
    this.focusedFor = null
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

  /** The root the canvas renders. */
  currentRoot(): MindMapNode | null {
    return this.isControlled() ? (this.root ?? null) : this.internalRoot
  }

  /**
   * The wrapper class list (React's `cm.cn(cm.position('relative'), className)`).
   * @returns The class string.
   */
  classes(): string {
    const cm = this.cm()
    return cm.cn(cm.position('relative'), this.className)
  }

  /**
   * The layout attribute React writes on the wrapper.
   * @returns The layout strategy.
   */
  layoutValue(): string {
    return this.layout ?? 'radial'
  }

  /** The layout props with React's destructuring defaults applied. */
  private layoutInputs(): LayoutInputs {
    return {
      root: this.currentRoot() ?? { id: '', text: '', children: [] },
      layout: this.layout ?? 'radial',
      width: this.width ?? 800,
      height: this.height ?? 600,
      nodeWidth: this.nodeWidth ?? DEFAULT_NODE_WIDTH,
      nodeHeight: this.nodeHeight ?? DEFAULT_NODE_HEIGHT,
    }
  }

  /**
   * The layout of the current tree (React's `useMemo` body, cached per input).
   * @returns Positions, edges and the visible nodes.
   */
  layoutResult(): MindMapLayoutResult {
    const inputs = this.layoutInputs()
    const cached = this.cachedLayout
    if (
      cached &&
      cached.inputs.root === inputs.root &&
      cached.inputs.layout === inputs.layout &&
      cached.inputs.width === inputs.width &&
      cached.inputs.height === inputs.height &&
      cached.inputs.nodeWidth === inputs.nodeWidth &&
      cached.inputs.nodeHeight === inputs.nodeHeight
    ) {
      return cached.result
    }
    const opts = {
      nodeWidth: inputs.nodeWidth,
      nodeHeight: inputs.nodeHeight,
      origin: { x: inputs.width / 2, y: inputs.height / 2 },
    }
    const result =
      inputs.layout === 'radial'
        ? computeRadialPositions(inputs.root, opts)
        : computeHorizontalTreePositions(
            inputs.root,
            { ...opts, origin: { x: inputs.nodeWidth, y: inputs.height / 2 } },
            inputs.layout === 'vertical' ? 'vertical' : 'horizontal',
          )
    this.cachedLayout = { inputs, result }
    return result
  }

  /**
   * The canvas-space box of every node (React's `size` prop).
   * @returns The width and height.
   */
  nodeSize(): { width: number; height: number } {
    return {
      width: this.nodeWidth ?? DEFAULT_NODE_WIDTH,
      height: this.nodeHeight ?? DEFAULT_NODE_HEIGHT,
    }
  }

  /**
   * The surface width (React's `width` default).
   * @returns The width in pixels.
   */
  surfaceWidth(): number {
    return this.width ?? 800
  }

  /**
   * The surface height (React's `height` default).
   * @returns The height in pixels.
   */
  surfaceHeight(): number {
    return this.height ?? 600
  }

  /**
   * The nodes the canvas renders.
   * @returns The visible nodes in tree order.
   */
  visibleNodes(): MindMapNode[] {
    return this.layoutResult().visibleNodes
  }

  /**
   * The canvas-space top-left position of a node.
   * @param node - The node.
   * @returns The position, or null when the node has none.
   */
  positionOf(node: MindMapNode): { x: number; y: number } | null {
    return this.layoutResult().positions.get(node.id) ?? null
  }

  /**
   * The edges' endpoints, connecting node-center → node-center so the bezier
   * looks natural in every layout (React's `edgeEndpoints` memo).
   * @returns One entry per edge.
   */
  edgeEndpoints(): EdgeEndpoint[] {
    const { positions, edges } = this.layoutResult()
    const nodeWidth = this.nodeWidth ?? DEFAULT_NODE_WIDTH
    const nodeHeight = this.nodeHeight ?? DEFAULT_NODE_HEIGHT
    return edges.map((edge) => {
      const p = positions.get(edge.parentId)!
      const c = positions.get(edge.childId)!
      return {
        id: `${edge.parentId}->${edge.childId}`,
        from: { x: p.x + nodeWidth / 2, y: p.y + nodeHeight / 2 },
        to: { x: c.x + nodeWidth / 2, y: c.y + nodeHeight / 2 },
      }
    })
  }

  /**
   * The canvas' accessible name (React's `mindMap.aria.canvas`).
   * @returns The translated label.
   */
  canvasLabel(): string {
    return this.i18n.t('mindMap.aria.canvas', {}, { defaultValue: 'Mind map canvas' })
  }

  /**
   * The collapse toggle's accessible name (React's `mindMap.action.collapse`).
   * @returns The translated label.
   */
  collapseLabel(): string {
    return this.i18n.t('mindMap.action.collapse', {}, { defaultValue: 'Collapse subtree' })
  }

  /**
   * The expand toggle's accessible name (React's `mindMap.action.expand`).
   * @returns The translated label.
   */
  expandLabel(): string {
    return this.i18n.t('mindMap.action.expand', {}, { defaultValue: 'Expand subtree' })
  }

  /**
   * The add-child button's accessible name (React's `mindMap.action.addChild`).
   * @returns The translated label.
   */
  addChildLabel(): string {
    return this.i18n.t('mindMap.action.addChild', {}, { defaultValue: 'Add child node' })
  }

  /**
   * The inline editor's accessible name (React's `mindMap.aria.edit`).
   * @returns The translated label.
   */
  editLabel(): string {
    return this.i18n.t('mindMap.aria.edit', {}, { defaultValue: 'Edit node text' })
  }

  /**
   * The default text of a freshly added child (React's `mindMap.defaults.newChild`).
   * @returns The translated text.
   */
  newChildText(): string {
    return this.i18n.t('mindMap.defaults.newChild', {}, { defaultValue: 'New idea' })
  }

  /**
   * A node body's class list: the surface/border/cursor chrome, plus the
   * accent-card recipe in its custom tone when the node carries a color.
   * @param node - The node.
   * @returns The class string.
   */
  bodyClasses(node: MindMapNode): string {
    const cm = this.cm()
    return cm.cn(
      cm.surface,
      cm.borderAll,
      cm.cursorPointer,
      node.color && cm.accentCard({ tone: 'custom' }),
    )
  }

  /**
   * A node body's inline style — fills the CanvasNode box and, when the node
   * carries a color, feeds the accent bar's `--mol-accent` variable.
   * @param node - The node.
   * @returns The CSS text.
   */
  bodyStyle(node: MindMapNode): string {
    const accent = node.color ? `--mol-accent: ${node.color}; ` : ''
    const padding = node.color ? '0 8px 0 30px' : '0 8px'
    return `${accent}width: 100%; height: 100%; box-sizing: border-box; display: flex; align-items: center; padding: ${padding}`
  }

  /**
   * The round icon-button class list (React's cursor/rounding/touch chrome).
   * @returns The class string.
   */
  roundButtonClasses(): string {
    const cm = this.cm()
    return cm.cn(cm.cursorPointer, cm.roundedFull, cm.touchTargetCompact)
  }

  /**
   * The collapse toggle's inline style.
   * @returns The CSS text.
   */
  toggleButtonStyle(): string {
    return 'margin-left: auto; width: 20px; height: 20px'
  }

  /**
   * The add-child button's inline style (React's `marginLeft` follows the
   * presence of a toggle button).
   * @param node - The node the button belongs to.
   * @returns The CSS text.
   */
  addButtonStyle(node: MindMapNode): string {
    const marginLeft = this.hasChildren(node) ? '4px' : 'auto'
    return `margin-left: ${marginLeft}; width: 20px; height: 20px`
  }

  /**
   * The inline editor's input style — the bare field reset.
   * @returns The CSS text.
   */
  editInputStyle(): string {
    return 'width: 100%; background: transparent; border: none; outline: none; font: inherit; color: inherit'
  }

  /**
   * Whether a node renders a collapse toggle.
   * @param node - The node.
   * @returns True when the node has children.
   */
  hasChildren(node: MindMapNode): boolean {
    return node.children.length > 0
  }

  /**
   * The per-node `onSelect` handler React passes to `<CanvasNode>`: a click
   * (press without movement) fires `onNodeClick`, a double-click opens the
   * inline editor, and the press is ignored while this node is editing.
   *
   * @param node - The node the handler belongs to.
   * @returns The handler.
   */
  selectHandler(node: MindMapNode): (id: string | undefined, e: PointerEvent) => void {
    return (_id, e) => {
      if (this.editingId === node.id) return
      // Fire click only if not double-clicking; the surface forwards detail
      // count via the native event when available.
      if ((e.detail ?? 1) >= 2) {
        this.beginEdit(node, e)
        return
      }
      this.onNodeClick?.(node)
    }
  }

  /**
   * Push a tree mutation through either the controlled callback or the
   * internal state mirror.
   *
   * @param next - The replacement root after the mutation.
   */
  commit(next: MindMapNode): void {
    if (this.isControlled()) this.onChange?.(next)
    else this.internalRoot = next
  }

  /**
   * Begin an inline-edit on the given node — seeds the draft with the current
   * text and stops surface pan via `event.stopPropagation()`.
   *
   * @param node - Node to start editing.
   * @param event - The triggering event.
   */
  beginEdit(node: MindMapNode, event: Event): void {
    event.stopPropagation()
    this.editingId = node.id
    this.editingDraft = node.text
    this.focusedFor = null
  }

  /**
   * Commit the current draft to the tree (calls `onNodeEdit` after `commit`)
   * and exit edit mode.
   */
  commitEdit(): void {
    if (this.editingId == null) return
    const id = this.editingId
    const text = this.editingDraft
    this.editingId = null
    this.editingDraft = ''
    this.focusedFor = null
    const root = this.currentRoot()
    if (root) this.commit(setNodeText(root, id, text))
    this.onNodeEdit?.(id, text)
  }

  /** Cancel edit mode without committing. */
  cancelEdit(): void {
    this.editingId = null
    this.editingDraft = ''
    this.focusedFor = null
  }

  /**
   * Reads the typed draft from the inline editor.
   *
   * @param event - The native input event.
   */
  onDraftInput(event: Event): void {
    this.editingDraft = (event.target as HTMLInputElement).value
  }

  /**
   * Handle key events inside the inline-edit input — Enter commits, Escape
   * cancels, every other key bubbles normally.
   *
   * @param event - Keyboard event from the input.
   */
  onEditKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault()
      this.commitEdit()
    } else if (event.key === 'Escape') {
      event.preventDefault()
      this.cancelEdit()
    }
  }

  /**
   * The collapse toggle: flips `collapsed` and stops the click's propagation.
   *
   * @param event - The click event.
   * @param node - The node to toggle.
   */
  toggleNode(event: MouseEvent, node: MindMapNode): void {
    event.stopPropagation()
    const root = this.currentRoot()
    if (root) this.commit(toggleCollapsed(root, node.id))
  }

  /**
   * The add-child button: appends a "New idea" child (React's id carries the
   * timestamp and a random draw) and stops the click's propagation.
   *
   * @param event - The click event.
   * @param node - The parent to append to.
   */
  addNode(event: MouseEvent, node: MindMapNode): void {
    event.stopPropagation()
    const root = this.currentRoot()
    if (!root) return
    const newId = `${node.id}-c-${Date.now()}-${Math.floor(Math.random() * 1000)}`
    this.commit(
      addChild(root, node.id, {
        id: newId,
        text: this.newChildText(),
        children: [],
      }),
    )
  }
}
