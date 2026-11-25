/**
 * Document-scoped ownership of web overlay focus, keys and scrolling.
 *
 * @module
 */

import type { ElementHandle, OverlayLayerOptions } from '@molecule/app-ui'

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

type FocusElement = Element & ElementHandle

interface Entry {
  layer: OverlayLayer
  options: OverlayLayerOptions
  surface: FocusElement
  logicalParent?: OverlayLayer
  parent?: Entry
  opener: FocusElement | null
  lockedBody?: HTMLElement
  unlock?: () => void
}

/** Checks the DOM shape without requiring the ambient window's constructors. */
function isFocusElement(handle: unknown): handle is FocusElement {
  return (
    typeof handle === 'object' &&
    handle !== null &&
    'nodeType' in handle &&
    handle.nodeType === 1 &&
    'focus' in handle &&
    typeof handle.focus === 'function' &&
    'ownerDocument' in handle
  )
}

/**
 * Reads a renderer's DOM handle, including one from a different window.
 *
 * @param handle - The element handle supplied by the renderer.
 * @returns The DOM element, or null if there is no DOM handle.
 */
export function domElement(handle: unknown): FocusElement | null {
  return isFocusElement(handle) ? handle : null
}

/** Whether blur moved between controls in the same surface. */
export function focusStaysWithin(
  event: Pick<FocusEvent, 'currentTarget' | 'relatedTarget'>,
): boolean {
  const destination = domElement(event.relatedTarget)
  return !!destination && !!domElement(event.currentTarget)?.contains(destination)
}

const locks = new WeakMap<HTMLElement, { count: number; overflow: string; priority: string }>()

/** Keeps a body's first inline overflow value and priority until the last release. */
function lockBody(body: HTMLElement): () => void {
  const lock = locks.get(body) ?? {
    count: 0,
    overflow: body.style.getPropertyValue('overflow'),
    priority: body.style.getPropertyPriority('overflow'),
  }
  if (lock.count === 0) {
    locks.set(body, lock)
    body.style.setProperty('overflow', 'hidden', lock.priority)
  }
  lock.count += 1
  return () => {
    lock.count -= 1
    if (lock.count !== 0) return
    body.style.setProperty('overflow', lock.overflow, lock.priority)
    locks.delete(body)
  }
}

/** Whether a layer belongs to another layer's scope. */
function ownedBy(entry: Entry, ancestor: Entry): boolean {
  for (let parent = entry.parent; parent; parent = parent.parent) {
    if (parent === ancestor) return true
  }
  return false
}

/** The non-passive layers relevant to focus and dismissal. */
function isInteractive(entry: Entry): boolean {
  return entry.options.kind !== 'toast'
}

/** A layer stack shared by all renderers and roots in the same document. */
class DocumentLayers {
  private readonly entries: Entry[] = []
  private observingOutside = false
  private dismissedOnMouseDown = false

  constructor(private readonly owner: Document) {}

  /** Looks up the foremost mounted layer that participates in an interaction. */
  private top(matches: (entry: Entry) => boolean): Entry | undefined {
    for (let index = this.entries.length - 1; index >= 0; index -= 1) {
      const entry = this.entries[index]
      if (entry.surface.isConnected && entry.surface.ownerDocument === this.owner && matches(entry))
        return entry
    }
    return undefined
  }

  /** Resolves a logical parent first, then the nearest surface containing the anchor. */
  private updateOwnership(): void {
    for (const entry of this.entries) {
      const canOwn = (candidate: Entry): boolean =>
        candidate !== entry &&
        candidate.surface.ownerDocument === this.owner &&
        isInteractive(candidate) &&
        !ownedBy(candidate, entry)
      const logical = this.entries.find(
        (candidate) => candidate.layer === entry.logicalParent && canOwn(candidate),
      )
      if (logical) {
        entry.parent = logical
        continue
      }

      entry.parent = undefined
      const anchor = domElement(entry.options.anchor?.current)
      for (let node: Element | null = anchor; node; node = node.parentElement) {
        const surface = this.entries.find(
          (candidate) => candidate.surface === node && canOwn(candidate),
        )
        if (surface) {
          entry.parent = surface
          break
        }
      }
    }
  }

  /** Combines a surface and its connected, interactive portals. */
  private roots(entry: Entry): FocusElement[] {
    return [
      entry.surface,
      ...this.entries
        .filter(
          (candidate) =>
            candidate.surface.isConnected && isInteractive(candidate) && ownedBy(candidate, entry),
        )
        .map((candidate) => candidate.surface),
    ]
  }

  /** Finds distinct controls in document order across the scope's surfaces. */
  private focusables(roots: readonly FocusElement[]): HTMLElement[] {
    const controls = new Set(
      roots.flatMap((root) => Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))),
    )
    return [...controls].sort((a, b) =>
      a.compareDocumentPosition(b) & a.DOCUMENT_POSITION_FOLLOWING ? -1 : 1,
    )
  }

  /** Focuses the explicit target, the first control, or the panel. */
  private focusInitial(entry: Entry): void {
    const initial = domElement(entry.options.focus?.initial?.current)
    const roots = this.roots(entry)
    const target =
      initial && roots.some((root) => root.contains(initial))
        ? initial
        : (this.focusables(roots)[0] ?? entry.surface)
    target.focus()
  }

  /** The nearest trap remains active while its popovers own dismissal. */
  private get focusScope(): Entry | undefined {
    return this.top((entry) => isInteractive(entry) && !!entry.options.focus?.trap)
  }

  private readonly keydown = (event: KeyboardEvent): void => {
    if (event.defaultPrevented) return
    if (event.key === 'Escape') {
      // Pick once. A synchronous close may change the stack before this returns.
      const entry = this.top(
        ({ options }) =>
          options.kind === 'modal' || (options.kind !== 'toast' && !!options.dismissKey),
      )
      if (entry?.options.dismissKey) entry.options.onDismiss?.('escape')
      return
    }
    if (event.key !== 'Tab') return
    const entry = this.focusScope
    if (!entry) return
    const roots = this.roots(entry)
    const focusables = this.focusables(roots)
    const first = focusables[0]
    const last = focusables[focusables.length - 1]
    const active = this.owner.activeElement
    if (!first || !last) {
      event.preventDefault()
      entry.surface.focus()
    } else if (
      active === (event.shiftKey ? first : last) ||
      !roots.some((root) => root.contains(active))
    ) {
      event.preventDefault()
      const target = event.shiftKey ? last : first
      target.focus()
    }
  }

  private readonly mousedown = (event: MouseEvent): void => {
    this.dismissedOnMouseDown = this.dismissOutside('start', event)
  }

  private readonly click = (event: MouseEvent): void => {
    // A pointer activation must not dismiss a second layer after its mousedown
    // closed the first. Keyboard and assistive-technology clicks have detail 0.
    const alreadyDismissed = event.detail > 0 && this.dismissedOnMouseDown
    this.dismissedOnMouseDown = false
    if (!alreadyDismissed) this.dismissOutside('activate', event)
  }

  /** Delivers an outside press to the foremost eligible layer. */
  private dismissOutside(phase: 'start' | 'activate', event: MouseEvent): boolean {
    const entry = this.top(
      ({ options }) => options.kind === 'modal' || (options.kind !== 'toast' && !!options.outside),
    )
    const outside = entry?.options.outside
    if (!entry || outside?.phase !== phase) return false
    const inside = outside.inside.map(({ current }) => domElement(current))
    const path = event.composedPath()
    if (
      inside.some((node) => !node?.isConnected || node.ownerDocument !== this.owner) ||
      [...inside, ...this.roots(entry)].some((node) => node && path.includes(node))
    ) {
      return false
    }
    entry.options.onDismiss?.('outside')
    return true
  }

  /** Listens once per document while at least one layer requests outside presses. */
  private syncOutside(): void {
    const outside = this.entries.some(({ options }) => !!options.outside)
    if (outside === this.observingOutside) return
    this.observingOutside = outside
    if (outside) {
      this.owner.addEventListener('mousedown', this.mousedown)
      this.owner.addEventListener('click', this.click)
    } else {
      this.owner.removeEventListener('mousedown', this.mousedown)
      this.owner.removeEventListener('click', this.click)
      this.dismissedOnMouseDown = false
    }
  }

  /** Registers an open interval and places a late parent below its descendants. */
  open(
    layer: OverlayLayer,
    options: OverlayLayerOptions,
    surface: FocusElement,
    logicalParent: OverlayLayer | undefined,
  ): Entry {
    const entry: Entry = { layer, options, surface, logicalParent, opener: null }
    if (this.entries.length === 0) this.owner.addEventListener('keydown', this.keydown)
    this.entries.push(entry)
    this.updateOwnership()

    // Several independently mounted portals can precede their common parent.
    const oldestChildIndex = this.entries.findIndex(
      (candidate) => isInteractive(candidate) && ownedBy(candidate, entry),
    )
    if (oldestChildIndex === -1) {
      entry.opener = domElement(this.owner.activeElement)
    } else {
      entry.opener = this.entries[oldestChildIndex].opener
      this.entries.pop()
      this.entries.splice(oldestChildIndex, 0, entry)
    }
    this.syncLock(entry)
    this.syncOutside()
    return entry
  }

  /** Moves focus only if the layer still owns the foreground after rendering. */
  focusOnOpen(entry: Entry, afterRender: FocusScheduler): void {
    if (!isInteractive(entry) || !entry.options.focus) return
    afterRender(() => {
      if (this.top(isInteractive) === entry && entry.options.focus) this.focusInitial(entry)
    }, 'open')
  }

  /** Applies live options while retaining the layer's place and captured opener. */
  update(
    entry: Entry,
    options: OverlayLayerOptions,
    surface: FocusElement,
    logicalParent: OverlayLayer | undefined,
  ): void {
    entry.options = options
    entry.surface = surface
    entry.logicalParent = logicalParent
    this.updateOwnership()
    this.syncLock(entry)
    this.syncOutside()
  }

  /** Updates the body's lock without re-registering the layer. */
  private syncLock(entry: Entry): void {
    const body = isInteractive(entry) && entry.options.lockScroll ? this.owner.body : undefined
    if (entry.lockedBody === body) return
    entry.unlock?.()
    entry.lockedBody = body
    entry.unlock = body ? lockBody(body) : undefined
  }

  /** Releases a layer and restores focus only when it owned the foreground. */
  remove(entry: Entry, afterRender: FocusScheduler): void {
    const index = this.entries.indexOf(entry)
    const above = this.entries.slice(index + 1)
    const descendants = above.filter((candidate) => ownedBy(candidate, entry))
    // Owned popovers may still be connected while their parent unmounts. A
    // connected child modal can survive that removal and keep its focus scope.
    const closingPortals = new Set(
      descendants.filter((candidate) => candidate.options.kind !== 'modal'),
    )
    const foreground = !above.some(
      (candidate) =>
        candidate.surface.isConnected && isInteractive(candidate) && !closingPortals.has(candidate),
    )
    const released = [
      entry.surface,
      ...descendants
        .filter((child) => !child.surface.isConnected || closingPortals.has(child))
        .map((child) => child.surface),
    ]
    this.entries.splice(index, 1)
    this.updateOwnership()
    entry.unlock?.()
    this.syncOutside()
    if (this.entries.length === 0) this.owner.removeEventListener('keydown', this.keydown)

    // A surviving upper layer may have opened from a control that is being removed.
    for (const candidate of above) {
      if (released.some((root) => root.contains(candidate.opener))) candidate.opener = entry.opener
    }

    const restore = entry.options.focus?.restore
    if (!isInteractive(entry) || !foreground || !restore) return
    const previous = this.top(
      (candidate) => isInteractive(candidate) && !closingPortals.has(candidate),
    )
    afterRender(() => {
      const top = this.top(isInteractive)
      if (top && top !== previous && !closingPortals.has(top)) return
      const target = restore === 'opener' ? entry.opener : domElement(restore.current)
      const remaining = this.top(
        (candidate) =>
          isInteractive(candidate) &&
          !!candidate.options.focus?.trap &&
          !closingPortals.has(candidate),
      )
      if (
        target?.isConnected &&
        (!remaining || this.roots(remaining).some((root) => root.contains(target)))
      ) {
        target.focus()
      } else if (remaining) {
        this.focusInitial(remaining)
      }
    }, 'close')
  }

  /** Dismisses a backdrop if no blocking layer above it owns the interaction. */
  backdrop(layer: OverlayLayer): void {
    const entry = this.top(
      ({ options }) =>
        options.kind === 'modal' || (options.kind !== 'toast' && !!options.dismissBackdrop),
    )
    if (entry?.layer === layer && entry.options.dismissBackdrop)
      entry.options.onDismiss?.('backdrop')
  }
}

const managers = new WeakMap<Document, DocumentLayers>()

/** Returns the single overlay stack for a document. */
function layersForDocument(owner: Document): DocumentLayers {
  const existing = managers.get(owner)
  if (existing) return existing
  const manager = new DocumentLayers(owner)
  managers.set(owner, manager)
  return manager
}

/** Schedules DOM focus at the point where a renderer has finished writing its view. */
export type FocusScheduler = (focus: () => void, transition: 'open' | 'close') => void

/** A renderer-owned registration for one overlay, reusable across open intervals. */
export class OverlayLayer {
  private registration?: { stack: DocumentLayers; entry: Entry }

  /**
   * Creates a registration owned by one mounted overlay view.
   *
   * @param afterRender - Schedules focus if the renderer is still writing DOM.
   */
  constructor(private readonly afterRender: FocusScheduler = (focus) => focus()) {}

  /**
   * Registers an open surface, updates live options, or releases a closed layer.
   *
   * @param options - The current renderer-neutral overlay options.
   * @param parent - The logical parent when the renderer can provide one.
   */
  sync(options: OverlayLayerOptions, parent?: OverlayLayer): void {
    const surface = options.open ? domElement(options.surface.current) : null
    if (!surface) {
      this.release()
      return
    }
    const stack = layersForDocument(surface.ownerDocument)
    if (this.registration?.stack === stack) {
      stack.update(this.registration.entry, options, surface, parent)
    } else {
      this.release()
      const entry = stack.open(this, options, surface, parent)
      this.registration = { stack, entry }
      stack.focusOnOpen(entry, this.afterRender)
    }
  }

  /** Releases keys, scroll and focus ownership. Safe to call after closing. */
  release(): void {
    const registration = this.registration
    this.registration = undefined
    registration?.stack.remove(registration.entry, this.afterRender)
  }

  /** Requests dismissal when this layer owns the backdrop. */
  dismissBackdrop(): void {
    this.registration?.stack.backdrop(this)
  }
}
