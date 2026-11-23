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
 * template: the slot is captured out of the page, the template renders the
 * wrappers (and dividers) for the pane count, and the placement function
 * (`usePlacement`) renders each projected element inside its wrapper through
 * `placeElement` (which keeps Angular's own place for it). It reads the slot's
 * children every time Angular changes them, so a pane the consumer's `@for`
 * or `@if` adds, removes or reorders later gets its wrapper (and the trailing
 * pane its growth) as React's `panels.map` gives it. A projected text node is
 * dropped (React's `Children.toArray(...).filter(isValidElement)` drops a
 * text child).
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
  Component,
  computed,
  type ElementRef,
  type QueryList,
  signal,
  ViewChild,
  ViewChildren,
} from '@angular/core'

import {
  heldElement,
  MolPlacement,
  placeElement,
  setElementPresent,
  type SlotReader,
  usePlacement,
  useWorkspace,
} from '@molecule/app-angular'
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
  hostDirectives: [MolPlacement],
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
  }<span #panes><ng-content /></span>`,
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

  /** The capture of the projected panes; it is out of the page, and each pane renders in its wrapper. */
  @ViewChild('panes', { static: true }) private readonly panesCapture?: ElementRef<HTMLElement>

  /** Per-divider resize callbacks, kept stable across change-detection passes. */
  private readonly resizers = new Map<number, (delta: number) => void>()

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

  /**
   * Reads the slot's elements (React's `Children.toArray(children).filter(isValidElement)`),
   * renders one wrapper per element, and renders each element inside its wrapper. An element
   * already placed is listed by the placeholder that holds its place in the slot, so it is found
   * again through it; a text child is taken out of the page, as React drops it.
   *
   * @param hasContent - Reads the slot's children.
   */
  private placePanes(hasContent: SlotReader): void {
    const capture = this.panesCapture?.nativeElement
    if (!capture) return
    setElementPresent(capture, false)
    const panes: Node[] = []
    for (const node of hasContent.nodes(capture)) {
      const child = heldElement(node) ?? node
      if (child.nodeType === 1) panes.push(child)
      // React drops a text child (it is not an element).
      else setElementPresent(child, false)
    }
    if (this.childCount() !== panes.length) this.childCount.set(panes.length)
    const wrappers = this.panelEls?.map((ref) => ref.nativeElement) ?? []
    // The wrappers for a new count render in the next pass, which places the panes again.
    if (wrappers.length !== panes.length) return
    panes.forEach((pane, index) => placeElement(pane, wrappers[index] ?? null))
  }

  constructor() {
    usePlacement((hasContent) => this.placePanes(hasContent))
  }
}
