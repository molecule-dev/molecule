import type { ElementZoomPoint, ElementZoomSample } from '@molecule/app-ui'

type PinchSample = Extract<ElementZoomSample, { kind: 'pinch' }>
type Pair = { at: ElementZoomPoint; distance: number }

/**
 * Tracks the first two accepted contacts in insertion order.
 *
 * @param frame - The untransformed outer frame.
 * @param owner - The window that receives captured movement and termination.
 * @param callbacks - Ownership transitions and incremental pinch samples.
 * @returns Adds accepted presses or cancels the touch sequence.
 */
export function trackWebPinch(
  frame: Element,
  owner: Window,
  callbacks: {
    takeOver(): void
    resume(remaining: PointerEvent, event: PointerEvent): void
    zoom(sample: PinchSample): void
    close(cancelDrag: boolean): void
  },
): { add(event: PointerEvent): void; cancel(): void } {
  const contacts = new Map<number, PointerEvent>()
  let previous: Pair | undefined
  let rebased: PointerEvent | undefined

  /** Measures the pair in the current outer frame. */
  function measure(first: PointerEvent, second: PointerEvent): Pair {
    const { left, top } = frame.getBoundingClientRect()
    return {
      at: {
        x: (first.clientX + second.clientX) / 2 - left,
        y: (first.clientY + second.clientY) / 2 - top,
      },
      distance: Math.hypot(first.clientX - second.clientX, first.clientY - second.clientY),
    }
  }

  /** Delivers pair movement or resumes the rebased drag. */
  function move(event: PointerEvent): void {
    if (!contacts.has(event.pointerId)) return
    contacts.set(event.pointerId, event)
    const [first, second] = contacts.values()
    if (!second && rebased) {
      const origin = rebased
      rebased = undefined
      callbacks.resume(origin, event)
    }
    if (!first || !second || (event !== first && event !== second)) return
    const next = measure(first, second)
    const from = previous
    previous = next
    if (!from || !(from.distance > 0) || !(next.distance > 0)) return
    const factor = next.distance / from.distance
    if (factor !== 1 || from.at.x !== next.at.x || from.at.y !== next.at.y) {
      callbacks.zoom({ kind: 'pinch', from: from.at, at: next.at, factor })
    }
  }

  /** Rebases only when a member of the owned pair lifts. */
  function up(event: PointerEvent): void {
    const [first, second] = contacts.values()
    if (!contacts.delete(event.pointerId)) return
    const [remaining, substitute] = contacts.values()
    if (!remaining) finish(false)
    else if (
      second &&
      (first?.pointerId === event.pointerId || second.pointerId === event.pointerId)
    ) {
      previous = substitute ? measure(remaining, substitute) : undefined
      rebased = substitute ? undefined : remaining
    }
  }

  /** Interrupts the sequence if the browser cancels an owned contact. */
  function interrupt(event: PointerEvent): void {
    if (contacts.has(event.pointerId)) finish(true)
  }

  /** Cancels the touch sequence through the owner. */
  function cancel(): void {
    finish(true)
  }

  /** Removes all observers before notifying the owner. */
  function finish(cancelDrag: boolean): void {
    contacts.clear()
    owner.removeEventListener('pointermove', move, true)
    owner.removeEventListener('pointerup', up, true)
    owner.removeEventListener('pointercancel', interrupt, true)
    owner.removeEventListener('lostpointercapture', interrupt, true)
    owner.removeEventListener('blur', cancel)
    callbacks.close(cancelDrag)
  }

  owner.addEventListener('pointermove', move, true)
  owner.addEventListener('pointerup', up, true)
  owner.addEventListener('pointercancel', interrupt, true)
  owner.addEventListener('lostpointercapture', interrupt, true)
  owner.addEventListener('blur', cancel)

  return {
    add(event) {
      if (contacts.has(event.pointerId)) return
      contacts.set(event.pointerId, event)
      if (contacts.size !== 2) return
      const [first, second] = contacts.values()
      if (!first || !second) return
      previous = measure(first, second)
      rebased = undefined
      callbacks.takeOver()
    },
    cancel,
  }
}
