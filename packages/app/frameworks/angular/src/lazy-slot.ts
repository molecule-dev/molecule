/**
 * Slot content that exists only while its place is in the page, as React mounts a slot.
 *
 * Angular creates projected content with the consumer's view, so `<ng-content>` content exists
 * (its constructors, effects and fetches run) while the component that receives it shows none of
 * it: a closed dialog's footer, a collapsed drawer's body. React mounts a slot only where and
 * while it renders it, and mounts it again each time it shows again. {@link MolLazy} gives
 * projected content that lifetime with no change to the component that receives it.
 *
 * @module
 */

import {
  afterEveryRender,
  Directive,
  ElementRef,
  inject,
  TemplateRef,
  ViewContainerRef,
} from '@angular/core'

/** The anchor comment of each {@link MolLazy} slot, stamped or not → the slot's template. */
const lazyAnchors = new WeakMap<Node, TemplateRef<unknown>>()
/** The root nodes of the stamped content of {@link MolLazy} slots. */
const lazyContent = new WeakSet<Node>()
/** The anchor of each stamped {@link MolLazy} slot → the root nodes of its content. */
const stampedRoots = new WeakMap<Node, readonly Node[]>()

/**
 * Whether a node is the anchor of a {@link MolLazy} slot. A lazy slot is one child of the
 * component it is passed to, stamped or not (React's `children` holds the element either way):
 * a slot reader counts its anchor as content and as the child, so the wrapper that holds it is in
 * the page, and a component that hides a child takes the anchor out of the page, which destroys
 * the content.
 *
 * @param node - A node of a slot.
 * @returns Whether it is a lazy slot's anchor.
 */
export function isLazySlotAnchor(node: Node): boolean {
  return lazyAnchors.has(node)
}

/**
 * Whether a slot's child is an element, as React's `isValidElement(child)` tells an element from
 * text: an element, or a {@link MolLazy} slot, which stands for the element it stamps whether or
 * not it is stamped yet. Use it to pick a slot's elements out of `SlotReader.nodes`; a component
 * that then moves the child (`placeElement`) moves the lazy slot, which stamps its content in the
 * new place.
 *
 * @param node - A child of a slot (`SlotReader.nodes`).
 * @returns Whether it is an element child.
 */
export function isElementChild(node: Node): boolean {
  return node.nodeType === 1 || lazyAnchors.has(node)
}

/**
 * The element a slot's child is, for a component that works the child itself (React's
 * `cloneElement(child, …)`: a trigger that gets the listeners and `aria-*`, an anchor a popup is
 * positioned against): the child when it is an element, the element a {@link MolLazy} child stamped
 * once it is stamped, else `null`. A lazy child is stamped after the placement that put it in the
 * page, and stamping it runs that placement again, which then finds the element; decide the
 * layout from {@link isElementChild} meanwhile, so the child is not given a wrapper it then leaves.
 *
 * @param node - A child of a slot (`SlotReader.nodes`).
 * @returns The element, or `null`.
 */
export function slotElement(node: Node): Element | null {
  if (node.nodeType === 1) return node as Element
  const roots = stampedRoots.get(node)
  return roots?.length === 1 && roots[0]?.nodeType === 1 ? (roots[0] as Element) : null
}

/**
 * The template of a {@link MolLazy} slot, which a component that renders a slot's children in more
 * than one place stamps in each of them (`MolSlotCopy` does this): each copy is then a live
 * instance, as each of React's is. Plain projected content exists once in Angular; a copy of it
 * (`cloneNode`) has no listeners or components.
 *
 * @param node - A child of a slot (`SlotReader.nodes`).
 * @returns The lazy slot's template, or `undefined` when the node is not a lazy slot's anchor.
 */
export function lazySlotTemplate(node: Node): TemplateRef<unknown> | undefined {
  return lazyAnchors.get(node)
}

/**
 * Whether a node is a root node of a {@link MolLazy} slot's stamped content: part of the child
 * its anchor stands for ({@link isLazySlotAnchor}), not a child of its own.
 *
 * @param node - A node of a slot.
 * @returns Whether it is stamped lazy content.
 */
export function isLazySlotContent(node: Node): boolean {
  return lazyContent.has(node)
}

/**
 * Stamps projected content in its own place, and keeps it exactly while that place is in the
 * page: created when the component that received it shows it, destroyed when the component
 * hides it, created again when it shows it again, as React mounts a slot. A place that moves to
 * another parent (a sidebar rendered on the other side) is a new place: React never moves a
 * mounted node to another parent, so the content is created again there. Write it as `*molLazy`
 * on the slot's element, or as `molLazy` on an `<ng-template>` (with `ngProjectAs` for a named
 * slot):
 *
 * ```html
 * <mol-modal [open]="open" (close)="open = false">
 *   <form *molLazy>…</form>
 *   <div slot="footer" *molLazy><button molButton>Save</button></div>
 *   <ng-template molLazy ngProjectAs="[slot=footer]">…</ng-template>
 * </mol-modal>
 * ```
 *
 * Plain projected content is created with the consumer's view and kept for its whole life,
 * which is right for static content (a closed dialog's footer buttons). Use `*molLazy` for
 * content with state, effects or a fetch, which must not run while hidden and must start fresh
 * each time it shows. It works on every component that hides a slot by taking its place out of
 * the page, through `@if` or the `@molecule/app-angular` DOM placement, and on content that a
 * wrapper component projects on.
 *
 * The decision runs after every render, once every component has placed its slots: a component
 * that attaches or detaches a region does it in a render's `write` phase or earlier, and this
 * directive reads the result in the `mixedReadWrite` phase of the same render. It does not run on
 * the server, where a lazy slot renders nothing.
 */
@Directive({ selector: '[molLazy]', standalone: true })
export class MolLazy {
  constructor() {
    const template = inject(TemplateRef, { optional: true })
    if (template === null) {
      throw new Error('molLazy goes on an <ng-template>, or as *molLazy on an element.')
    }
    const views = inject(ViewContainerRef)
    const anchor = inject(ElementRef).nativeElement as Comment
    lazyAnchors.set(anchor, template)
    /** The parent the content was stamped in. */
    let stampedIn: Node | null = null
    afterEveryRender({
      // After every component's placement (`write`), so a closed dialog's footer is already out
      // of the page; outside change detection, so no view is edited while Angular walks it.
      mixedReadWrite: () => {
        const shown = anchor.isConnected
        if (views.length > 0 && (!shown || anchor.parentNode !== stampedIn)) {
          stampedRoots.delete(anchor)
          views.clear()
        }
        if (shown && views.length === 0) {
          stampedIn = anchor.parentNode
          const view = views.createEmbeddedView(template)
          for (const node of view.rootNodes as Node[]) lazyContent.add(node)
          stampedRoots.set(anchor, view.rootNodes as Node[])
          view.detectChanges()
        }
      },
    })
  }
}
