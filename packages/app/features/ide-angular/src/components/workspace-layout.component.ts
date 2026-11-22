/**
 * Top-level workspace layout with resizable panels.
 *
 * Angular counterpart of `@molecule/app-ide-react`'s `WorkspaceLayout` (see
 * that file for the design notes): the same inputs (React prop names), the
 * same DOM for the same input, the same callbacks. The host element IS React's
 * root `div` (an attribute selector), so the root's attribute, classes and
 * inline style sit on it through host bindings. Children (`children`, the
 * projected content) are arranged in a row; a draggable vertical divider
 * follows each pane but the last, and every divider resizes its left panel.
 * Only the trailing pane flex-grows — every leading pane keeps its
 * `flex-basis` exactly, so a drag moves its edge 1:1 with the pointer.
 *
 * Content projection lands all of `children` in one slot, so — exactly as in
 * the Svelte port — the panes cannot be projected into a wrapper each by the
 * template: the template renders the wrappers (and dividers) for the pane
 * count, and a post-render pass moves each projected element into its wrapper.
 * The count is not knowable before the projection exists, so the first pass
 * captures the projected elements and records their number; the next render
 * draws the wrappers. A projected text node is removed (React's
 * `Children.toArray(...).filter(isValidElement)` drops a text child).
 *
 * The same pass reconciles the panel configs to the panes actually rendered:
 * the default layout declares three panels (chat/editor/preview), but a host
 * commonly renders only two, so the visible configs are taken one per pane, in
 * order; a pane past the last config falls back to an equal split
 * (`livePanelSize`). A drag or key press writes the new size back through
 * `resizePanel`, so it persists in workspace state.
 *
 * Pane styles are serialized text rather than `styleText` longhands because
 * jsdom composes React's `flex-basis`/`flex-shrink`/`flex-grow` longhands into
 * the `flex` shorthand; writing the same shorthand keeps the `style` attribute
 * identical. Styling otherwise uses `getClassMap()` (`cm.*`). All
 * user-facing text goes through `t()` (the nested {@link ResizeHandle}).
 *
 * @module
 */

import {
  afterEveryRender,
  Component,
  computed,
  ElementRef,
  inject,
  Injector,
  type QueryList,
  signal,
  ViewChildren,
} from '@angular/core'

import { useWorkspace } from '@molecule/app-angular'
import type { PanelConfig } from '@molecule/app-ide'
import { clampPanelSize, livePanelSize } from '@molecule/app-ide-panel-logic'
import { getClassMap, type UIClassMap } from '@molecule/app-ui'
import { styleText } from '@molecule/app-ui-angular'

import { ResizeHandle } from './resize-handle.component.js'

/** Props for `WorkspaceLayout` — the React prop names, React's own contract. */
export interface WorkspaceLayoutProps {
  /** The panes, in row order (projected content). */
  children?: unknown
  /** Extra classes from the host, appended to the root's ClassMap classes. */
  className?: string
}

/**
 * Top-level workspace layout that arranges the panes in a row with draggable
 * vertical dividers between them.
 */
@Component({
  selector: 'div[mol-workspace-layout]',
  standalone: true,
  imports: [ResizeHandle],
  inputs: ['className'],
  host: {
    'data-workspace-layout': '',
    '[class]': 'rootClass()',
    '[attr.style]': 'rootStyle()',
  },
  // prettier-ignore
  template: `@for (index of indexes(); track index) {
    <div #panel [class]="panelClass()" [attr.style]="panelStyle(index)"></div>
    @if (index < indexes().length - 1) {
      <div mol-resize-handle [direction]="'horizontal'" [value]="handleValue(index)" [onResize]="resizeFor(index)"></div>
    }
  }<ng-content />`,
})
export class WorkspaceLayout {
  /** Extra classes from the host, appended to the root's ClassMap classes. */
  className?: string

  /** The bonded ClassMap (styling tokens resolve at render time). */
  protected readonly cm: UIClassMap = getClassMap()

  /** The IDE workspace state and its layout actions. */
  private readonly workspace = useWorkspace()

  /** The current panel layout, read reactively by the template. */
  protected readonly layout = this.workspace.layout

  /** How many panes render — known once the projected content exists. */
  private readonly childCount = signal(0)

  /** One entry per pane; the template renders a wrapper (and divider) per entry. */
  protected readonly indexes = computed(() =>
    Array.from({ length: this.childCount() }, (_, index) => index),
  )

  /** The visible panel configs taken one per rendered pane, in order. */
  private readonly panelConfigs = computed(() =>
    this.layout()
      .panels.filter((panel) => panel.visible !== false)
      .slice(0, this.childCount()),
  )

  /** The wrapper element the template rendered for each pane, in order. */
  @ViewChildren('panel') private panelEls!: QueryList<ElementRef<HTMLElement>>

  /** The divider components, so the post-render pass can tell them from panes. */
  @ViewChildren(ResizeHandle, { read: ElementRef })
  private handleEls!: QueryList<ElementRef<HTMLElement>>

  /** The component's host element (React's root `div`). */
  private readonly hostEl: ElementRef<HTMLElement> = inject(ElementRef)

  /** Per-divider resize callbacks, kept stable across change-detection passes. */
  private readonly resizers = new Map<number, (delta: number) => void>()

  /** The projected pane elements, in order, taken once from the projection slot. */
  private panes: HTMLElement[] = []

  /** Whether the projection has been captured into {@link panes}. */
  private captured = false

  /**
   * The root's classes: the row, full width and height, and the host's extra
   * classes, composed exactly as React composes them.
   *
   * @returns The resolved class string.
   */
  protected rootClass(): string {
    return this.cm.cn(
      this.cm.flex({ direction: 'row' }),
      this.cm.w('full'),
      this.cm.h('full'),
      this.className,
    )
  }

  /**
   * The root's inline style: clipping at full height, as React writes it.
   *
   * @returns The `style` attribute text.
   */
  protected rootStyle(): string | null {
    return styleText({ overflow: 'hidden', minHeight: 0 })
  }

  /**
   * A pane wrapper's classes: the centered column React gives it.
   *
   * @returns The resolved class string.
   */
  protected panelClass(): string {
    return this.cm.flex({ direction: 'col' })
  }

  /**
   * A pane's inline geometry: its size as the flex basis, and whether it is
   * the trailing pane that absorbs the leftover space.
   *
   * @param index - The pane's index in the row.
   * @returns The `style` attribute text.
   */
  protected panelStyle(index: number): string {
    const size = livePanelSize(this.layout(), this.panelConfigs(), index)
    const grow = index === this.indexes().length - 1 ? 1 : 0
    return `flex: ${grow} ${grow} ${size}%; min-width: 0px; overflow: hidden; position: relative`
  }

  /**
   * The leading pane's share (percent) of the two panes divider `index`
   * separates — the value the focusable separator reports as `aria-valuenow`.
   *
   * @param index - The divider's index (the pane before it).
   * @returns The leading pane's share of the pair, 0–100.
   */
  protected handleValue(index: number): number {
    const configs = this.panelConfigs()
    const lead = livePanelSize(this.layout(), configs, index)
    const trail = livePanelSize(this.layout(), configs, index + 1)
    const total = lead + trail
    return total > 0 ? (lead / total) * 100 : 50
  }

  /**
   * The divider's resize callback for one pane index (stable between passes).
   *
   * @param index - The divider's index (the panel it follows).
   * @returns A function taking the pixels moved since the last move.
   */
  protected resizeFor(index: number): (delta: number) => void {
    let handler = this.resizers.get(index)
    if (!handler) {
      handler = (delta: number): void => this.handleResize(index, delta)
      this.resizers.set(index, handler)
    }
    return handler
  }

  /**
   * Resizes the panel before divider `index` by a pixel delta: reads the
   * panel's live size, clamps the change against the layout container's
   * measured width (1000 when the DOM reports none) and writes the new
   * percentage back through the workspace provider.
   *
   * @param index - The divider's index (the panel it follows).
   * @param delta - The pixels moved since the last move.
   */
  private handleResize(index: number, delta: number): void {
    const configs: PanelConfig[] = this.panelConfigs()
    const config = configs[index]
    if (!config) return
    const containerWidth = document.querySelector('[data-workspace-layout]')?.clientWidth || 1000
    const currentSize = livePanelSize(this.layout(), configs, index)
    const newSize = clampPanelSize(currentSize, delta, containerWidth)
    this.workspace.resizePanel(config.id, newSize)
  }

  /** Records the projected panes, then keeps each one inside its wrapper. */
  private syncPanes(): void {
    const host = this.hostEl.nativeElement
    const wrappers = this.panelEls.map((ref) => ref.nativeElement)
    if (!this.captured) {
      const handles = new Set<Node>(this.handleEls.map((ref) => ref.nativeElement))
      const elements: HTMLElement[] = []
      for (const node of Array.from(host.childNodes)) {
        if (node.nodeType === 1 && !handles.has(node)) elements.push(node as HTMLElement)
        // React drops a text child (it is not an element).
        else if (node.nodeType === 3) node.remove()
      }
      this.captured = true
      this.panes = elements
      if (elements.length && this.childCount() !== elements.length) {
        this.childCount.set(elements.length)
      }
      return
    }
    this.panes.forEach((node, index) => {
      const wrapper = wrappers[index]
      if (wrapper && node.parentNode !== wrapper) wrapper.appendChild(node)
    })
  }

  constructor() {
    // The panes are placed after every render pass: only then has the
    // projected content landed, and a post-render mutation still lands before
    // the DOM is observed.
    afterEveryRender(() => this.syncPanes(), { injector: inject(Injector) })
  }
}
