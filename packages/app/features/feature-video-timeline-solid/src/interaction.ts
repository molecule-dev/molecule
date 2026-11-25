/**
 * The timeline's gestures on the web: the ruler scrub and the Ctrl-wheel zoom shortcut.
 *
 * React's timeline gets both from `@molecule/app-ui-react/elements` (`<Box drag>` and
 * `useWheelZoomShortcut`). This module is the same behaviour for this framework's timeline — the
 * same events, the same guards and the same cleanup — so a scrub and a zoom step behave the same
 * whichever framework renders the timeline. Every framework's timeline carries the same copy.
 *
 * @module
 */

/** Which way one zoom step changes the scale. */
export type ZoomStep = 'in' | 'out'

/**
 * How far, in pixels, a touch may move from where it landed before its direction is judged.
 * A smaller movement still seeks.
 */
const TOUCH_SLOP = 8

/** A ruler scrub: the pointer that pressed the ruler seeks until it lifts or is interrupted. */
export interface RulerScrub {
  /**
   * The ruler body's `pointerdown` handler.
   *
   * @param event - The press.
   */
  press(event: PointerEvent): void

  /**
   * Ends the scrub in progress, if any: the ruler stopped seeking, or the timeline is
   * going away.
   */
  end(): void
}

/**
 * Listens for Ctrl-wheel over a surface and reports each zoom step, leaving every other
 * wheel event to the browser.
 *
 * The listener is not passive: consuming a Ctrl-wheel is what keeps the browser from
 * zooming the page, and a passive listener cannot consume anything.
 *
 * @param host - The surface (a Ctrl-wheel that starts on a descendant counts too).
 * @param onStep - Receives the direction of each step.
 * @returns What removes the listener again.
 */
export function listenForWheelZoom(
  host: HTMLElement,
  onStep: (direction: ZoomStep) => void,
): () => void {
  const wheel = (event: WheelEvent): void => {
    const delta = event.deltaY
    // A trackpad pinch reports no vertical delta where it starts and ends: the browser keeps it.
    if (!event.ctrlKey || !Number.isFinite(delta) || delta === 0) return
    event.preventDefault()
    onStep(delta < 0 ? 'in' : 'out')
  }
  host.addEventListener('wheel', wheel, { passive: false })
  return () => host.removeEventListener('wheel', wheel)
}

/**
 * Creates the ruler scrub. The primary pointer's press on the ruler seeks to where it
 * landed and keeps seeking as the pointer moves, anywhere in the window, until the pointer
 * lifts, is cancelled, loses its capture or the window loses focus. A second pointer never
 * takes a scrub over from the one that started it.
 *
 * A touch seeks the same way when the ruler says `touch-action: none`, as this one does.
 * Should a stylesheet take that away, a touch whose first real movement runs across the
 * page rather than along the ruler stays a swipe: the scrub ends and the page scrolls.
 *
 * @param seek - Receives the pointer's horizontal offset from the ruler's left edge.
 * @param enabled - Whether the ruler seeks at all; a press does nothing while it does not.
 * @returns The scrub.
 */
export function createRulerScrub(seek: (x: number) => void, enabled: () => boolean): RulerScrub {
  /** The scrub in progress: the pointer that owns it, and what ends it. */
  let active: { pointerId: number; cancel(): void } | null = null

  return {
    press(event) {
      if (!enabled()) return
      const host = event.currentTarget as HTMLElement
      if (event.button !== undefined && event.button !== 0) return
      // A second touch, or a pen beside a held mouse, is not the primary pointer: it never seeks.
      if (event.pointerType && event.isPrimary === false) return
      const ownerWindow = host.ownerDocument.defaultView
      if (!ownerWindow) return
      const { pointerId } = event
      // The pointer that pressed first keeps the scrub until it lifts. The same pointer pressing
      // again (its release never reached the page) starts a new one.
      if (active && active.pointerId !== pointerId) return
      active?.cancel()

      let captured = false
      // A touch on a surface with `touch-action: none` can never scroll. Any other touch may
      // still turn out to be an ordinary swipe, until its first real movement shows its direction.
      const touch = event.pointerType === 'touch'
      let ownsTouch = !touch || ownerWindow.getComputedStyle(host).touchAction === 'none'
      const session = { pointerId, cancel: () => finish() }
      active = session

      /** Reports the pointer's horizontal offset from the ruler's left edge. */
      const sample = (pointer: PointerEvent): void =>
        seek(pointer.clientX - host.getBoundingClientRect().left)
      /**
       * Whether a touch that may still be a swipe has turned out to be one: its first real
       * movement runs more across the page than along the ruler.
       */
      const yieldsToScroll = (x: number, y: number): boolean => {
        if (ownsTouch) return false
        const dx = Math.abs(x - event.clientX)
        const dy = Math.abs(y - event.clientY)
        if (Math.max(dx, dy) <= TOUCH_SLOP) return false
        ownsTouch = true
        return dy > dx
      }
      /** Follows the owning pointer wherever in the window it goes. */
      const move = (pointer: PointerEvent): void => {
        if (pointer.pointerId !== pointerId) return
        if (yieldsToScroll(pointer.clientX, pointer.clientY)) finish()
        else sample(pointer)
      }
      /** Keeps a touch the scrub owns from scrolling the page under it. */
      const preventScroll = (moved: TouchEvent): void => {
        const contact = moved.touches[0]
        if (moved.touches.length !== 1 || !contact) return
        if (yieldsToScroll(contact.clientX, contact.clientY)) finish()
        else if (ownsTouch && moved.cancelable) moved.preventDefault()
      }
      /** Ends the scrub when the owning pointer lifts; the release itself seeks nothing. */
      const up = (pointer: PointerEvent): void => {
        if (pointer.pointerId === pointerId) finish()
      }
      /** Ends it on the owning pointer's cancellation, or when the ruler loses its capture. */
      const cancel = (interrupted: Event): void => {
        const id = 'pointerId' in interrupted ? interrupted.pointerId : undefined
        if (id === pointerId) finish()
      }
      /** Removes the scrub's listeners, so nothing can end or continue it a second time. */
      function finish(): void {
        if (active !== session) return
        active = null
        // The null check above does not carry into this hoisted function, hence the `?.`.
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
            // The browser can release capture before notifying of a cancellation or removal.
          }
        }
      }

      ownerWindow.addEventListener('pointermove', move, true)
      ownerWindow.addEventListener('pointerup', up, true)
      ownerWindow.addEventListener('pointercancel', cancel, true)
      if (touch) ownerWindow.addEventListener('touchmove', preventScroll, { passive: false })
      ownerWindow.addEventListener('blur', session.cancel)
      host.addEventListener('lostpointercapture', cancel)
      if (host.setPointerCapture && Number.isFinite(pointerId)) {
        try {
          host.setPointerCapture(pointerId)
          captured = true
        } catch (_error) {
          // A browser may reject capture for a contact it no longer tracks. The window listens too.
        }
      }
      sample(event)
    },

    end() {
      active?.cancel()
    },
  }
}
