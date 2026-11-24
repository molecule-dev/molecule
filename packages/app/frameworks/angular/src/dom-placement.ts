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
 * - an element or a slot's content rendered beside the component's host,
 *   React's fragment root ({@link placeElementBefore},
 *   {@link placeContentBefore});
 * - a slot's content rendered in another parent ({@link placeContent});
 * - one wrapper element per projected child, React's
 *   `children.map((c) => <div>{c}</div>)` ({@link WrappedChildren},
 *   {@link MolWrapEachChild}).
 *
 * A node that was placed still has one parent in the rendered tree, the one
 * React context follows ({@link renderedParent}), and what a consumer binds on
 * the tag of a component whose host left the page lands on the component's
 * root ({@link setHostRoot}).
 *
 * Angular keeps inserting, moving and removing the nodes it created, and it
 * finds their place through the nodes themselves: it inserts a view before the
 * first node of the next view, under the parent of the container's anchor
 * comment. A node a component moved elsewhere breaks that (NG05106). So the
 * placement rules are applied where Angular places nodes, in its renderer
 * ({@link provideDomPlacement}); components never move a node themselves.
 *
 * A host or a capture that is out of the page has no `parentNode`, so a
 * component never reads one to decide where something goes: it names the
 * element to stand in front of ({@link placeElementBefore},
 * {@link placeContentBefore}), which follows that element wherever it is, and
 * finds its rendered ancestors with {@link renderedParent}.
 *
 * @module
 */

import {
  afterEveryRender,
  type AfterViewInit,
  ChangeDetectorRef,
  DestroyRef,
  Directive,
  type DoCheck,
  effect,
  ElementRef,
  type EnvironmentProviders,
  inject,
  Injectable,
  InjectionToken,
  isDevMode,
  makeEnvironmentProviders,
  provideEnvironmentInitializer,
  reflectComponentType,
  type Renderer2,
  RendererFactory2,
  type Signal,
  signal,
  type Type,
  untracked,
} from '@angular/core'

import { isLazySlotAnchor, isLazySlotContent } from './lazy-slot.js'

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
const elsewhere = new WeakSet<Node>()
/** Something rendered in front of a node: an element, or a capture's whole content. */
interface Leader {
  /** The element, or the capture whose content it is. */
  node: Node
  /** Whether it is the capture's content ({@link placeContentBefore}). */
  content: boolean
}
/**
 * A node → what {@link placeElementBefore} and {@link placeContentBefore}
 * rendered in front of it, in render order. It stands in front of the node
 * wherever Angular puts the node.
 */
const leaders = new WeakMap<Node, Leader[]>()
/** An element rendered in front of another node → that node. */
const led = new WeakMap<Node, Node>()
/** A capture whose content is rendered in front of another node → that node. */
const ledContent = new WeakMap<Node, Node>()
/** A placeholder → the absent element whose place it holds. */
const heldPlaces = new WeakMap<Node, Node>()
/**
 * Set once anything was rendered outside its place ({@link placeElement},
 * {@link placeContent}); until then a removal has nothing to take along.
 */
let rendersElsewhere = false

/** A native listener the consumer bound on a component's tag. */
interface TagListener {
  /** The event name as written (`keydown.enter`). */
  name: string
  /** The consumer's handler. */
  callback: (event: unknown) => boolean | void
  /** The listener options Angular passed. */
  options: unknown
  /** The root it is attached to → what detaches it. */
  attached: Map<Element, () => void>
}
/** What a consumer bound on the tag of a component that places its own DOM. */
interface TagBindings {
  /** The application's renderer, undecorated. */
  renderer: Renderer2 | null
  /** The consumer's native listeners. */
  listeners: Set<TagListener>
  /** The root the component named ({@link setHostRoot}); `undefined` when it named none. */
  named: Element | null | undefined
  /** Attribute names the component reads off its host itself. */
  except: ReadonlySet<string>
  /** The root that carries the tag's attributes, classes and styles now. */
  target: Element | null
  /** What was written on that root, to take off when the root changes. */
  attributes: Map<string, string>
  /** The class names written on that root. */
  classes: Set<string>
  /** The style properties written on that root. */
  styles: Map<string, string>
  /** The tag's selector, for messages. */
  tag: string
  /** Reads the component's input names, lower-cased: a static attribute that is an input is not a DOM attribute of React's. */
  inputs: () => ReadonlySet<string>
  /** Reads the component's output names: `(change)` on the tag of a component with a `change` output means the output. */
  outputs: () => ReadonlySet<string>
}
/** A host whose component calls {@link usePlacement} → what the consumer bound on its tag. */
const tagBindings = new WeakMap<Node, TagBindings>()

/** Attributes that are Angular's own, never the consumer's. */
const isFrameworkAttribute = (name: string): boolean =>
  name.startsWith('_ng') || name.startsWith('ng-') || name === 'ngskiphydration'

/**
 * The input and output names of the component a view belongs to; the input
 * names lower-cased, as the DOM writes attribute names.
 *
 * @param view - The component's own change detector, whose context is the
 *   component instance once Angular created it.
 * @returns The names.
 */
function memberNames(view: ChangeDetectorRef | null): {
  inputs: ReadonlySet<string>
  outputs: ReadonlySet<string>
} {
  const component = (view as { context?: object | null } | null)?.context
  const mirror = component ? reflectComponentType(component.constructor as Type<unknown>) : null
  return {
    inputs: new Set((mirror?.inputs ?? []).map((input) => input.templateName.toLowerCase())),
    outputs: new Set((mirror?.outputs ?? []).map((output) => output.templateName)),
  }
}

/**
 * Whether an element is out of the page with its place held: a host whose
 * component rendered its DOM in the host's place.
 *
 * @param element - The host.
 * @returns Whether it is absent.
 */
const isAbsent = (element: Node): boolean => placeholders.has(element) && !elsewhere.has(element)

/**
 * The elements a host renders in its own place: the elements placed in front
 * of it and the top-level elements of the content placed in front of it.
 *
 * @param host - The host.
 * @returns The elements, in order.
 */
function ledElements(host: Node): Element[] {
  const elements: Element[] = []
  for (const leader of leaders.get(host) ?? []) {
    if (!leader.content) {
      if (leader.node.nodeType === 1) elements.push(leader.node as Element)
      continue
    }
    const range = contentRanges.get(leader.node)
    if (range === undefined) continue
    for (
      let node = range.start.nextSibling;
      node !== null && node !== range.end;
      node = node.nextSibling
    ) {
      if (node.nodeType === 1) elements.push(node as Element)
    }
  }
  return elements
}

/**
 * Takes what was written for a tag off the root that carried it and puts it
 * back on the host, where the next root finds it.
 *
 * @param host - The host.
 * @param bindings - Its bindings.
 */
function returnTagAttributes(host: Element, bindings: TagBindings): void {
  const target = bindings.target
  if (target === null) return
  for (const [name, value] of bindings.attributes) {
    target.removeAttribute(name)
    host.setAttribute(name, value)
  }
  for (const name of bindings.classes) {
    target.classList.remove(name)
    host.classList.add(name)
  }
  for (const [name, value] of bindings.styles) {
    ;(target as HTMLElement).style.removeProperty(name)
    ;(host as HTMLElement).style.setProperty(name, value)
  }
  bindings.attributes.clear()
  bindings.classes.clear()
  bindings.styles.clear()
  bindings.target = null
}

/**
 * Moves everything the consumer wrote on the host onto the root that stands
 * for it.
 *
 * @param host - The host.
 * @param bindings - Its bindings, with `target` set.
 */
function moveTagAttributes(host: Element, bindings: TagBindings): void {
  const target = bindings.target as HTMLElement
  for (const attribute of Array.from(host.attributes)) {
    const name = attribute.name
    if (isFrameworkAttribute(name) || bindings.except.has(name) || bindings.inputs().has(name))
      continue
    if (name === 'class') {
      for (const token of Array.from(host.classList)) {
        target.classList.add(token)
        bindings.classes.add(token)
      }
    } else if (name === 'style') {
      const style = (host as HTMLElement).style
      for (const property of Array.from(style)) {
        const value = style.getPropertyValue(property)
        target.style.setProperty(property, value, style.getPropertyPriority(property))
        bindings.styles.set(property, value)
      }
    } else {
      target.setAttribute(name, attribute.value)
      bindings.attributes.set(name, attribute.value)
    }
    host.removeAttribute(name)
  }
}

/**
 * Applies what the consumer bound on a component's tag to the DOM the
 * component rendered in its host's place; see {@link setHostRoot}.
 *
 * @param host - The host.
 * @param settled - Whether the render is complete (the moment to refuse a
 *   binding that has nowhere to land).
 */
function syncTagBindings(host: Element, settled: boolean): void {
  const bindings = tagBindings.get(host)
  if (bindings === undefined) return
  // Nothing bound on the tag (the usual case): nothing to read.
  if (bindings.listeners.size === 0 && bindings.target === null && !host.hasAttributes()) return
  const absent = isAbsent(host)
  const named = bindings.named
  const first = leaders.get(host)
  // Listeners: the named root, else every element in the host's place (the
  // events that bubbled to the host while it enclosed them).
  const roots = !absent
    ? []
    : named !== undefined
      ? named === null
        ? []
        : [named]
      : bindings.listeners.size > 0
        ? ledElements(host)
        : []
  for (const listener of bindings.listeners) {
    // Angular also listens natively for a name that is one of the component's outputs; the consumer means the output.
    if (bindings.outputs().has(listener.name)) continue
    for (const [root, detach] of listener.attached) {
      if (roots.includes(root)) continue
      detach()
      listener.attached.delete(root)
    }
    if (bindings.renderer === null) continue
    for (const root of roots) {
      if (listener.attached.has(root)) continue
      const listen = bindings.renderer.listen as (...args: unknown[]) => () => void
      listener.attached.set(
        root,
        listen.call(bindings.renderer, root, listener.name, listener.callback, listener.options),
      )
    }
  }
  // Attributes, classes and styles: the named root, else the component's one element.
  const single =
    first?.length === 1 && !first[0].content && first[0].node.nodeType === 1
      ? (first[0].node as Element)
      : null
  const target = !absent ? null : named !== undefined ? named : single
  if (target !== bindings.target) {
    returnTagAttributes(host, bindings)
    bindings.target = target
  }
  if (target !== null) moveTagAttributes(host, bindings)
  if (!settled || !absent || !isDevMode()) return
  const nowhere = named === undefined && (first?.length ?? 0) === 0
  const unheard = Array.from(bindings.listeners).filter(
    (listener) => !bindings.outputs().has(listener.name),
  )
  if (nowhere && unheard.length > 0) {
    const names = unheard.map((listener) => `(${listener.name})`).join(', ')
    throw new Error(
      `${names} is bound on <${bindings.tag}>, which renders no element in its place, so it can never fire. ` +
        `Bind it on an element inside, or use the component's own outputs.`,
    )
  }
}

/**
 * Names the element that stands for the calling component's host: React's
 * `{...rest}` target. Call it in the component's {@link usePlacement}
 * function, for a component whose host is out of the page.
 *
 * An Angular consumer binds on the component's tag: `<mol-switch
 * (keydown)="…" class="…" data-testid="…" [attr.aria-label]="…">`. With the
 * host out of the page those would do nothing. Instead, while the host is
 * absent:
 *
 * - native listeners are attached to the root (`$event.currentTarget` is the
 *   root, as it is in React);
 * - attributes, class names and styles the consumer writes on the tag are
 *   written on the root, in the same instruction, and the ones already on the
 *   host are moved there.
 *
 * A component that calls nothing gets the common case for free: with one
 * element in its place (`placeElementBefore(root, host)`) that element is the
 * root; with several elements or projected content in its place, listeners go
 * to each of them (the events that used to bubble to the host) and attributes
 * stay on the host. A component with nothing in its place (a portal) names its
 * root, or a listener on its tag throws in dev mode: it could never fire.
 *
 * @param host - The component's host element.
 * @param root - The element that stands for it, or `null` while React renders
 *   none.
 * @param options - `except`: attribute names the component reads off its host
 *   itself (it merges them with its own), which stay on the host.
 * @param options.except - Those attribute names.
 */
export function setHostRoot(
  host: Element,
  root: Element | null | undefined,
  options: { except?: readonly string[] } = {},
): void {
  const bindings = tagBindings.get(host)
  if (bindings === undefined) {
    throw new Error(
      'setHostRoot() is called in the usePlacement() function of the component whose host it is.',
    )
  }
  bindings.named = root ?? null
  if (options.except !== undefined) bindings.except = new Set(options.except)
}

/** One component's placement function and whether its component is gone. */
interface Placement {
  /** Runs the component's placement function, untracked. */
  run: () => void
  /** Set when the component is destroyed. */
  destroyed: boolean
}
/** The placement function that is running now. */
let running: Placement | null = null
/** A parent whose child list a placement function read → the functions to run again when Angular changes it. */
const contentReaders = new WeakMap<Node, Set<Placement>>()

/**
 * Records that the running placement function depends on `parent`'s children.
 *
 * @param parent - The capture, or the parent its content was moved to.
 */
function readBy(parent: Node | null): void {
  if (parent === null || running === null) return
  let readers = contentReaders.get(parent)
  if (readers === undefined) contentReaders.set(parent, (readers = new Set()))
  readers.add(running)
}

/**
 * Runs again every placement function that read `parent`'s children: Angular
 * just added, removed or changed one of them.
 *
 * @param parent - The parent Angular changed.
 */
function contentChanged(parent: Node | null): void {
  if (parent === null) return
  const readers = contentReaders.get(parent)
  if (readers === undefined) return
  for (const placement of Array.from(readers)) {
    if (placement.destroyed) readers.delete(placement)
    else placement.run()
  }
}

/**
 * Whether Angular's node is one React child: an element, or a text node that
 * is not template indentation. Angular creates an interpolated text node empty
 * and fills it in the same pass, so an empty text node is a child; comments are
 * Angular's own block anchors.
 *
 * Whitespace-only text is indentation, on one line too: Angular collapses a
 * template's line breaks around an interpolation into spaces in the same text
 * node (`\n  {{ x }}\n` renders `'  '` while `x` is empty), the
 * formatting JSX drops when it compiles. A consumer's deliberate `{{ ' ' }}`
 * renders the same DOM, so it reads as no content here, where React's
 * `slot(' ')` counts it; nothing in the page tells the two apart.
 *
 * @param node - The node Angular is placing.
 * @returns Whether the node gets its own wrapper.
 */
function isChild(node: Node): boolean {
  // A lazy slot is one child, stamped or not; its content is stamped inside the anchor's wrapper.
  if (node.nodeType === 1 || isLazySlotAnchor(node)) return true
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
  // What stands in front of `ref` is part of it: a node goes before all of it.
  const leader = leaders.get(ref)?.[0]
  if (leader !== undefined) {
    const first = leader.content ? contentRanges.get(leader.node)?.start : leader.node
    if (first !== undefined && first.parentNode === node.parentNode) node = first
  }
  while (node.parentNode !== null && node.parentNode !== parent) {
    if (!wrapperOwners.has(node.parentNode)) break
    node = node.parentNode
  }
  return node
}

/**
 * Forgets that an element, or a capture's content, stands in front of another
 * node: it is back in its own place, or Angular is placing it itself.
 *
 * @param node - The element, or the capture.
 * @param content - Whether it is the capture's content.
 */
function stopLeading(node: Node, content = false): void {
  const map = content ? ledContent : led
  const sibling = map.get(node)
  if (sibling === undefined) return
  map.delete(node)
  const rest = (leaders.get(sibling) ?? []).filter(
    (leader) => leader.node !== node || leader.content !== content,
  )
  if (rest.length > 0) leaders.set(sibling, rest)
  else leaders.delete(sibling)
}

/**
 * Puts what stands in front of `node` in front of it again: Angular just
 * inserted or moved `node` alone.
 *
 * @param node - The node Angular placed.
 */
function leadAgain(node: Node): void {
  const list = leaders.get(node)
  if (list === undefined) return
  // An absent node, or one rendered elsewhere, holds its place with its placeholder.
  const place = placeholders.get(node) ?? node
  const parent = place.parentNode
  if (parent === null) return
  let next: Node = place
  for (let i = list.length - 1; i >= 0; i--) {
    const leader = list[i]
    if (!leader.content) {
      if (leader.node.nextSibling !== next) parent.insertBefore(leader.node, next)
      next = leader.node
      continue
    }
    const range = contentRanges.get(leader.node)
    if (range === undefined) continue
    if (range.end.nextSibling !== next)
      for (const part of runOf(range)) parent.insertBefore(part, next)
    runParents.add(parent)
    next = range.start
  }
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
  stopLeading(node)
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
 * Puts everything whose place is inside a subtree Angular is removing back in
 * that place, so it leaves the page with the subtree (React unmounts a portal
 * and a slot with the element that rendered them) and is there again if
 * Angular re-inserts the subtree: an element {@link placeElement} rendered in
 * another parent goes back to its placeholder, a capture's content
 * {@link placeContent} moved goes back inside the capture. It walks the removed
 * nodes once and follows what it puts back, so nesting needs no order.
 *
 * @param node - The node Angular is removing, then each node below it.
 */
function takeAlong(node: Node): void {
  const range = contentRanges.get(node)
  if (range !== undefined && range.start.parentNode !== node) returnContent(node, range)
  const held = heldPlaces.get(node)
  if (held !== undefined) {
    if (elsewhere.has(held)) {
      elsewhere.delete(held)
      placeholders.delete(held)
      stopLeading(held)
      ;(node as ChildNode).replaceWith(held)
    }
    // An absent element is not below its placeholder; what it holds is.
    takeAlong(held)
    return
  }
  if (node.firstChild === null) return
  // A copy: putting something back moves nodes of this list.
  for (const child of Array.from(node.childNodes)) takeAlong(child)
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
    // A lazy slot's content goes right before its anchor, wherever a component placed the anchor
    // (placeElement): Angular names the slot's own parent, where the anchor no longer is.
    const lazyAnchor = ref !== null && isLazySlotAnchor(ref) && ref.parentNode !== null
    if (lazyAnchor) parent = ref.parentNode as Node
    const before = ref === null ? null : lazyAnchor ? ref : placeOf(ref, parent)
    const owner = wrappingParents.get(parent)
    let node = child
    if (owner !== undefined && isChild(child)) {
      node = owner.createWrapper()
      node.appendChild(child)
    }
    if (before === null) renderer.appendChild(parent, node)
    else renderer.insertBefore(parent, node, before, isMove)
    leadAgain(child)
    if (from !== parent) dropEmptyWrapper(from)
    owner?.refresh()
    restoreAbsentHostOf(parent)
    contentChanged(parent)
  }
  placed.appendChild = (parent: Node, child: Node): void => insert(parent, child, null)
  placed.insertBefore = (parent: Node, child: Node, ref: Node | null, isMove?: boolean): void =>
    insert(parent, child, ref ?? null, isMove)
  placed.removeChild = (parent: Node | null, child: Node, ...rest: unknown[]): void => {
    if (rendersElsewhere) takeAlong(child)
    dropPlaceholder(child)
    const from = child.parentNode
    ;(renderer.removeChild as (...args: unknown[]) => void)(parent, child, ...rest)
    dropEmptyWrapper(from)
    contentChanged(from)
  }
  placed.setValue = (node: Node, value: string): void => {
    renderer.setValue(node, value)
    contentChanged(node.parentNode)
  }
  // What the consumer binds on the tag of a component that places its own DOM
  // lands on the root that stands for the host (setHostRoot).
  placed.listen = ((
    target: unknown,
    name: string,
    callback: (event: unknown) => boolean | void,
    options?: unknown,
  ) => {
    const listen = renderer.listen as (...args: unknown[]) => () => void
    const off = listen.call(renderer, target, name, callback, options)
    const bindings =
      typeof target === 'object' && target !== null ? tagBindings.get(target as Node) : undefined
    if (bindings === undefined) return off
    const listener: TagListener = { name, callback, options, attached: new Map() }
    // The decorated renderer: a root that is itself such a host passes the listener on.
    bindings.renderer = placed
    bindings.listeners.add(listener)
    syncTagBindings(target as Element, false)
    return () => {
      off()
      bindings.listeners.delete(listener)
      for (const detach of listener.attached.values()) detach()
      listener.attached.clear()
    }
  }) as Renderer2['listen']
  const forwards = (el: Node, name: string): TagBindings | undefined => {
    const bindings = tagBindings.get(el)
    if (bindings === undefined || bindings.target === null) return undefined
    return isFrameworkAttribute(name) || bindings.except.has(name) ? undefined : bindings
  }
  placed.setAttribute = (
    el: Element,
    name: string,
    value: string,
    namespace?: string | null,
  ): void => {
    const bindings = namespace ? undefined : forwards(el, name)
    if (bindings === undefined || name === 'class' || name === 'style') {
      renderer.setAttribute(el, name, value, namespace)
      if (bindings !== undefined) moveTagAttributes(el, bindings)
      return
    }
    ;(bindings.target as Element).setAttribute(name, value)
    bindings.attributes.set(name, value)
  }
  placed.removeAttribute = (el: Element, name: string, namespace?: string | null): void => {
    const bindings = namespace ? undefined : forwards(el, name)
    if (bindings === undefined || !bindings.attributes.has(name)) {
      renderer.removeAttribute(el, name, namespace)
      return
    }
    ;(bindings.target as Element).removeAttribute(name)
    bindings.attributes.delete(name)
  }
  placed.addClass = (el: Element, name: string): void => {
    const bindings = forwards(el, 'class')
    if (bindings === undefined) {
      renderer.addClass(el, name)
      return
    }
    ;(bindings.target as Element).classList.add(name)
    bindings.classes.add(name)
  }
  placed.removeClass = (el: Element, name: string): void => {
    const bindings = forwards(el, 'class')
    if (bindings === undefined || !bindings.classes.has(name)) {
      renderer.removeClass(el, name)
      return
    }
    ;(bindings.target as Element).classList.remove(name)
    bindings.classes.delete(name)
  }
  placed.setStyle = ((el: HTMLElement, style: string, value: string, flags?: number): void => {
    const bindings = forwards(el, 'style')
    if (bindings === undefined) {
      ;(renderer.setStyle as (...args: unknown[]) => void)(el, style, value, flags)
      return
    }
    ;(renderer.setStyle as (...args: unknown[]) => void)(bindings.target, style, value, flags)
    bindings.styles.set(style, value)
  }) as Renderer2['setStyle']
  placed.removeStyle = ((el: HTMLElement, style: string, flags?: number): void => {
    const bindings = forwards(el, 'style')
    if (bindings === undefined || !bindings.styles.has(style)) {
      ;(renderer.removeStyle as (...args: unknown[]) => void)(el, style, flags)
      return
    }
    ;(renderer.removeStyle as (...args: unknown[]) => void)(bindings.target, style, flags)
    bindings.styles.delete(style)
  }) as Renderer2['removeStyle']
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
 * An element rendered elsewhere ({@link placeElement}, {@link placeElementBefore})
 * leaves that parent too, and `true` puts it back in its own place.
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
    stopLeading(element)
    // A placeholder whose parent was removed meanwhile has nowhere to restore to.
    if (placeholder.parentNode !== null) placeholder.replaceWith(element as ChildNode)
  } else if (placeholder !== undefined && elsewhere.has(element)) {
    // Rendered elsewhere (placeElement, placeElementBefore): it leaves that
    // parent, and the placeholder it already has keeps its own place.
    elsewhere.delete(element)
    stopLeading(element)
    ;(element as ChildNode).remove()
  } else if (placeholder === undefined && element.parentNode !== null) {
    const comment = (element.ownerDocument as Document).createComment('')
    ;(element as ChildNode).replaceWith(comment)
    placeholders.set(element, comment)
    heldPlaces.set(comment, element)
  }
}

/**
 * The element a placeholder stands in for while the element is out of its own
 * place ({@link setElementPresent}, {@link placeElement},
 * {@link placeElementBefore}). A slot's children ({@link SlotReader.nodes})
 * list such an element as its placeholder; a component that took one of its
 * slot's children out of the page finds that child again with this.
 *
 * @param node - A node of the rendered tree.
 * @returns The element whose place the node holds, or `undefined` when the
 *   node is not a current placeholder.
 */
export function heldElement(node: Node | null | undefined): Node | undefined {
  if (!node) return undefined
  const held = heldPlaces.get(node)
  return held !== undefined && placeholders.get(held) === node ? held : undefined
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
    heldPlaces.set(comment, element)
  }
  stopLeading(element)
  elsewhere.add(element)
  rendersElsewhere = true
  if (element.parentNode !== target) target.appendChild(element)
}

/**
 * Renders an element of the component's template immediately in front of
 * another node, as its sibling: Angular's equivalent of a React component whose
 * root is a fragment, `<><div>{children}</div>{portal}</>`, where the node is
 * the component's host (kept in the DOM with `display: contents`).
 *
 * The element then belongs to the node's place. Angular inserts a new sibling
 * before the element, not between the two; when Angular moves the node (a
 * consumer `@for` reorders), the element moves with it; when Angular removes
 * the node, the element goes back to its own place inside it and leaves the
 * page with it. Several elements placed before the same node stand in the
 * order they were placed. Calling it again moves nothing while the element
 * already stands there.
 *
 * "In front of the node" means in front of the node's place. A host that is
 * absent (`setElementPresent(host, false)`) holds its place with a comment, and
 * the element stands in front of that: this is how a fragment root renders
 * React's exact DOM, with no host element among the siblings at all. A node
 * another component rendered elsewhere ({@link placeElement}) is likewise
 * led at its place, not where it was rendered.
 *
 * Nothing happens while the node has no parent; call it
 * from the component's {@link usePlacement} function, which runs again.
 * `placeElement(element, null)` puts the element back in its own place.
 *
 * @param element - The element (nothing happens without one).
 * @param sibling - The node it stands in front of, usually the host.
 */
export function placeElementBefore(
  element: Node | null | undefined,
  sibling: Node | null | undefined,
): void {
  if (!element || !sibling || (placeholders.get(sibling) ?? sibling).parentNode === null) return
  if (led.get(element) !== sibling) {
    stopLeading(element)
    if (!placeholders.has(element) && element.parentNode !== null) {
      const comment = (element.ownerDocument as Document).createComment('')
      ;(element as ChildNode).replaceWith(comment)
      placeholders.set(element, comment)
      heldPlaces.set(comment, element)
    }
    elsewhere.add(element)
    rendersElsewhere = true
    led.set(element, sibling)
    leaders.set(sibling, [...(leaders.get(sibling) ?? []), { node: element, content: false }])
  }
  leadAgain(sibling)
}

/** A capture element → the comments that bracket its content wherever it is. */
const contentRanges = new WeakMap<Node, { start: Comment; end: Comment }>()
/** One of those comments → its capture. */
const rangeCaptures = new WeakMap<Node, Element>()
/**
 * The parents a capture's content was rendered in, outside the capture. Only
 * their children can belong to a run, so only they cost {@link renderedParent}
 * a look at the siblings. A parent the content left stays listed; it costs the
 * look and nothing else.
 */
const runParents = new WeakSet<Node>()

/**
 * A node's parent in the rendered tree: the parent React context follows.
 * It is the DOM parent, except where this module placed the node:
 *
 * - an element that is absent, or rendered in another parent
 *   ({@link setElementPresent}, {@link placeElement},
 *   {@link placeElementBefore}), belongs where its placeholder is, the place
 *   the template gave it. A portal's content therefore has the component that
 *   declared it as an ancestor, not `document.body`, as in React.
 * - a top-level node of a capture's content that renders outside the capture
 *   ({@link placeContent}, {@link placeContentBefore}) belongs to the capture.
 *   With `placeContentBefore(host, host)` that is the host: what a provider
 *   renders in its own place is the provider's child, and a sibling that merely
 *   shares the DOM parent is not.
 *
 * So a component looks its context up from its own host and registers one on
 * its own host, whether or not the host is in the page.
 *
 * @param node - The node.
 * @returns Its parent in the rendered tree, or `null` at the top (or for a
 *   node that has no place: never inserted, or removed).
 */
export function renderedParent(node: Node | null | undefined): Element | null {
  if (!node) return null
  const place = placeholders.get(node) ?? node
  const parent = place.parentNode
  if (parent === null) return null
  if (runParents.has(parent)) {
    for (let prev = place.previousSibling; prev !== null; prev = prev.previousSibling) {
      if (prev.nodeType !== 8) continue
      const capture = rangeCaptures.get(prev)
      if (capture === undefined) continue
      const range = contentRanges.get(capture) as { start: Comment; end: Comment }
      // Inside this run: its capture is the parent.
      if (prev === range.start) return capture
      // An earlier run ended here: none of it encloses the node.
      prev = range.start
    }
  }
  return parent.nodeType === 1 ? (parent as Element) : null
}
/**
 * Moves a capture's content from wherever it was rendered back inside the
 * capture: the place Angular put it, and where Angular takes it from when it
 * projects it again.
 *
 * @param capture - The element Angular projected the content into.
 * @param range - The comments that bracket the content.
 * @param range.start - The comment before the content.
 * @param range.end - The comment after the content.
 */
function returnContent(capture: Node, range: { start: Comment; end: Comment }): void {
  stopLeading(capture, true)
  for (const node of runOf(range)) capture.appendChild(node)
}

/**
 * A capture's content with the two comments that bracket it.
 *
 * @param range - The comments that bracket the content.
 * @param range.start - The comment before the content.
 * @param range.end - The comment after the content.
 * @returns The nodes, in order.
 */
function runOf(range: { start: Comment; end: Comment }): Node[] {
  const run: Node[] = []
  for (let node: Node | null = range.start; node !== null; node = node.nextSibling) {
    run.push(node)
    if (node === range.end) break
  }
  return run
}

/**
 * The comments that bracket a capture's content, created around the content
 * the first time.
 *
 * @param capture - The element Angular projected the content into.
 * @returns The two comments.
 */
function rangeOf(capture: Element): { start: Comment; end: Comment } {
  let range = contentRanges.get(capture)
  if (range === undefined) {
    const document = capture.ownerDocument
    range = { start: document.createComment(''), end: document.createComment('') }
    capture.prepend(range.start)
    capture.append(range.end)
    contentRanges.set(capture, range)
    rangeCaptures.set(range.start, capture)
    rangeCaptures.set(range.end, capture)
  }
  return range
}

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
 * same target moves nothing. When Angular removes the capture (its view went),
 * the content goes back inside it and leaves the page with it.
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
  if (target === null && !contentRanges.has(capture)) return
  const range = rangeOf(capture)
  if (target === null) {
    if (range.start.parentNode !== capture) returnContent(capture, range)
    return
  }
  // Rendered here from now on, wherever placeContentBefore had it follow a node.
  const followed = ledContent.has(capture)
  stopLeading(capture, true)
  if (range.start.parentNode === target && !followed) return
  // An absent element holds its place with its placeholder.
  const place = before === null ? null : (placeholders.get(before) ?? before)
  for (const node of runOf(range)) target.insertBefore(node, place)
  runParents.add(target)
  rendersElsewhere = true
  readBy(target)
}

/**
 * Renders a capture's content immediately in front of another node, as its
 * siblings, with no element around it: Angular's equivalent of a React
 * component whose root is a fragment of what it was given, `<>{children}</>`
 * (a provider or a gate that renders no DOM of its own). The node is usually
 * the component's host, and the capture may be the host itself:
 * `placeContentBefore(host, host)` renders everything the host holds in front
 * of it and leaves the host empty.
 *
 * The content then belongs to the node's place, as an element does with
 * {@link placeElementBefore}: Angular inserts a new sibling before the content,
 * the content moves with the node, and it goes back inside the capture when
 * Angular removes the node. Angular's block anchors move with the content, so
 * an `@if` in the component's own template around `<ng-content>` and the
 * consumer's blocks render at the new place from the first node on. Nothing
 * happens while the node has no parent; call it from the component's
 * {@link usePlacement} function. `placeContent(capture, null)` puts the
 * content back.
 *
 * @param capture - The element that holds the content (nothing happens
 *   without one).
 * @param sibling - The node the content stands in front of, usually the host.
 */
export function placeContentBefore(
  capture: Element | null | undefined,
  sibling: Node | null | undefined,
): void {
  if (!capture || !sibling || (placeholders.get(sibling) ?? sibling).parentNode === null) return
  rangeOf(capture)
  if (ledContent.get(capture) !== sibling) {
    stopLeading(capture, true)
    ledContent.set(capture, sibling)
    leaders.set(sibling, [...(leaders.get(sibling) ?? []), { node: capture, content: true }])
    rendersElsewhere = true
  }
  leadAgain(sibling)
}

/**
 * Whether a slot renders anything, React's `{slot && …}` for projected
 * content: an element, or text that is not template indentation. It reads the
 * content wherever {@link placeContent} rendered it, so a component that moved
 * its slot elsewhere still sees it. Comments (Angular's anchors) are not
 * content, except the anchor of a `*molLazy` slot ({@link isLazySlotAnchor}),
 * stamped or not: its wrapper must be in the page for it to be stamped.
 *
 * @param capture - The element Angular projected the content into.
 * @param ownLeadingNodes - How many of the capture's first child nodes the
 *   port's own template renders before the slot (its own text), which are not
 *   content.
 * @returns Whether the slot has content.
 */
function contentOf(capture: Node | null | undefined, ownLeadingNodes = 0): boolean {
  return childrenOf(capture, true, ownLeadingNodes).length > 0
}

/**
 * A slot's React children, wherever {@link placeContent} rendered them: its
 * elements and its text that is not template indentation, in order. A
 * projected component that renders nothing counts as the placeholder that
 * holds its place, and a `*molLazy` slot as its anchor comment, stamped or
 * not ({@link isLazySlotAnchor}).
 *
 * @param capture - The element Angular projected the content into.
 * @param firstOnly - Stop at the first child.
 * @param ownLeadingNodes - How many of the capture's first child nodes the
 *   port's own template renders before the slot, which are not children.
 * @returns The children.
 */
function childrenOf(
  capture: Node | null | undefined,
  firstOnly: boolean,
  ownLeadingNodes = 0,
): Node[] {
  const children: Node[] = []
  if (!capture) return children
  const range = contentRanges.get(capture)
  const moved = range !== undefined && range.start.parentNode !== capture
  readBy(capture)
  if (moved) readBy(range.start.parentNode)
  const end = moved ? range.end : null
  let node = moved ? range.start.nextSibling : capture.firstChild
  for (let skipped = 0; skipped < ownLeadingNodes && node !== null && node !== end; skipped += 1) {
    node = node.nextSibling
  }
  for (; node !== null && node !== end; node = node.nextSibling) {
    const isContent =
      node.nodeType === 1 ||
      (node.nodeType === 3 && (node as Text).data.trim() !== '') ||
      // A projected component that renders nothing is still a child React was given.
      heldPlaces.has(node) ||
      // A lazy slot is one child, its anchor, whether or not its content is stamped (React's
      // `children` holds the element either way); its stamped nodes are that child, not others.
      isLazySlotAnchor(node)
    if (!isContent || isLazySlotContent(node)) continue
    children.push(node)
    if (firstOnly) break
  }
  return children
}

/**
 * Reads a slot from a lifecycle hook, which can lag the content: a hook runs
 * before the consumer's `@if` adds its node, and no hook runs at all when the
 * content comes through an `OnPush` component in between. Read slots in the
 * function passed to {@link usePlacement} instead; this export goes in the
 * next major version.
 *
 * @param capture - The capture.
 * @returns Whether the slot has content.
 * @deprecated Use the reader {@link usePlacement} passes.
 */
export function hasContent(capture: Node | null | undefined): boolean {
  return contentOf(capture)
}

/**
 * Reads whether a slot renders anything; see {@link usePlacement}. A capture
 * that also holds the port's own text before the slot (`<span #c>{{ label
 * }}<ng-content /></span>`) passes how many leading child nodes are the
 * port's: one per interpolation or static text before the `<ng-content>`.
 *
 * @param capture - The element Angular projected the content into.
 * @param ownLeadingNodes - How many of the capture's first child nodes the
 *   port renders itself (default 0).
 * @returns Whether the slot has content.
 */
export interface SlotReader {
  (capture: Node | null | undefined, ownLeadingNodes?: number): boolean
  /**
   * The slot's React children (`React.Children.toArray(slot)`): its elements
   * and its text that is not template indentation, in order, wherever
   * {@link placeContent} rendered them. A `*molLazy` slot is one child, its
   * anchor comment, whether or not its content is stamped: hide that node to
   * hide the child, and its content is destroyed until it shows again.
   *
   * The same array comes back while the children are the same nodes, so it can be kept in a
   * signal (`children.set(hasContent.nodes(capture))`) and passed to a binding: the placement
   * function runs after every render, and a new array each time would render again forever.
   *
   * @param capture - The element Angular projected the content into.
   * @returns The children.
   */
  nodes(capture: Node | null | undefined): readonly Node[]
}

/**
 * Gives {@link usePlacement} the component's own moments. A component that
 * calls `usePlacement` lists it in `hostDirectives`; `usePlacement` throws
 * without it. Its hooks fire exactly when the component's own would: after the
 * component's view was first rendered (its view queries are set), and each
 * time the parent checks the component (its inputs are set).
 */
@Directive({ standalone: true })
export class MolPlacement implements AfterViewInit, DoCheck {
  private readonly runs: (() => void)[] = []

  /**
   * Adds a placement function to run at the component's moments.
   *
   * @param run - Runs it.
   * @internal
   */
  add(run: () => void): void {
    this.runs.push(run)
  }

  /** The component's view exists and its view queries are set. */
  ngAfterViewInit(): void {
    for (const run of this.runs) run()
  }

  /** The parent set the component's inputs. */
  ngDoCheck(): void {
    for (const run of this.runs) run()
  }
}

/**
 * Registers the calling component's placement function: the one place where
 * it decides, from its inputs and its projected content, which of its template
 * elements are present ({@link setElementPresent}) and where its slots render
 * ({@link placeContent}, {@link placeElement}). Call it in the constructor.
 *
 * The component writes no lifecycle hook for this. The function runs:
 *
 * - right after Angular adds, removes or changes a node of a slot the function
 *   read, in the same instruction — in whatever pass and from whatever
 *   template the node came, so the decision never lags the content and the new
 *   content is in the page before its own `ngAfterViewInit`;
 * - when a signal it read changed (an effect);
 * - when the component's view was first rendered and each time its parent
 *   checks it ({@link MolPlacement}, which the component lists in
 *   `hostDirectives`), so a plain input is followed in any kind of change
 *   detection, a bare `detectChanges()` included;
 * - after every render.
 *
 * `hasContent` is the only way to ask whether a slot has content, and it works
 * only while the function runs: a lifecycle hook cannot read a slot, because
 * no hook runs at a moment when the slot is known to be current
 * (`ngDoCheck` runs before the consumer's `@if` adds its node; no hook at all
 * runs when the content comes through an `OnPush` component in between).
 *
 * @param place - The placement function. It gets `hasContent`.
 */
export function usePlacement(place: (hasContent: SlotReader) => void): void {
  assertDomPlacement('usePlacement')
  const moments = inject(MolPlacement, { self: true, optional: true })
  if (moments === null) {
    throw new Error(
      'usePlacement() needs `hostDirectives: [MolPlacement]` in the decorator of the component that calls it ' +
        "(from @molecule/app-angular): it runs the placement function at the component's own moments.",
    )
  }
  const inRun = (): void => {
    if (running !== placement) {
      throw new Error(
        'hasContent() was called outside its usePlacement() function. A lifecycle hook cannot read a ' +
          'slot: decide presence and placement inside the function passed to usePlacement().',
      )
    }
  }
  const hasContent = ((capture, ownLeadingNodes) => {
    inRun()
    return contentOf(capture, ownLeadingNodes)
  }) as SlotReader
  /** The last children read from each capture, returned again while they are the same nodes. */
  const lastNodes = new WeakMap<Node, readonly Node[]>()
  hasContent.nodes = (capture) => {
    inRun()
    const nodes = childrenOf(capture, false)
    if (!capture) return nodes
    const last = lastNodes.get(capture)
    if (
      last !== undefined &&
      last.length === nodes.length &&
      last.every((n, i) => n === nodes[i])
    ) {
      return last
    }
    lastNodes.set(capture, nodes)
    return nodes
  }
  const host = inject(ElementRef).nativeElement as Element
  // Absent when a test calls usePlacement outside a component.
  const view = inject(ChangeDetectorRef, { optional: true })
  let names: { inputs: ReadonlySet<string>; outputs: ReadonlySet<string> } | undefined
  if (host.nodeType === 1 && !tagBindings.has(host)) {
    tagBindings.set(host, {
      renderer: null,
      listeners: new Set(),
      named: undefined,
      except: new Set(),
      target: null,
      attributes: new Map(),
      classes: new Set(),
      styles: new Map(),
      tag: host.tagName.toLowerCase(),
      inputs: () => (names ??= memberNames(view)).inputs,
      outputs: () => (names ??= memberNames(view)).outputs,
    })
  }
  let settled = false
  const call = (): void => {
    if (placement.destroyed || running === placement) return
    const outer = running
    running = placement
    try {
      place(hasContent)
    } finally {
      running = outer
    }
    if (host.nodeType === 1) syncTagBindings(host, settled)
  }
  const placement: Placement = { run: () => untracked(call), destroyed: false }
  effect(call)
  moments.add(placement.run)
  afterEveryRender({
    write: () => {
      settled = true
      try {
        placement.run()
      } finally {
        settled = false
      }
    },
  })
  inject(DestroyRef).onDestroy(() => {
    placement.destroyed = true
  })
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
