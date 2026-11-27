import type { ElementDrag, ElementDragPoint, ElementDragProps } from '@molecule/app-ui'

import { trackWebPinch } from './web-pinch.js'
import { bindWebFocalWheelZoom } from './web-wheel-zoom.js'

type DragHost = HTMLElement | SVGElement

/** Accepts a standalone drag or the element's combined drag and zoom options. */
export type WebDragOptions = ElementDrag | ElementDragProps

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

/** Uses the SVG viewport rather than the bounds of a transformed group. */
function viewportFor(host: DragHost): Element {
  return host.localName === 'g' && 'ownerSVGElement' in host ? (host.ownerSVGElement ?? host) : host
}

/** Normalizes the original drag-only binding and the combined gesture options. */
function surfaceOptions(options: WebDragOptions | undefined): ElementDragProps {
  return options && 'onStart' in options ? { drag: options } : (options ?? {})
}

type DragSession = {
  pointerId: number
  move(event: PointerEvent): void
  cancel(): void
  takeOver(): void
}

/** The renderer-facing controls for one drag host. */
export interface WebDrag {
  /**
   * Updates the callbacks used by the gesture. Removing the handlers cancels the contact.
   *
   * @param options - The current handlers, or undefined to disable the surface.
   */
  update(options: WebDragOptions | undefined): void
  /**
   * Attaches touch reservation and focal wheel input to the current host.
   *
   * @param host - The host receiving wheel events, or null on detach.
   */
  attach(host: DragHost | null): void
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
  /** Cancels the active input, if any. */
  cancel(): void
}

/**
 * Acquires a press on the deepest drag host and follows its pointer until release or interruption.
 *
 * @param initial - The initial handlers, if the host starts enabled.
 * @returns The controls a renderer uses to handle pointerdown, updates and unmount.
 */
export function createWebDrag(initial?: WebDragOptions): WebDrag {
  let { drag: handlers, zoom } = surfaceOptions(initial)
  let active: DragSession | null = null
  let touch: ReturnType<typeof trackWebPinch> | null = null
  let attached: DragHost | null = null
  let detachZoom: (() => void) | undefined

  /** Reserves touch input and installs focal wheel handling on the attached host. */
  function attachZoom(): void {
    if (!attached || !zoom || detachZoom) return
    const host = attached
    const previous = host.style.touchAction
    // The touch-action decision is made at pointer down, before a second contact can register.
    host.style.touchAction = 'none'
    const removeWheel = bindWebFocalWheelZoom(
      host,
      () => viewportFor(host),
      () => (active || touch ? undefined : zoom),
    )
    detachZoom = () => {
      removeWheel()
      if (host.style.touchAction === 'none') host.style.touchAction = previous ?? ''
      detachZoom = undefined
    }
  }

  /** Closes both the contact tracker and any acquired drag. */
  function cancel(): void {
    touch?.cancel()
    active?.cancel()
  }

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
    if (!drag && !zoom) return
    if (down.button !== undefined && down.button !== 0) return
    if (claimed.has(down) || insideControl(host, target)) return
    const ownerWindow = host.ownerDocument.defaultView
    if (!ownerWindow) return

    if (down.pointerType === 'touch' && zoom) {
      // A second finger cannot acquire a surface whose first contact belongs elsewhere.
      if (!touch) {
        if (down.isPrimary === false || active) return
        touch = trackWebPinch(viewportFor(host), ownerWindow, {
          takeOver: () => active?.takeOver(),
          resume(remaining, event) {
            if (handlers) beginDrag(host, ownerWindow, remaining, handlers, true, true).move(event)
          },
          zoom: (sample) => zoom?.onZoom(sample),
          close(cancelDrag) {
            touch = null
            if (cancelDrag) active?.cancel()
          },
        })
        claimed.add(down)
        touch.add(down)
        if (drag) beginDrag(host, ownerWindow, down, drag, true)
      } else {
        claimed.add(down)
        touch.add(down)
      }
      return
    }

    if (!drag || touch || (down.pointerType && down.isPrimary === false)) return
    claimed.add(down)
    // A down for the same pointer after a lost terminal event starts a new contact.
    if (active && active.pointerId !== down.pointerId) return
    active?.cancel()
    beginDrag(host, ownerWindow, down, drag, false)
  }

  /** Starts a drag at the original contact or the surviving contact after a pinch. */
  function beginDrag(
    host: DragHost,
    ownerWindow: Window,
    down: PointerEvent,
    drag: ElementDrag,
    ownsTouch: boolean,
    resumed = false,
  ): DragSession {
    const { pointerId } = down
    const viewport = viewportFor(host)
    const touch = down.pointerType === 'touch'
    const longPress = touch && !resumed && drag.touchStart === 'longPress'
    let timer: ReturnType<typeof setTimeout> | undefined
    let last: ElementDragPoint | undefined
    let captured = false
    let axisChosen =
      longPress ||
      (drag.axis !== 'horizontal' && drag.axis !== 'vertical') ||
      (touch && (ownsTouch || ownerWindow.getComputedStyle(host).touchAction === 'none'))
    const session = {
      pointerId,
      move,
      cancel: () => finish(),
      takeOver: () => finish(undefined, true),
    }
    active = session

    /** Captures the contact when supported and delivers the first sample. */
    function acquire(): void {
      if (active !== session) return
      // Touch pointers on zoom surfaces already have implicit capture. Keep it through takeover.
      if (!ownsTouch && host.setPointerCapture && Number.isFinite(pointerId)) {
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
      return drag.axis === 'horizontal' ? dy > dx : dx > dy
    }

    /** Delivers movement from the owned pointer after scroll negotiation. */
    function move(sample: PointerEvent): void {
      if (active !== session || sample.pointerId !== pointerId) return
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
    function finish(released?: PointerEvent, takenOver = false): void {
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
      else if (takenOver) (handlers?.onCancel ?? handlers?.onEnd)?.(last)
      else handlers?.onCancel?.(last)
    }

    // Captured events bubble here too, so the fallback and the captured stream share one listener.
    ownerWindow.addEventListener('pointermove', move, true)
    ownerWindow.addEventListener('pointerup', up, true)
    ownerWindow.addEventListener('pointercancel', cancel, true)
    ownerWindow.addEventListener('blur', session.cancel)
    host.addEventListener('lostpointercapture', cancel)
    if (touch && !ownsTouch)
      ownerWindow.addEventListener('touchmove', preventScroll, { passive: false })
    if (longPress) timer = setTimeout(acquire, LONG_PRESS_MS)
    else acquire()
    return session
  }

  return {
    start,
    update(options) {
      const next = surfaceOptions(options)
      if (zoom && !next.zoom) {
        touch?.cancel()
        detachZoom?.()
      }
      if (!next.drag) active?.cancel()
      handlers = next.drag
      zoom = next.zoom
      attachZoom()
    },
    attach(host) {
      if (attached === host) return
      cancel()
      detachZoom?.()
      attached = host
      attachZoom()
    },
    cancel,
  }
}

/** The lifecycle of a drag attached to a DOM element. */
export interface WebDragBinding {
  /**
   * Updates the handlers for this host.
   *
   * @param options - The current handlers, or undefined to disable the surface.
   */
  update(options: WebDragOptions | undefined): void
  /** Removes the pointer listener and cancels any active contact. */
  destroy(): void
}

/**
 * Binds a drag to a native bubbling pointerdown listener.
 *
 * @param host - The element that can own the press.
 * @param options - The initial handlers, if the host starts enabled.
 * @returns The binding to update or destroy with the host.
 */
export function bindWebDrag(host: DragHost, options?: WebDragOptions): WebDragBinding {
  const gesture = createWebDrag(options)
  gesture.attach(host)
  const target: GlobalEventHandlers = host
  const pointerDown = (event: PointerEvent): void => gesture.start(host, event)
  target.addEventListener('pointerdown', pointerDown)
  return {
    update: gesture.update,
    destroy() {
      target.removeEventListener('pointerdown', pointerDown)
      gesture.attach(null)
    },
  }
}
