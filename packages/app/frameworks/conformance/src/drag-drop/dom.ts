/**
 * The browser APIs `@dnd-kit/dom` calls that jsdom lacks, for the tests of the
 * `@molecule/app-drag-drop-dndkit-*` bindings.
 *
 * jsdom has no layout, animations or observers. `@dnd-kit/dom` needs
 * `matchMedia`, `getAnimations`/`animate`, and Resize/IntersectionObserver
 * (without callbacks its droppables never register), and its listeners take
 * an `AbortSignal` that must be jsdom's own. With these a drag can be picked
 * up, cancelled and dropped with the keyboard, which is what announces and
 * changes attributes. Moving a dragged item needs real layout, so arrow-key
 * movement is checked in a browser, not here.
 *
 * @module
 */

/**
 * A finished, inert `Animation`, which is all `@dnd-kit/dom`'s feedback waits on.
 * jsdom has no `Animation` class to construct, so this test double carries only
 * the members dnd-kit reads and is typed as the interface it stands in for.
 *
 * @returns The animation.
 */
function finishedAnimation(): Animation {
  const animation = {
    finished: Promise.resolve(),
    cancel(): void {},
    finish(): void {},
    pause(): void {},
    play(): void {},
    commitStyles(): void {},
    addEventListener(): void {},
    removeEventListener(): void {},
    onfinish: null,
    playState: 'finished',
    effect: null,
  }
  return animation as unknown as Animation
}

/** An observer that reports each observed element once, with its current rect. */
class ReportingResizeObserver implements ResizeObserver {
  /**
   * Creates the observer.
   *
   * @param callback - Called with one entry per observed element.
   */
  constructor(private readonly callback: ResizeObserverCallback) {}

  /**
   * Reports `target` on the next microtask.
   *
   * @param target - The observed element.
   */
  observe(target: Element): void {
    queueMicrotask(() =>
      this.callback(
        [
          {
            target,
            contentRect: target.getBoundingClientRect(),
            borderBoxSize: [],
            contentBoxSize: [],
            devicePixelContentBoxSize: [],
          },
        ],
        this,
      ),
    )
  }

  /** Does nothing: nothing is tracked after the first report. */
  unobserve(): void {}

  /** Does nothing: nothing is tracked after the first report. */
  disconnect(): void {}
}

/** An observer that reports each observed element once, as fully visible. */
class ReportingIntersectionObserver implements IntersectionObserver {
  readonly root = null
  readonly rootMargin = '0px'
  readonly scrollMargin = '0px'
  readonly thresholds = [0]

  /**
   * Creates the observer.
   *
   * @param callback - Called with one entry per observed element.
   */
  constructor(private readonly callback: IntersectionObserverCallback) {}

  /**
   * Reports `target` as intersecting on the next microtask.
   *
   * @param target - The observed element.
   */
  observe(target: Element): void {
    queueMicrotask(() => {
      const rect = target.getBoundingClientRect()
      this.callback(
        [
          {
            target,
            isIntersecting: true,
            intersectionRatio: 1,
            boundingClientRect: rect,
            intersectionRect: rect,
            rootBounds: null,
            time: 0,
          },
        ],
        this,
      )
    })
  }

  /** Does nothing: nothing is tracked after the first report. */
  unobserve(): void {}

  /** Does nothing: nothing is tracked after the first report. */
  disconnect(): void {}

  /**
   * Takes the entries not yet delivered: there are none, since each is reported at once.
   *
   * @returns No pending entries.
   */
  takeRecords(): IntersectionObserverEntry[] {
    return []
  }
}

/**
 * Installs the stand-ins on the current jsdom `window`. Call it once per test
 * file, before rendering a sortable list. Idempotent.
 */
export function installDndKitDom(): void {
  const win = globalThis.window
  if (!win) throw new Error('installDndKitDom needs a jsdom window (vitest environment "jsdom").')
  Object.assign(globalThis, {
    AbortController: win.AbortController,
    AbortSignal: win.AbortSignal,
    ResizeObserver: ReportingResizeObserver,
    IntersectionObserver: ReportingIntersectionObserver,
  })
  if (!('PointerEvent' in globalThis)) Object.assign(globalThis, { PointerEvent: win.MouseEvent })
  win.matchMedia ??= (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener(): void {},
      removeEventListener(): void {},
      addListener(): void {},
      removeListener(): void {},
      dispatchEvent: () => false,
    }) as MediaQueryList
  document.getAnimations ??= () => []
  win.Element.prototype.getAnimations ??= () => []
  win.Element.prototype.animate ??= finishedAnimation
}

/**
 * Presses a key on an element the way a keyboard does: `keydown` with the
 * `key` and `code` dnd-kit's keyboard sensor reads.
 *
 * @param element - The focused element.
 * @param code - The `KeyboardEvent.code` (`'Space'`, `'Escape'`, `'ArrowDown'`, …).
 */
export function pressKey(element: Element, code: string): void {
  const key = code === 'Space' ? ' ' : code
  element.dispatchEvent(
    new KeyboardEvent('keydown', { key, code, bubbles: true, cancelable: true }),
  )
}

/**
 * Waits for dnd-kit's scheduled work (effects, observers and announcements,
 * which it defers to timers).
 *
 * @param ms - How long to wait. Defaults to 50 ms.
 * @returns A promise that resolves after `ms`.
 */
export function settleDndKit(ms = 50): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * The live-region text dnd-kit's accessibility plugin last announced.
 *
 * @returns The announcement, or `''` when there is no live region.
 */
export function dndKitAnnouncement(): string {
  const region = document.querySelector('[role="status"][aria-live]')
  return region?.textContent?.trim() ?? ''
}
