/**
 * A slot's children rendered again in another place, as React renders `{children}` in more than
 * one place.
 *
 * @module
 */

import {
  afterEveryRender,
  Directive,
  ElementRef,
  type EmbeddedViewRef,
  inject,
  Input,
  type OnDestroy,
  ViewContainerRef,
} from '@angular/core'

import { lazySlotTemplate } from './lazy-slot.js'

/** One child of the slot, as rendered here. */
interface Copy {
  /** The slot's child it copies. */
  readonly source: Node
  /** The instance stamped from a `*molLazy` child's template. */
  readonly view: EmbeddedViewRef<unknown> | null
  /** The DOM copy of any other child. */
  readonly node: Node | null
}

/**
 * The nodes a copy puts in the page.
 *
 * @param copy - The copy.
 * @returns Its nodes, in order.
 */
const nodesOf = (copy: Copy): Node[] =>
  copy.view === null ? [copy.node as Node] : (copy.view.rootNodes as Node[])

/**
 * Renders a slot's children here, as React renders `{children}` inside each row, node or gap:
 * every place shows its own copy. Give it the slot's children (`SlotReader.nodes` of
 * `usePlacement`) and keep the slot itself out of the page (`setElementPresent(capture,
 * false)`), so the slot shows no copy of its own.
 *
 * A `*molLazy` child is stamped here from its template: a live instance per place, created with
 * this copy and destroyed with it or when the child leaves the slot, as each of React's is. Any
 * other child is copied as DOM (`cloneNode`), which has no listeners and no components, so
 * content with either is written with `*molLazy` (`MolLazy`). A child that stays in the
 * slot keeps its copy here when other children come and go.
 *
 * ```html
 * @for (node of nodes(); track node.id) {
 *   <div><ng-container [molSlotCopy]="children()" /></div>
 * }
 * ```
 */
@Directive({ selector: '[molSlotCopy]', standalone: true })
export class MolSlotCopy implements OnDestroy {
  /** The slot's children to render here, in order. */
  @Input({ required: true }) molSlotCopy: readonly Node[] = []

  /** Where the stamped instances go. */
  private readonly views = inject(ViewContainerRef)
  /** The directive's own place: the copies sit right before it. */
  private readonly anchor = inject(ElementRef).nativeElement as Comment
  /** The copies, in render order. */
  private copies: Copy[] = []
  /** The children the copies were last rendered from. */
  private rendered: readonly Node[] = []

  constructor() {
    // In the same phase as `MolLazy`, after it: a slot's own lazy children are stamped first,
    // in the order React mounts them (the original before its copies).
    afterEveryRender({ mixedReadWrite: () => this.render() })
  }

  /** Destroys every instance it stamped. */
  ngOnDestroy(): void {
    for (const copy of this.copies) this.destroy(copy)
    this.copies = []
  }

  /** Renders the children it is given, keeping the copy of each child it already shows. */
  private render(): void {
    // `SlotReader.nodes` returns the same array while the children are the same.
    if (this.molSlotCopy === this.rendered) return
    this.rendered = this.molSlotCopy
    const kept = new Map(this.copies.map((copy) => [copy.source, copy]))
    const next = this.molSlotCopy.map((source) => {
      const copy = kept.get(source)
      if (copy === undefined) return this.create(source)
      kept.delete(source)
      return copy
    })
    for (const gone of kept.values()) this.destroy(gone)
    // The stamped instances in their order, so Angular inserts each next to the right neighbour.
    let index = 0
    for (const copy of next) if (copy.view !== null) this.views.move(copy.view, index++)
    // Then every copy, back to front, right before the one that follows it.
    let ref: ChildNode = this.anchor
    for (const copy of [...next].reverse()) {
      const nodes = nodesOf(copy) as ChildNode[]
      const first = nodes[0]
      if (first === undefined) continue
      if (nodes[nodes.length - 1]?.nextSibling !== ref) ref.before(...nodes)
      ref = first
    }
    this.copies = next
  }

  /**
   * Renders one child here.
   *
   * @param source - The slot's child.
   * @returns Its copy.
   */
  private create(source: Node): Copy {
    const template = lazySlotTemplate(source)
    if (template === undefined) return { source, view: null, node: source.cloneNode(true) }
    const view = this.views.createEmbeddedView(template)
    view.detectChanges()
    return { source, view, node: null }
  }

  /**
   * Takes one copy out of the page, destroying its instance.
   *
   * @param copy - The copy.
   */
  private destroy(copy: Copy): void {
    if (copy.view !== null) copy.view.destroy()
    else (copy.node as ChildNode).remove()
  }
}
