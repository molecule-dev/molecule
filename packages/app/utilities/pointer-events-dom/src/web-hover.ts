/** The fields needed to distinguish pointer and compatibility mouse events. */
interface HoverEvent {
  readonly type: string
  readonly pointerType?: string
}

/**
 * Creates one enter/leave transition for a host. Touch and its compatibility
 * mouse events never hover. A later mouse or pen pointer resumes hover.
 *
 * @returns A function that reports whether an event changes the host's hover state.
 */
export function createWebHover(): (entered: boolean, event: HoverEvent) => boolean {
  let inside = false
  let fromTouch = false

  return (entered, event) => {
    if ('pointerType' in event || event.type.startsWith('pointer')) {
      fromTouch = event.pointerType === 'touch'
      if (fromTouch) return false
    } else if (fromTouch) {
      return false
    }
    if (inside === entered) return false
    inside = entered
    return true
  }
}

/** Callbacks for the shared hover transition. */
export interface WebHoverHandlers {
  /** Runs when a mouse or pen enters the host. */
  onEnter?: (event: MouseEvent) => void
  /** Runs when the hovering mouse or pen leaves the host. */
  onLeave?: (event: MouseEvent) => void
}

/** The lifecycle of a hover attached to a DOM element. */
export interface WebHoverBinding {
  /**
   * Updates the callbacks. Pass undefined to disable hover.
   *
   * @param handlers - The current hover callbacks.
   */
  update(handlers: WebHoverHandlers | undefined): void
  /** Removes the event listeners. */
  destroy(): void
}

const enterEvents = [
  'pointerover',
  'pointerenter',
  'mouseover',
  'mouseenter',
] satisfies (keyof GlobalEventHandlersEventMap)[]
const leaveEvents = [
  'pointerout',
  'pointerleave',
  'mouseout',
  'mouseleave',
] satisfies (keyof GlobalEventHandlersEventMap)[]

/**
 * Binds shared hover to a DOM element. The bubbling over/out events and the
 * direct enter/leave events use the same transition. Moving between a host's
 * descendants leaves its hover state alone.
 *
 * @param host - The HTML or SVG element that receives hover.
 * @param initialHandlers - The callbacks to use until the first update.
 * @returns The binding to update or destroy with the host.
 */
export function bindWebHover(
  host: HTMLElement | SVGElement,
  initialHandlers?: WebHoverHandlers,
): WebHoverBinding {
  const target: GlobalEventHandlers = host
  const transition = createWebHover()
  let handlers: WebHoverHandlers | undefined

  const route =
    (entered: boolean) =>
    (event: MouseEvent): void => {
      const Node = host.ownerDocument.defaultView?.Node
      if (Node && event.relatedTarget instanceof Node && host.contains(event.relatedTarget)) return
      if (!transition(entered, event)) return
      if (entered) handlers?.onEnter?.(event)
      else handlers?.onLeave?.(event)
    }
  const enter = route(true)
  const leave = route(false)

  /**
   * Updates the callbacks and subscribes only while at least one is active.
   *
   * @param next - The current callbacks.
   */
  function update(next: WebHoverHandlers | undefined): void {
    const wasEnabled = Boolean(handlers?.onEnter || handlers?.onLeave)
    const enabled = Boolean(next?.onEnter || next?.onLeave)
    handlers = next
    if (enabled === wasEnabled) return

    if (enabled) {
      for (const type of enterEvents) target.addEventListener(type, enter)
      for (const type of leaveEvents) target.addEventListener(type, leave)
    } else {
      for (const type of enterEvents) target.removeEventListener(type, enter)
      for (const type of leaveEvents) target.removeEventListener(type, leave)
    }
  }

  update(initialHandlers)
  return { update, destroy: () => update(undefined) }
}
