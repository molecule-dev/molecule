import type { ElementDrag, ElementDragPoint } from '@molecule/app-ui'

const claimed = new WeakSet<Event>()
const pressTargets = new WeakSet<Element>()
const controls = 'button, input, textarea, select, label, a[href], [role="button"], [role="link"]'
const LONG_PRESS_MS = 500
const TOUCH_SLOP = 8

/**
 * Marks a custom press target so an enclosing drag leaves its activation alone.
 *
 * @param host - The element that owns the activation.
 */
export function markPressTarget(host: Element): void {
  pressTargets.add(host)
}

/** Finds a descendant control that owns the interaction. */
function insideControl(host: Element, target: EventTarget | null): boolean {
  const ownerWindow = host.ownerDocument.defaultView
  if (!ownerWindow || !(target instanceof ownerWindow.Element) || !host.contains(target)) {
    return true
  }
  for (let child: Element | null = target; child && child !== host; child = child.parentElement) {
    if (
      pressTargets.has(child) ||
      child.matches(controls) ||
      (child instanceof ownerWindow.HTMLElement && child.isContentEditable) ||
      child.matches(
        '[contenteditable=""], [contenteditable="true"], [contenteditable="plaintext-only"]',
      )
    ) {
      return true
    }
  }
  return false
}

/** Builds a sample from the current viewport while retaining the original contact position. */
function point(
  viewport: Element,
  down: PointerEvent,
  { clientX, clientY, altKey, ctrlKey, metaKey, shiftKey }: PointerEvent,
): ElementDragPoint {
  const { left, top, width, height } = viewport.getBoundingClientRect()
  return {
    x: clientX - left,
    y: clientY - top,
    dx: clientX - down.clientX,
    dy: clientY - down.clientY,
    bounds: { x: left, y: top, width, height },
    altKey,
    ctrlKey,
    metaKey,
    shiftKey,
  }
}

type DragSession = { pointerId: number; cancel(): void }

/** The renderer-facing controls for one drag host. */
export interface WebDrag {
  /**
   * Updates the callbacks used by the gesture. Removing the handlers cancels the contact.
   *
   * @param drag - The current handlers, or undefined to disable dragging.
   */
  update(drag: ElementDrag | undefined): void
  /**
   * Offers a pointer press to this host.
   *
   * @param host - The element receiving the press.
   * @param down - The native pointer event shared by all hosts.
   * @param drag - The press settings, when supplied by a renderer's event binding.
   * @param target - The renderer's normalized target, when it differs from the native target.
   */
  start(
    host: HTMLElement | SVGElement,
    down: PointerEvent,
    drag?: ElementDrag,
    target?: EventTarget | null,
  ): void
  /** Cancels the active contact, if any. */
  cancel(): void
}

/**
 * Acquires a press on the deepest drag host and follows its pointer until release or interruption.
 *
 * @param initialDrag - The initial handlers, if the host starts enabled.
 * @returns The controls a renderer uses to handle pointerdown, updates and unmount.
 */
export function createWebDrag(initialDrag?: ElementDrag): WebDrag {
  let handlers = initialDrag
  let active: DragSession | null = null

  /**
   * Claims the press and starts tracking the owning pointer.
   *
   * @param host - The host receiving the press.
   * @param down - The native pointer event.
   * @param drag - The settings at the time of the press.
   * @param target - The element the press hit.
   */
  function start(
    host: HTMLElement | SVGElement,
    down: PointerEvent,
    drag = handlers,
    target = down.target,
  ): void {
    if (!drag) return
    if (down.button !== undefined && down.button !== 0) return
    // A pointer event can lack a device type when dispatched through a mouse-only host.
    if (down.pointerType && down.isPrimary === false) return
    if (claimed.has(down) || insideControl(host, target)) return
    const ownerWindow = host.ownerDocument.defaultView
    if (!ownerWindow) return
    claimed.add(down)
    const { pointerId } = down
    // A down for the same pointer after a lost terminal event starts a new contact.
    if (active && active.pointerId !== pointerId) return
    active?.cancel()

    const viewport =
      host.localName === 'g' && 'ownerSVGElement' in host ? (host.ownerSVGElement ?? host) : host
    const touch = down.pointerType === 'touch'
    const longPress = touch && drag.touchStart === 'longPress'
    let timer: ReturnType<typeof setTimeout> | undefined
    let last: ElementDragPoint | undefined
    let captured = false
    let axisChosen =
      longPress ||
      (drag.axis !== 'horizontal' && drag.axis !== 'vertical') ||
      (touch && ownerWindow.getComputedStyle(host).touchAction === 'none')
    const session = { pointerId, cancel: () => finish() }
    active = session

    /** Captures the contact when supported and delivers the first sample. */
    function acquire(): void {
      if (active !== session) return
      if (host.setPointerCapture && Number.isFinite(pointerId)) {
        try {
          host.setPointerCapture(pointerId)
          captured = true
        } catch (_error) {
          // A browser may reject capture for a contact it no longer tracks. The window listens too.
        }
      }
      last = point(viewport, down, down)
      handlers?.onStart(last)
    }

    /** Lets an ordinary swipe reach a scroller while touch intent remains undetermined. */
    function shouldYield(x: number, y: number): boolean {
      if (!touch || (last && axisChosen)) return false
      const dx = Math.abs(x - down.clientX)
      const dy = Math.abs(y - down.clientY)
      if (Math.max(dx, dy) <= TOUCH_SLOP) return false
      if (!last) return true
      axisChosen = true
      return drag?.axis === 'horizontal' ? dy > dx : dx > dy
    }

    /** Delivers movement from the owned pointer after scroll negotiation. */
    function move(sample: PointerEvent): void {
      if (sample.pointerId !== pointerId) return
      if (shouldYield(sample.clientX, sample.clientY)) finish()
      else if (last) {
        last = point(viewport, down, sample)
        handlers?.onMove?.(last)
      }
    }

    /** Reserves a touch already acquired by this gesture. */
    function preventScroll(event: TouchEvent): void {
      const contact = event.touches[0]
      if (event.touches.length !== 1 || !contact) return
      if (shouldYield(contact.clientX, contact.clientY)) finish()
      else if (last && axisChosen && event.cancelable) event.preventDefault()
    }

    /** Releases only when the owning pointer lifts. */
    function up(sample: PointerEvent): void {
      if (sample.pointerId === pointerId) finish(sample)
    }

    /** Handles cancellation and lost capture for the owning pointer. */
    function cancel(sample: Event): void {
      const id = 'pointerId' in sample ? sample.pointerId : undefined
      if (id === pointerId) finish()
    }

    /** Removes the active subscriptions before the single terminal callback. */
    function finish(released?: PointerEvent): void {
      if (active !== session) return
      active = null
      clearTimeout(timer)
      ownerWindow?.removeEventListener('pointermove', move, true)
      ownerWindow?.removeEventListener('pointerup', up, true)
      ownerWindow?.removeEventListener('pointercancel', cancel, true)
      ownerWindow?.removeEventListener('touchmove', preventScroll)
      ownerWindow?.removeEventListener('blur', session.cancel)
      host.removeEventListener('lostpointercapture', cancel)
      if (captured && host.releasePointerCapture) {
        try {
          host.releasePointerCapture(pointerId)
        } catch (_error) {
          // The browser can release capture before notifying us of cancellation or removal.
        }
      }
      if (!last) return
      if (released) handlers?.onEnd?.(point(viewport, down, released))
      else handlers?.onCancel?.(last)
    }

    // Captured events bubble here too, so the fallback and the captured stream share one listener.
    ownerWindow.addEventListener('pointermove', move, true)
    ownerWindow.addEventListener('pointerup', up, true)
    ownerWindow.addEventListener('pointercancel', cancel, true)
    ownerWindow.addEventListener('blur', session.cancel)
    host.addEventListener('lostpointercapture', cancel)
    if (touch) ownerWindow.addEventListener('touchmove', preventScroll, { passive: false })
    if (longPress) timer = setTimeout(acquire, LONG_PRESS_MS)
    else acquire()
  }

  return {
    start,
    update(drag) {
      if (!drag) active?.cancel()
      handlers = drag
    },
    cancel() {
      active?.cancel()
    },
  }
}

/** The lifecycle of a drag attached to a DOM element. */
export interface WebDragBinding {
  /**
   * Updates the handlers for this host.
   *
   * @param drag - The current handlers, or undefined to disable dragging.
   */
  update(drag: ElementDrag | undefined): void
  /** Removes the pointer listener and cancels any active contact. */
  destroy(): void
}

/**
 * Binds a drag to a native bubbling pointerdown listener.
 *
 * @param host - The element that can own the press.
 * @param drag - The initial handlers, if the host starts enabled.
 * @returns The binding to update or destroy with the host.
 */
export function bindWebDrag(host: HTMLElement | SVGElement, drag?: ElementDrag): WebDragBinding {
  const gesture = createWebDrag(drag)
  const target: GlobalEventHandlers = host
  const pointerDown = (event: PointerEvent): void => gesture.start(host, event)
  target.addEventListener('pointerdown', pointerDown)
  return {
    update: gesture.update,
    destroy() {
      target.removeEventListener('pointerdown', pointerDown)
      gesture.cancel()
    },
  }
}
