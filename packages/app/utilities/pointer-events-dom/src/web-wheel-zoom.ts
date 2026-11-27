import type { ElementZoom, ElementZoomSample } from '@molecule/app-ui'

const claimed = new WeakSet<Event>()

/** Called with the direction of one Ctrl-wheel step. */
export type WebWheelZoomHandler = (direction: 'in' | 'out') => void

/** The lifecycle of the Ctrl-wheel shortcut on a surface. */
export interface WebWheelZoomBinding {
  /**
   * Updates the callback. Pass undefined to leave wheel input to the browser.
   *
   * @param onStep - The current zoom callback.
   */
  update(onStep: WebWheelZoomHandler | undefined): void
  /** Removes the wheel listener. */
  destroy(): void
}

/**
 * Listens non-passively for Ctrl-wheel with a finite, nonzero vertical delta.
 * The handled event is consumed so the browser leaves page zoom alone.
 *
 * @param host - The surface receiving wheel events. A handle without DOM listeners is inert.
 * @param initialStep - The zoom callback to use until the first update.
 * @returns The binding to update or destroy with the host.
 */
export function bindWebWheelZoom(
  host: Partial<EventTarget>,
  initialStep?: WebWheelZoomHandler,
): WebWheelZoomBinding {
  let onStep: WebWheelZoomHandler | undefined

  const wheel = (event: Event): void => {
    if (
      !onStep ||
      claimed.has(event) ||
      event.defaultPrevented ||
      !('ctrlKey' in event) ||
      !event.ctrlKey ||
      !('deltaY' in event)
    )
      return
    const delta = event.deltaY
    if (typeof delta !== 'number' || !Number.isFinite(delta) || delta === 0) return
    claimed.add(event)
    event.preventDefault()
    onStep(delta < 0 ? 'in' : 'out')
  }

  /**
   * Updates the callback and attaches or removes the listener when enabled changes.
   *
   * @param next - The current zoom callback.
   */
  function update(next: WebWheelZoomHandler | undefined): void {
    const wasEnabled = Boolean(onStep)
    onStep = next
    if (!host.addEventListener || !host.removeEventListener) return
    if (next && !wasEnabled) host.addEventListener('wheel', wheel, { passive: false })
    else if (!next && wasEnabled) host.removeEventListener('wheel', wheel)
  }

  update(initialStep)
  return { update, destroy: () => update(undefined) }
}

/**
 * Binds a non-passive focal wheel listener to a gesture surface.
 *
 * @param host - The wheel event host.
 * @param frame - Reads the untransformed outer frame after the host mounts.
 * @param current - Reads the enabled zoom callback when the surface is free to accept a wheel.
 * @returns Removes the wheel listener.
 */
export function bindWebFocalWheelZoom(
  host: Element,
  frame: () => Element,
  current: () => ElementZoom | undefined,
): () => void {
  const wheel = (event: Event): void => {
    const Wheel = host.ownerDocument.defaultView?.WheelEvent
    const zoom = current()
    if (
      !zoom ||
      !Wheel ||
      zoom.wheel === 'off' ||
      claimed.has(event) ||
      event.defaultPrevented ||
      !(event instanceof Wheel) ||
      (zoom.wheel === 'ctrl' && !event.ctrlKey)
    )
      return
    // Read the unit before the delta. Some browsers choose compatibility units at access time.
    const { deltaMode, deltaY, clientX, clientY } = event
    if (
      (deltaMode !== 0 && deltaMode !== 1 && deltaMode !== 2) ||
      !Number.isFinite(deltaY) ||
      deltaY === 0 ||
      !Number.isFinite(clientX) ||
      !Number.isFinite(clientY)
    )
      return
    const { left, top } = frame().getBoundingClientRect()
    const sample: ElementZoomSample = {
      kind: 'wheel',
      at: { x: clientX - left, y: clientY - top },
      deltaY,
      deltaMode,
    }
    claimed.add(event)
    event.preventDefault()
    zoom.onZoom(sample)
  }
  host.addEventListener('wheel', wheel, { passive: false })
  return () => host.removeEventListener('wheel', wheel)
}
