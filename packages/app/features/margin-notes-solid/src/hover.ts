/**
 * Hover routing for the margin-notes elements. React's `MarginNotes` renders its
 * blocks and notes with the React kit's element, which routes the pointer and the
 * mouse enter/leave of one element through a single transition; the Solid port
 * makes the same transitions, so the same contact hovers in both.
 *
 * @module
 */

/** Where one element's hover stands: inside or out, and whether a touch pointer last moved it. */
interface HoverState {
  inside: boolean
  fromTouch: boolean
}

/** The hover state of each element that reported an enter or a leave. */
const hoverStates = new WeakMap<EventTarget, HoverState>()

/**
 * Whether an element's hover changed with this event. Whichever of the pointer
 * and the mouse stream arrives first makes the transition and the other repeats
 * nothing. A touch contact never hovers, nor does the mouse event a browser
 * raises after one, until a real pointer (a mouse, a pen) enters.
 *
 * @param event - The enter or the leave, on the element it happened to.
 * @param entered - Whether it is an entry.
 * @returns Whether the element's hover changed.
 */
function hoverChanged(event: Event, entered: boolean): boolean {
  const element = event.currentTarget
  if (!(element instanceof Element)) return false
  const state = hoverStates.get(element) ?? { inside: false, fromTouch: false }
  hoverStates.set(element, state)
  if ('pointerType' in event) {
    state.fromTouch = event.pointerType === 'touch'
    if (state.fromTouch) return false
  } else if (state.fromTouch) {
    return false
  }
  if (state.inside === entered) return false
  state.inside = entered
  return true
}

/**
 * A pointer or mouse enter/leave handler that runs its transition when the
 * event is a real hover (a touch contact is not one).
 *
 * @param entered - Whether the event reports an entry.
 * @param run - What the transition does.
 * @returns The event handler.
 */
export function hover(entered: boolean, run: () => void): (event: Event) => void {
  return (event) => {
    if (hoverChanged(event, entered)) run()
  }
}
