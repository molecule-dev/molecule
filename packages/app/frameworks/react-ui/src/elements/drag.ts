import { type PointerEventHandler, useEffect, useLayoutEffect, useRef } from 'react'

import type { ElementDrag, ElementDragPoint } from '@molecule/app-ui'

const claimed = new WeakSet<Event>()
const pressTargets = new WeakSet<Element>()
const controls = 'button, input, textarea, select, label, a[href], [role="button"], [role="link"]'
const LONG_PRESS_MS = 500
const TOUCH_SLOP = 8
const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect

/** Marks a Pressable host so an ancestor drag leaves its activation alone. */
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

/**
 * Acquires on the deepest drag host and follows its pointer until release or interruption.
 *
 * @param drag - The current drag handlers.
 * @param hostTag - Changes when a polymorphic element replaces its host.
 * @returns The down handler for the existing DOM host.
 */
export function useWebDrag<T extends HTMLElement | SVGElement>(
  drag: ElementDrag | undefined,
  hostTag?: string,
): PointerEventHandler<T> | undefined {
  const handlers = useRef(drag)
  const active = useRef<DragSession>(null)
  const enabled = Boolean(drag)
  useIsomorphicLayoutEffect(() => {
    handlers.current = drag
  })
  useIsomorphicLayoutEffect(() => () => active.current?.cancel(), [enabled, hostTag])

  if (!drag) return undefined
  return (event) => {
    const host = event.currentTarget
    const down = event.nativeEvent
    if (down.button !== undefined && down.button !== 0) return
    // A pointer event can lack a device type when dispatched through a mouse-only host.
    if (down.pointerType && down.isPrimary === false) return
    if (claimed.has(down) || insideControl(host, event.target)) return
    const ownerWindow = host.ownerDocument.defaultView
    if (!ownerWindow) return
    claimed.add(down)
    const { pointerId } = down
    // A down for the same pointer after a lost terminal event starts a new contact.
    if (active.current && active.current.pointerId !== pointerId) return
    active.current?.cancel()

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
    active.current = session

    /** Captures the contact when supported and delivers the first sample. */
    function acquire(): void {
      if (active.current !== session) return
      if (host.setPointerCapture && Number.isFinite(pointerId)) {
        try {
          host.setPointerCapture(pointerId)
          captured = true
        } catch (_error) {
          // A browser may reject capture for a contact it no longer tracks. The window listens too.
        }
      }
      last = point(viewport, down, down)
      handlers.current?.onStart(last)
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
        handlers.current?.onMove?.(last)
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
      if (active.current !== session) return
      active.current = null
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
      if (released) handlers.current?.onEnd?.(point(viewport, down, released))
      else handlers.current?.onCancel?.(last)
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
}
