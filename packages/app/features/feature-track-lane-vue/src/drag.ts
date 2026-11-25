/**
 * The pointer gesture of a lane's drag hosts (a clip block and its resize
 * handle) on the web: what React's lane gets from the `drag` binding of
 * `@molecule/app-ui-react`'s `Pressable` and `Box` for the bindings this lane
 * passes (no drag axis, and a touch contact starts at once).
 *
 * A host takes one primary contact at a time, captures its pointer and follows
 * it on its own window in the capture phase until the pointer is released or
 * the contact is interrupted (`pointercancel`, the window losing focus, the
 * pointer capture being lost, the host leaving the lane). Only the deepest host
 * under a press takes it, so the handle resizes and never also moves its clip.
 *
 * @module
 */

/** What a drag host reports about the contact it owns. */
export interface DragHandlers {
  /** The host took the contact. */
  onStart(): void
  /** The contact moved `dx` CSS pixels from where it pressed (left is negative). */
  onMove(dx: number): void
  /** The contact was released `dx` CSS pixels from where it pressed. */
  onEnd(dx: number): void
  /** The contact ended without a release. */
  onCancel(): void
}

/** The contact one drag host owns, and how it ends. */
interface Contact {
  /** The pointer of the contact. */
  pointerId: number
  /** Ends the contact: with the release event, or without one when it is interrupted. */
  finish(released?: PointerEvent): void
}

/** The presses a drag host took, so an enclosing host leaves the same press alone. */
const claimed = new WeakSet<Event>()

/** Elements that own a press inside a drag host: a form control, a link, another button. */
const CONTROLS = 'button, input, textarea, select, label, a[href], [role="button"], [role="link"]'

/** Elements the user can edit. */
const EDITABLE =
  '[contenteditable=""], [contenteditable="true"], [contenteditable="plaintext-only"]'

/**
 * Whether a press landed on a control inside the host instead of on the host
 * itself, so the control keeps the press.
 *
 * @param host - The drag host pressed.
 * @param target - The element the press landed on.
 * @returns True unless the press landed on the host itself.
 */
function insideControl(host: Element, target: EventTarget | null): boolean {
  const ownerWindow = host.ownerDocument.defaultView
  if (!ownerWindow || !(target instanceof ownerWindow.Element) || !host.contains(target)) {
    return true
  }
  for (let child: Element | null = target; child && child !== host; child = child.parentElement) {
    if (
      child.matches(CONTROLS) ||
      child.matches(EDITABLE) ||
      (child instanceof ownerWindow.HTMLElement && child.isContentEditable)
    ) {
      return true
    }
  }
  return false
}

/** The drag hosts of one lane. Each element owns at most one contact. */
export interface DragHosts {
  /** A primary pointer pressed a drag host: follows it until the release or an interruption. */
  press(host: HTMLElement, event: PointerEvent, handlers: DragHandlers): void
  /** Ends the contact a host owns, when the host leaves the lane. */
  cancel(host: Element): void
}

/**
 * The drag hosts of one lane: every clip block and every resize handle.
 *
 * @returns The press handler and the cleanup of a host that leaves the lane.
 */
export function createDragHosts(): DragHosts {
  /** The contact each host owns. */
  const contacts = new WeakMap<Element, Contact>()

  /**
   * Ends the contact a host owns, as React's drag cleanup does when the host unmounts.
   *
   * @param host - The drag host.
   */
  function cancel(host: Element): void {
    contacts.get(host)?.finish()
  }

  /**
   * Takes the contact of the primary pointer that pressed a drag host.
   *
   * @param host - The drag host pressed.
   * @param event - The `pointerdown`.
   * @param handlers - What the host reports about the contact.
   */
  function press(host: HTMLElement, event: PointerEvent, handlers: DragHandlers): void {
    if (event.button !== undefined && event.button !== 0) return
    if (event.pointerType && event.isPrimary === false) return
    if (claimed.has(event) || insideControl(host, event.target)) return
    const ownerWindow = host.ownerDocument.defaultView
    if (!ownerWindow) return
    claimed.add(event)
    // The same pointer pressing again after a lost release starts a new contact; another pointer waits.
    const running = contacts.get(host)
    if (running && running.pointerId !== event.pointerId) return
    running?.finish()
    follow(ownerWindow, host, event, handlers)
  }

  /**
   * Follows the pointer that pressed a drag host until it is released or the
   * contact is interrupted.
   *
   * @param ownerWindow - The window of the host's document.
   * @param host - The drag host pressed.
   * @param event - The `pointerdown`.
   * @param handlers - What the host reports about the contact.
   */
  function follow(
    ownerWindow: Window,
    host: HTMLElement,
    event: PointerEvent,
    handlers: DragHandlers,
  ): void {
    const { pointerId } = event
    const startX = event.clientX
    const touch = event.pointerType === 'touch'
    /** Whether the contact was taken: only then does its end reach the host. */
    let acquired = false
    let captured = false

    /**
     * Removes what the contact listens to, then tells the host how it ended.
     *
     * @param released - The `pointerup`, when the pointer was released.
     */
    function finish(released?: PointerEvent): void {
      if (contacts.get(host) !== contact) return
      contacts.delete(host)
      ownerWindow.removeEventListener('pointermove', move, true)
      ownerWindow.removeEventListener('pointerup', up, true)
      ownerWindow.removeEventListener('pointercancel', canceled, true)
      ownerWindow.removeEventListener('touchmove', preventScroll)
      ownerWindow.removeEventListener('blur', interrupt)
      host.removeEventListener('lostpointercapture', canceled)
      if (captured && host.releasePointerCapture) {
        try {
          host.releasePointerCapture(pointerId)
        } catch (_error) {
          // The browser can release capture before it tells the host, which then owns nothing to release.
        }
      }
      if (!acquired) return
      if (released) handlers.onEnd(released.clientX - startX)
      else handlers.onCancel()
    }

    const contact: Contact = { pointerId, finish }

    /**
     * Takes the contact and tells the host.
     */
    function acquire(): void {
      if (host.setPointerCapture && Number.isFinite(pointerId)) {
        try {
          host.setPointerCapture(pointerId)
          captured = true
        } catch (_error) {
          // A browser may reject capture for a contact it no longer tracks. The window listens too.
        }
      }
      acquired = true
      handlers.onStart()
    }

    /**
     * Reports the contact's movement.
     *
     * @param sample - The `pointermove`.
     */
    function move(sample: PointerEvent): void {
      if (sample.pointerId !== pointerId || !acquired) return
      handlers.onMove(sample.clientX - startX)
    }

    /**
     * Keeps the page from scrolling the touch contact the lane owns.
     *
     * @param touchEvent - The `touchmove`.
     */
    function preventScroll(touchEvent: TouchEvent): void {
      if (touchEvent.touches.length !== 1 || !touchEvent.touches[0]) return
      if (acquired && touchEvent.cancelable) touchEvent.preventDefault()
    }

    /**
     * Ends the contact at its release.
     *
     * @param sample - The `pointerup`.
     */
    function up(sample: PointerEvent): void {
      if (sample.pointerId === pointerId) finish(sample)
    }

    /**
     * Ends the contact when the browser takes its pointer back.
     *
     * @param sample - The `pointercancel` or `lostpointercapture` event.
     */
    function canceled(sample: Event): void {
      if (('pointerId' in sample ? sample.pointerId : undefined) === pointerId) finish()
    }

    /** Ends the contact without a release, when the window loses the focus. */
    function interrupt(): void {
      finish()
    }

    contacts.set(host, contact)
    // The window listens in the capture phase, so nothing below can keep the contact's end from reaching it.
    ownerWindow.addEventListener('pointermove', move, true)
    ownerWindow.addEventListener('pointerup', up, true)
    ownerWindow.addEventListener('pointercancel', canceled, true)
    ownerWindow.addEventListener('blur', interrupt)
    host.addEventListener('lostpointercapture', canceled)
    if (touch) ownerWindow.addEventListener('touchmove', preventScroll, { passive: false })
    acquire()
  }

  return { press, cancel }
}
