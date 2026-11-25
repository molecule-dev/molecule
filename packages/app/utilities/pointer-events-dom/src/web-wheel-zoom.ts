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
    if (!onStep || !('ctrlKey' in event) || !event.ctrlKey || !('deltaY' in event)) return
    const delta = event.deltaY
    if (typeof delta !== 'number' || !Number.isFinite(delta) || delta === 0) return
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
