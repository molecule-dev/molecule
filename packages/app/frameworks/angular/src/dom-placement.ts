/**
 * DOM placement for the Angular ports.
 *
 * One owner for every case where a port's DOM must differ from where Angular
 * put a node:
 *
 * - an element that is absent while React would render nothing
 *   ({@link setElementPresent}, {@link useHostPresence});
 * - an element rendered in another parent, React's `createPortal`
 *   ({@link placeElement});
 * - a slot's content rendered in another parent ({@link placeContent});
 * - one wrapper element per projected child, React's
 *   `children.map((c) => <div>{c}</div>)` ({@link WrappedChildren},
 *   {@link MolWrapEachChild}).
 *
 * Angular keeps inserting, moving and removing the nodes it created, and it
 * finds their place through the nodes themselves: it inserts a view before the
 * first node of the next view, under the parent of the container's anchor
 * comment. A node a component moved elsewhere breaks that (NG05106). So the
 * placement rules are applied where Angular places nodes, in its renderer
 * ({@link provideDomPlacement}); components never move a node themselves.
 *
 * @module
 */

import {
  afterEveryRender,
  ChangeDetectorRef,
  DestroyRef,
  Directive,
  effect,
  ElementRef,
  type EnvironmentProviders,
  inject,
  Injectable,
  InjectionToken,
  makeEnvironmentProviders,
  provideEnvironmentInitializer,
  type Renderer2,
  RendererFactory2,
  type Signal,
  signal,
} from '@angular/core'

/** Set once {@link provideDomPlacement} decorated the application's renderer factory. */
const DOM_PLACEMENT = new InjectionToken<true>('@molecule/app-angular DOM placement')

/** The renderer factories already decorated (a wrapper of a wrapper would wrap each child twice). */
const decorated = new WeakSet<RendererFactory2>()

/** An absent element → the empty comment that holds its place. */
const placeholders = new WeakMap<Node, Comment>()
/** An absent host element → the check that restores it once its component renders again. */
const absentHosts = new WeakMap<Node, () => void>()
/** An element whose children are each wrapped → its wrapper bookkeeping. */
const wrappingParents = new WeakMap<Node, WrappedChildren>()
/** A wrapper element → the bookkeeping that created it. */
const wrapperOwners = new WeakMap<Node, WrappedChildren>()
/**
 * Elements {@link placeElement} rendered in another parent. Angular removes only
 * a view's root nodes, so an element moved out of a component goes when its
 * placeholder's view goes (React unmounts a portal with its owner).
 */
const elsewhere = new Set<Node>()

/**
 * Whether Angular's node is one React child: an element, or a text node that
 * is not template indentation. Angular creates an interpolated text node empty
 * and fills it in the same pass, so an empty text node is a child; comments are
 * Angular's own block anchors.
 *
 * @param node - The node Angular is placing.
 * @returns Whether the node gets its own wrapper.
 */
function isChild(node: Node): boolean {
  if (node.nodeType === 1) return true
  if (node.nodeType !== 3) return false
  const text = (node as Text).data
  return text.length === 0 || text.trim() !== ''
}

/**
 * The node that holds `ref`'s place among `parent`'s children: `ref` itself,
 * the placeholder of an absent element, or the wrapper around a wrapped child.
 *
 * @param ref - The node Angular wants to insert before.
 * @param parent - The parent Angular is inserting into.
 * @returns The child of `parent` to insert before.
 */
function placeOf(ref: Node, parent: Node): Node {
  let node: Node = placeholders.get(ref) ?? ref
  while (node.parentNode !== null && node.parentNode !== parent) {
    if (!wrapperOwners.has(node.parentNode)) break
    node = node.parentNode
  }
  return node
}

/**
 * Forgets an absent element's placeholder: Angular is removing or re-placing
 * the element, so the old place is no longer its place.
 *
 * @param node - The node Angular is removing or inserting.
 */
function dropPlaceholder(node: Node): void {
  const placeholder = placeholders.get(node)
  if (placeholder === undefined) return
  placeholders.delete(node)
  elsewhere.delete(node)
  const wrapper = placeholder.parentNode
  placeholder.remove()
  dropEmptyWrapper(wrapper)
}

/**
 * Removes a wrapper whose child Angular removed (React renders one wrapper per
 * child).
 *
 * @param node - The removed node's former parent.
 */
function dropEmptyWrapper(node: Node | null): void {
  if (node === null || node.hasChildNodes()) return
  const owner = wrapperOwners.get(node)
  if (owner === undefined) return
  ;(node as ChildNode).remove()
  owner.refresh()
}

/**
 * Removes every element rendered elsewhere whose place was inside a subtree
 * Angular just removed.
 *
 * @param removed - The node Angular removed.
 */
function dropElsewhereInside(removed: Node): void {
  for (const element of elsewhere) {
    const placeholder = placeholders.get(element)
    if (placeholder === undefined) {
      elsewhere.delete(element)
      continue
    }
    if (!removed.contains(placeholder)) continue
    elsewhere.delete(element)
    placeholders.delete(element)
    ;(element as ChildNode).remove()
  }
}

/**
 * Restores an absent host as soon as Angular renders a node into it, so the
 * component's new content is created inside the document (its children's
 * `ngAfterViewInit` can focus and measure, as a React effect can).
 *
 * @param parent - The parent Angular just inserted into.
 */
function restoreAbsentHostOf(parent: Node): void {
  if (parent.isConnected) return
  absentHosts.get(parent.getRootNode())?.()
}

/**
 * Wraps one of Angular's renderers so the placement rules apply to every node
 * it inserts or removes. Everything else is the wrapped renderer's.
 *
 * @param renderer - The application's renderer.
 * @returns The renderer Angular uses instead.
 */
function withPlacement(renderer: Renderer2): Renderer2 {
  const placed = Object.create(renderer) as Renderer2
  const insert = (parent: Node, child: Node, ref: Node | null, isMove?: boolean): void => {
    // Angular injects a container's anchor through a host that is not in the
    // DOM yet (a component created inside a view before it is inserted), and
    // its own renderer ignores a null parent. Forward that call unchanged:
    // `appendChild` would throw, while `insertBefore` does nothing.
    if (parent === null) {
      ;(renderer.insertBefore as (...args: unknown[]) => void)(parent, child, ref, isMove)
      return
    }
    dropPlaceholder(child)
    const from = child.parentNode
    const before = ref === null ? null : placeOf(ref, parent)
    const owner = wrappingParents.get(parent)
    let node = child
    if (owner !== undefined && isChild(child)) {
      node = owner.createWrapper()
      node.appendChild(child)
    }
    if (before === null) renderer.appendChild(parent, node)
    else renderer.insertBefore(parent, node, before, isMove)
    if (from !== parent) dropEmptyWrapper(from)
    owner?.refresh()
    restoreAbsentHostOf(parent)
  }
  placed.appendChild = (parent: Node, child: Node): void => insert(parent, child, null)
  placed.insertBefore = (parent: Node, child: Node, ref: Node | null, isMove?: boolean): void =>
    insert(parent, child, ref ?? null, isMove)
  placed.removeChild = (parent: Node | null, child: Node, ...rest: unknown[]): void => {
    dropPlaceholder(child)
    const from = child.parentNode
    ;(renderer.removeChild as (...args: unknown[]) => void)(parent, child, ...rest)
    dropEmptyWrapper(from)
    if (elsewhere.size > 0) dropElsewhereInside(child)
  }
  return placed
}

/**
 * Installs the placement rules in the application's renderer. `provideMolecule`
 * includes it; a test that mounts a port without `provideMolecule` adds it to
 * the application's providers. It wraps whatever renderer factory the
 * application configured, so it also applies under an animation renderer.
 *
 * @returns The environment providers.
 */
export function provideDomPlacement(): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: DOM_PLACEMENT, useValue: true },
    provideEnvironmentInitializer(() => {
      const factory = inject(RendererFactory2)
      // provideMolecule() and a direct provideDomPlacement() together decorate it once.
      if (decorated.has(factory)) return
      decorated.add(factory)
      const create = factory.createRenderer.bind(factory)
      const placed = new WeakMap<Renderer2, Renderer2>()
      factory.createRenderer = (element, type) => {
        const renderer = create(element, type)
        let wrapped = placed.get(renderer)
        if (wrapped === undefined) placed.set(renderer, (wrapped = withPlacement(renderer)))
        return wrapped
      }
    }),
  ])
}

/**
 * Throws when the application has no {@link provideDomPlacement}: without it
 * Angular throws NG05106 the first time it inserts before a wrapped or absent
 * node, which depends on the data.
 *
 * @param user - The API the caller used, for the message.
 */
function assertDomPlacement(user: string): void {
  if (inject(DOM_PLACEMENT, { optional: true }) === null) {
    throw new Error(
      `${user} needs provideDomPlacement() from @molecule/app-angular in the application's providers ` +
        `(provideMolecule() includes it).`,
    )
  }
}

/**
 * Takes an element out of its parent while `present` is false and puts it back
 * in the same place once it is true: Angular's equivalent of React's
 * `{cond && <span>…</span>}` for an element the template must keep (one that
 * holds an `<ng-content>`). "Attached" means the element has a parent, not
 * that it is in the document, so it also works inside a host that is itself
 * absent. An element that was never taken out is left where Angular put it.
 * Angular may remove or move the element while it is absent; its placeholder
 * goes then.
 *
 * @param element - The element (nothing happens without one).
 * @param present - Whether React would render it now.
 */
export function setElementPresent(element: Node | null | undefined, present: boolean): void {
  if (!element) return
  const placeholder = placeholders.get(element)
  if (present) {
    if (placeholder === undefined) return
    placeholders.delete(element)
    elsewhere.delete(element)
    // A placeholder whose parent was removed meanwhile has nowhere to restore to.
    if (placeholder.parentNode !== null) placeholder.replaceWith(element as ChildNode)
  } else if (placeholder === undefined && element.parentNode !== null) {
    const comment = (element.ownerDocument as Document).createComment('')
    ;(element as ChildNode).replaceWith(comment)
    placeholders.set(element, comment)
  }
}

/**
 * Renders an element in another parent while it keeps its place in Angular's
 * view: Angular's equivalent of React's `createPortal(child, document.body)`.
 * An empty comment holds the element's place, so Angular can still insert
 * before it and remove it. `null` puts it back where Angular put it. Calling it
 * again with the same target moves nothing. If Angular moves the element while
 * it is elsewhere, the element follows Angular and the next call moves it
 * again. When Angular removes the view that holds its place, the element is
 * removed from the other parent too, as React unmounts a portal.
 *
 * @param element - The element (nothing happens without one).
 * @param target - The parent to render it in, or `null` for its own place.
 */
export function placeElement(element: Node | null | undefined, target: Node | null): void {
  if (!element) return
  if (target === null) {
    setElementPresent(element, true)
    return
  }
  if (!placeholders.has(element) && element.parentNode !== null) {
    const comment = (element.ownerDocument as Document).createComment('')
    ;(element as ChildNode).replaceWith(comment)
    placeholders.set(element, comment)
  }
  elsewhere.add(element)
  if (element.parentNode !== target) target.appendChild(element)
}

/** A capture element → the comments that bracket its content wherever it is. */
const contentRanges = new WeakMap<Node, { start: Comment; end: Comment }>()

/**
 * Renders a capture element's content somewhere else: Angular's equivalent of
 * React placing the same `{slot}` in a different parent depending on props
 * (`loading ? <span>{label}</span> : label`). The capture element is the
 * template element that holds the `<ng-content>`.
 *
 * The whole content moves as one run, Angular's block anchors included, so the
 * consumer's `@for` and `@if` keep working at the new place: Angular inserts a
 * view under the parent of its anchor, before a node of the same run. Never
 * move a filtered or remembered list of nodes instead; the anchors or the
 * nodes Angular adds later stay behind (NG05106). Calling it again with the
 * same target moves nothing.
 *
 * @param capture - The element Angular projected the content into.
 * @param target - The parent to render the content in, or `null` to put it
 *   back inside `capture`.
 * @param before - The child of `target` to place the content before (default:
 *   at the end).
 */
export function placeContent(
  capture: Element | null | undefined,
  target: Node | null,
  before: Node | null = null,
): void {
  if (!capture) return
  let range = contentRanges.get(capture)
  if (range === undefined) {
    if (target === null) return
    const document = capture.ownerDocument
    range = { start: document.createComment(''), end: document.createComment('') }
    capture.prepend(range.start)
    capture.append(range.end)
    contentRanges.set(capture, range)
  }
  const parent = target ?? capture
  if (range.start.parentNode === parent) return
  const run: Node[] = []
  for (let node: Node | null = range.start; node !== null; node = node.nextSibling) {
    run.push(node)
    if (node === range.end) break
  }
  const ref = target === null ? null : before
  for (const node of run) parent.insertBefore(node, ref)
}

/**
 * Whether a slot renders anything, React's `{slot && …}` for projected
 * content: an element, or text that is not template indentation. It reads the
 * content wherever {@link placeContent} rendered it, so a component that moved
 * its slot elsewhere still sees it. Comments (Angular's anchors) are not
 * content.
 *
 * @param capture - The element Angular projected the content into.
 * @returns Whether the slot has content.
 */
export function hasContent(capture: Node | null | undefined): boolean {
  if (!capture) return false
  const range = contentRanges.get(capture)
  const nodes: Node[] = []
  if (range === undefined || range.start.parentNode === capture) {
    nodes.push(...Array.from(capture.childNodes))
  } else {
    for (let node = range.start.nextSibling; node !== null && node !== range.end;) {
      nodes.push(node)
      node = node.nextSibling
    }
  }
  return nodes.some(
    (node) =>
      node.nodeType === 1 || (node.nodeType === 3 && (node.textContent ?? '').trim() !== ''),
  )
}

/**
 * Keeps the calling component's host element out of the DOM while
 * `isPresent()` is false: Angular's equivalent of a React component that
 * returns `null`. Call it in the component's injection context.
 *
 * The host is put back before the component's own view refreshes whenever that
 * is knowable: when a signal `isPresent` reads changed (an effect, which
 * Angular runs before the view), and when Angular renders the first node into
 * the absent host (so an `@if` branch that turns on with a plain input is
 * built inside the document). Every render ends with the same check, which
 * covers a predicate that reads what the render produced; a host restored
 * there gets one more check with its content in the page.
 *
 * @param isPresent - Whether the component renders anything now. It may read
 *   inputs, plain fields or signals.
 */
export function useHostPresence(isPresent: () => boolean): void {
  assertDomPlacement('useHostPresence')
  const host = inject(ElementRef<HTMLElement>).nativeElement as HTMLElement
  const sync = (): void => {
    const present = isPresent()
    if (present) {
      absentHosts.delete(host)
      setElementPresent(host, true)
    } else if (host.parentNode !== null) {
      // React removes the subtree and the focus with it.
      const active = host.ownerDocument.activeElement
      if (active instanceof HTMLElement && host.contains(active)) active.blur()
      setElementPresent(host, false)
      absentHosts.set(host, sync)
    }
  }
  effect(sync)
  const changeDetector = inject(ChangeDetectorRef)
  afterEveryRender({
    write: () => {
      const wasAbsent = placeholders.has(host)
      sync()
      // Restored only after the render (a plain-input predicate whose change rendered no new
      // node): the content was checked outside the page, so check it once more inside it.
      if (wasAbsent && !placeholders.has(host)) changeDetector.markForCheck()
    },
  })
  inject(DestroyRef).onDestroy(() => absentHosts.delete(host))
}

/**
 * The wrappers around a component's projected children: React's
 * `children.map((child) => <div>{child}</div>)`.
 *
 * The component lists it in `providers`, injects it, and puts
 * `molWrapEachChild` on the template element that holds `<ng-content>`.
 * Angular then places every projected child — at creation and whenever the
 * consumer's `@for` or `@if` adds one later, anywhere in the list — inside its
 * own wrapper, and a wrapper goes with its child. No node is moved after
 * Angular placed it. The component styles the wrappers from {@link wrappers}
 * (an effect), and reads React's `children.length` as `wrappers().length`.
 */
@Injectable()
export class WrappedChildren {
  private readonly state = signal<readonly HTMLElement[]>([])
  private parent: HTMLElement | null = null
  private create: (document: Document) => HTMLElement = (document) => document.createElement('div')

  /** The wrappers, in render order. */
  readonly wrappers: Signal<readonly HTMLElement[]> = this.state.asReadonly()

  constructor() {
    assertDomPlacement('WrappedChildren')
  }

  /**
   * Sets how a wrapper element is created (default: an empty `<div>`). Call it
   * in the constructor; attributes that depend on the child's index belong in
   * an effect over {@link wrappers}.
   *
   * @param create - Builds one wrapper element.
   */
  wrapWith(create: (document: Document) => HTMLElement): void {
    this.create = create
  }

  /**
   * Starts wrapping the children Angular places in `parent`.
   *
   * @param parent - The element that holds the projected content.
   * @internal
   */
  attach(parent: HTMLElement): void {
    if (this.parent !== null) {
      throw new Error('WrappedChildren: one component wraps the children of one element.')
    }
    this.parent = parent
    wrappingParents.set(parent, this)
  }

  /**
   * Creates one wrapper.
   *
   * @returns The wrapper element.
   * @internal
   */
  createWrapper(): HTMLElement {
    const wrapper = this.create((this.parent as HTMLElement).ownerDocument)
    wrapperOwners.set(wrapper, this)
    return wrapper
  }

  /**
   * Re-reads the wrappers after Angular added or removed a child.
   *
   * @internal
   */
  refresh(): void {
    if (this.parent === null) return
    const next: HTMLElement[] = []
    for (const child of Array.from(this.parent.children)) {
      if (wrapperOwners.get(child) !== this) continue
      // Angular's `animate.leave` removes a cancelled leaving element without the renderer.
      if (child.hasChildNodes()) next.push(child as HTMLElement)
      else child.remove()
    }
    const current = this.state()
    if (next.length === current.length && next.every((wrapper, i) => wrapper === current[i])) return
    this.state.set(next)
  }
}

/**
 * Marks the template element whose projected children are each wrapped:
 * `<div molWrapEachChild><ng-content /></div>`. See {@link WrappedChildren}.
 * The marker attribute is taken off the element, so the markup stays React's.
 */
@Directive({ selector: '[molWrapEachChild]', standalone: true })
export class MolWrapEachChild {
  constructor() {
    const parent = inject(ElementRef<HTMLElement>).nativeElement as HTMLElement
    parent.removeAttribute('molWrapEachChild')
    inject(WrappedChildren).attach(parent)
  }
}
