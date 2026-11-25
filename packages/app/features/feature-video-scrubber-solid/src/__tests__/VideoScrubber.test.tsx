// @vitest-environment jsdom
/**
 * Unit tests for the Solid `VideoScrubber` — a port of
 * `@molecule/app-feature-video-scrubber-react/src/__tests__/VideoScrubber.test.tsx`:
 * the same test names and the same behavioral assertions, rendered with Solid's
 * browser renderer in jsdom and asserted on the DOM the component produces.
 *
 * @module
 */

import { createStore, produce } from 'solid-js/store'
import { render as renderSolid } from 'solid-js/web'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setClassMap, type UIClassMap } from '@molecule/app-ui'

import type { Thumbnail, VideoScrubberProps } from '../types.js'
import {
  computeFilmstripTicks,
  formatFrameNumber,
  frameToTime,
  selectClosestThumbnail,
  snapTimeToFrame,
  timeToFrame,
  VideoScrubber,
} from '../VideoScrubber.jsx'

/**
 * Build a UIClassMap stub via Proxy (any token resolves to its name).
 *
 * @returns A stub UIClassMap suitable for tests.
 */
function buildStubClassMap(): UIClassMap {
  const handler: ProxyHandler<UIClassMap> = {
    get(_target, prop): unknown {
      if (prop === 'cn') {
        return (...classes: unknown[]): string =>
          classes.filter((c) => typeof c === 'string' && c.length > 0).join(' ')
      }
      const token = String(prop)
      const fn = (..._args: unknown[]): string => token
      return new Proxy(fn, {
        get(_t, key) {
          if (key === Symbol.toPrimitive || key === 'toString') return () => token
          return undefined
        },
      })
    },
  }
  return new Proxy({} as UIClassMap, handler)
}

/** Teardown callbacks for the views rendered by a test. */
const disposers: Array<() => void> = []

/**
 * Renders a {@link VideoScrubber} with Solid's browser renderer.
 *
 * @param props - The scrubber props.
 * @returns The container element holding the rendered component.
 */
function render(props: VideoScrubberProps): HTMLElement {
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(renderSolid(() => <VideoScrubber {...props} />, container))
  return container
}

/** A scrubber whose props a test can change while it stays mounted. */
interface LiveView {
  /** The container element holding the rendered component. */
  readonly container: HTMLElement
  /** Changes props and lets Solid apply the change. */
  set(next: Partial<VideoScrubberProps>): Promise<void>
  /** Unmounts the scrubber; the test's teardown then leaves it alone. */
  unmount(): Promise<void>
}

/**
 * Renders a {@link VideoScrubber} whose props a test can change while it stays mounted.
 *
 * @param props - The scrubber props.
 * @returns The container, a way to change props and a way to unmount early.
 */
function renderLive(props: VideoScrubberProps): LiveView {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const [state, setState] = createStore(props)
  const dispose = renderSolid(() => <VideoScrubber {...state} />, container)
  disposers.push(dispose)
  return {
    container,
    set: async (next) => {
      // A function set straight into the store would run as the setter of the next value.
      setState(
        produce((draft) => {
          Object.assign(draft, next)
        }),
      )
    },
    unmount: async () => {
      dispose()
      disposers.splice(disposers.indexOf(dispose), 1)
    },
  }
}

/**
 * Dispatch a real `PointerEvent` so the component's listeners pick it up.
 *
 * @param target - Target element or window.
 * @param type - Pointer event type.
 * @param init - Pointer init properties.
 */
function dispatchPointer(
  target: Element | Window,
  type: 'pointerdown' | 'pointermove' | 'pointerup' | 'pointercancel' | 'lostpointercapture',
  init: {
    clientX?: number
    clientY?: number
    pointerId?: number
    button?: number
    pointerType?: string
    isPrimary?: boolean
  },
): void {
  const event = new Event(type, { bubbles: true, cancelable: true }) as Event & {
    clientX: number
    clientY: number
    pointerId: number
    button: number
    pointerType?: string
    isPrimary?: boolean
  }
  event.clientX = init.clientX ?? 0
  event.clientY = init.clientY ?? 0
  event.pointerId = init.pointerId ?? 1
  event.button = init.button ?? 0
  // A real pointer event always carries both; a test that leaves them out dispatches the
  // device-less event React's own suite does.
  if (init.pointerType !== undefined) event.pointerType = init.pointerType
  if (init.isPrimary !== undefined) event.isPrimary = init.isPrimary
  target.dispatchEvent(event)
}

/**
 * The strip of a rendered scrubber, laid out as a 100 px box starting at x = 10, so
 * `clientX` 30, 50, 60 and 80 seek to 2, 4, 5 and 7 seconds of a 10 s scrubber.
 *
 * @param container - The rendered scrubber's container.
 * @returns The strip.
 */
function seekableStrip(container: HTMLElement): HTMLElement {
  const strip = container.querySelector('[data-mol-id="video-scrubber-strip"]')
  if (!strip) throw new Error('strip missing')
  strip.getBoundingClientRect = () => new DOMRect(10, 20, 100, 40)
  return strip
}

/**
 * Dispatch a cancelable single-finger `touchmove` on the window.
 *
 * @param clientX - The finger's horizontal position.
 * @param clientY - The finger's vertical position.
 * @returns Whether a listener consumed it.
 */
function dispatchTouchMove(clientX: number, clientY: number): boolean {
  const scroll = new Event('touchmove', { bubbles: true, cancelable: true })
  Object.defineProperty(scroll, 'touches', { value: [{ clientX, clientY }] })
  window.dispatchEvent(scroll)
  return scroll.defaultPrevented
}

const baseThumbnails: Thumbnail[] = [
  { time: 0, src: 'a.png' },
  { time: 5, src: 'b.png' },
  { time: 10, src: 'c.png' },
  { time: 20, src: 'd.png' },
]

beforeEach(() => {
  setClassMap(buildStubClassMap())
  setProvider(createSimpleI18nProvider('en'))
})

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
  document.body.innerHTML = ''
})

describe('timeToFrame', () => {
  it('rounds to the nearest integer frame', () => {
    expect(timeToFrame(0, 24)).toBe(0)
    expect(timeToFrame(1, 24)).toBe(24)
    expect(timeToFrame(0.5, 24)).toBe(12)
    // 0.041 * 24 = 0.984 → 1
    expect(timeToFrame(0.041, 24)).toBe(1)
  })

  it('returns 0 for non-finite or non-positive inputs', () => {
    expect(timeToFrame(Number.NaN, 24)).toBe(0)
    expect(timeToFrame(Number.POSITIVE_INFINITY, 24)).toBe(0)
    expect(timeToFrame(-1, 24)).toBe(0)
    expect(timeToFrame(1, 0)).toBe(0)
    expect(timeToFrame(1, -10)).toBe(0)
  })
})

describe('frameToTime', () => {
  it('converts frame index back to seconds', () => {
    expect(frameToTime(0, 24)).toBe(0)
    expect(frameToTime(24, 24)).toBe(1)
    expect(frameToTime(12, 24)).toBe(0.5)
  })

  it('returns 0 for invalid inputs', () => {
    expect(frameToTime(-1, 24)).toBe(0)
    expect(frameToTime(10, 0)).toBe(0)
    expect(frameToTime(Number.NaN, 24)).toBe(0)
  })

  it('round-trips with timeToFrame at frame boundaries', () => {
    for (const sec of [0, 0.5, 1, 1.5, 2.25]) {
      expect(frameToTime(timeToFrame(sec, 24), 24)).toBeCloseTo(sec, 5)
    }
  })
})

describe('snapTimeToFrame', () => {
  it('snaps to the nearest frame boundary', () => {
    // 0.04 * 24 = 0.96 → frame 1 → 1/24 ≈ 0.0417
    expect(snapTimeToFrame(0.04, 24, 60)).toBeCloseTo(1 / 24, 5)
  })

  it('clamps below zero to zero', () => {
    expect(snapTimeToFrame(-1, 24, 60)).toBe(0)
  })

  it('clamps above duration to the duration frame', () => {
    expect(snapTimeToFrame(120, 24, 60)).toBe(60)
  })

  it('handles zero/negative duration safely', () => {
    expect(snapTimeToFrame(5, 24, 0)).toBe(0)
    expect(snapTimeToFrame(5, 24, -1)).toBe(0)
  })
})

describe('computeFilmstripTicks', () => {
  it('returns count ticks from 0 to duration with even spacing', () => {
    const ticks = computeFilmstripTicks(60, 6)
    expect(ticks.length).toBe(6)
    expect(ticks[0]).toEqual({ time: 0, position: 0 })
    expect(ticks[5]!.time).toBeCloseTo(60, 5)
    expect(ticks[5]!.position).toBeCloseTo(1, 5)
    // Even spacing
    for (let i = 1; i < ticks.length; i++) {
      expect(ticks[i]!.position - ticks[i - 1]!.position).toBeCloseTo(1 / 5, 5)
    }
  })

  it('returns one tick at zero when count is 1', () => {
    expect(computeFilmstripTicks(60, 1)).toEqual([{ time: 0, position: 0 }])
  })

  it('clamps non-positive counts to 1', () => {
    expect(computeFilmstripTicks(60, 0).length).toBe(1)
    expect(computeFilmstripTicks(60, -5).length).toBe(1)
  })

  it('clamps absurd counts to a safe upper bound', () => {
    expect(computeFilmstripTicks(60, 100000).length).toBe(1000)
  })

  it('produces zero-time ticks across a non-positive duration', () => {
    const ticks = computeFilmstripTicks(0, 4)
    expect(ticks.length).toBe(4)
    for (const t of ticks) expect(t.time).toBe(0)
  })
})

describe('selectClosestThumbnail', () => {
  it('returns the thumbnail nearest the target time', () => {
    expect(selectClosestThumbnail(baseThumbnails, 0)?.src).toBe('a.png')
    expect(selectClosestThumbnail(baseThumbnails, 4)?.src).toBe('b.png')
    expect(selectClosestThumbnail(baseThumbnails, 7)?.src).toBe('b.png')
    expect(selectClosestThumbnail(baseThumbnails, 8)?.src).toBe('c.png')
    expect(selectClosestThumbnail(baseThumbnails, 100)?.src).toBe('d.png')
  })

  it('breaks ties toward the earlier thumbnail', () => {
    // 7.5 is equidistant from 5 and 10; tie should prefer the first-seen (b).
    expect(selectClosestThumbnail(baseThumbnails, 7.5)?.src).toBe('b.png')
  })

  it('returns undefined for empty input', () => {
    expect(selectClosestThumbnail([], 5)).toBeUndefined()
  })
})

describe('formatFrameNumber', () => {
  it('prepends a hash and rounds to integer', () => {
    expect(formatFrameNumber(0)).toBe('#0')
    expect(formatFrameNumber(42)).toBe('#42')
    expect(formatFrameNumber(12.4)).toBe('#12')
    expect(formatFrameNumber(12.6)).toBe('#13')
  })

  it('clamps below zero to #0', () => {
    expect(formatFrameNumber(-5)).toBe('#0')
  })
})

describe('<VideoScrubber>', () => {
  it('renders the configured number of filmstrip cells', () => {
    const container = render({ duration: 60, currentTime: 0, thumbnailCount: 8 })
    const cells = container.querySelectorAll('[data-mol-id="video-scrubber-cell"]')
    expect(cells.length).toBe(8)
  })

  it('positions the playhead at currentTime / duration as a percentage', () => {
    const container = render({ duration: 60, currentTime: 15 })
    const playhead = container.querySelector<HTMLElement>('[data-mol-id="video-scrubber-playhead"]')
    expect(playhead?.style.left).toBe('25%') // 15 / 60
  })

  it('clamps the playhead percentage to at most 100%', () => {
    const container = render({ duration: 60, currentTime: 120 })
    const playhead = container.querySelector<HTMLElement>('[data-mol-id="video-scrubber-playhead"]')
    expect(playhead?.style.left).toBe('100%')
  })

  it('shows the frame readout by default and exposes the current frame in data-frame', () => {
    const container = render({ duration: 60, currentTime: 1, fps: 24 })
    const root = container.querySelector('[data-mol-id="video-scrubber"]')
    expect(root?.getAttribute('data-frame')).toBe('24') // 1s * 24fps = 24
    const readout = container.querySelector('[data-mol-id="video-scrubber-frame-current"]')
    expect(readout?.textContent).toBe('#24')
  })

  it('hides the frame readout when showFrameNumber is false', () => {
    const container = render({ duration: 60, currentTime: 1, fps: 24, showFrameNumber: false })
    expect(container.querySelector('[data-mol-id="video-scrubber-frame-readout"]')).toBeNull()
  })

  it('uses the closest thumbnail src as the cell background', () => {
    const container = render({
      duration: 60,
      currentTime: 0,
      thumbnailCount: 3,
      thumbnails: baseThumbnails,
    })
    const cells = container.querySelectorAll<HTMLElement>('[data-mol-id="video-scrubber-cell"]')
    // 3 cells across 60s: times 0, 30, 60 → closest = a.png, d.png, d.png
    expect(cells[0]!.style.backgroundImage).toContain('a.png')
    expect(cells[1]!.style.backgroundImage).toContain('d.png')
    expect(cells[2]!.style.backgroundImage).toContain('d.png')
  })

  it('emits a frame-snapped time on click-anywhere seek', () => {
    const onSeek = vi.fn()
    const container = render({ duration: 60, currentTime: 0, fps: 24, onSeek })
    const strip = container.querySelector<HTMLElement>('[data-mol-id="video-scrubber-strip"]')
    expect(strip).not.toBeNull()
    if (!strip) return
    strip.getBoundingClientRect = () =>
      ({
        left: 0,
        top: 0,
        right: 1000,
        bottom: 48,
        width: 1000,
        height: 48,
        x: 0,
        y: 0,
        toJSON() {},
      }) as DOMRect
    // Click at 50% (clientX=500) of a 60s scrubber → 30s.
    // 30s * 24fps = frame 720 → 720 / 24 = 30s exact.
    dispatchPointer(strip, 'pointerdown', { clientX: 500, pointerId: 1 })
    expect(onSeek).toHaveBeenCalled()
    const arg = onSeek.mock.calls[0]![0] as number
    expect(arg).toBeCloseTo(30, 5)
  })

  it('clamps onSeek argument into [0, duration]', () => {
    const onSeek = vi.fn()
    const container = render({ duration: 10, currentTime: 0, fps: 24, onSeek })
    const strip = container.querySelector<HTMLElement>('[data-mol-id="video-scrubber-strip"]')
    if (!strip) throw new Error('strip missing')
    strip.getBoundingClientRect = () =>
      ({
        left: 0,
        top: 0,
        right: 100,
        bottom: 48,
        width: 100,
        height: 48,
        x: 0,
        y: 0,
        toJSON() {},
      }) as DOMRect
    // Way past the right edge.
    dispatchPointer(strip, 'pointerdown', { clientX: 9999, pointerId: 1 })
    expect(onSeek).toHaveBeenLastCalledWith(10)
    dispatchPointer(strip, 'pointerup', { clientX: 9999, pointerId: 1 })
    // Way before the left edge.
    dispatchPointer(strip, 'pointerdown', { clientX: -500, pointerId: 2 })
    expect(onSeek).toHaveBeenLastCalledWith(0)
  })

  it('continues to scrub on pointermove while dragging', () => {
    const onSeek = vi.fn()
    const container = render({ duration: 60, currentTime: 0, fps: 24, onSeek })
    const strip = container.querySelector<HTMLElement>('[data-mol-id="video-scrubber-strip"]')
    if (!strip) throw new Error('strip missing')
    strip.getBoundingClientRect = () =>
      ({
        left: 0,
        top: 0,
        right: 1000,
        bottom: 48,
        width: 1000,
        height: 48,
        x: 0,
        y: 0,
        toJSON() {},
      }) as DOMRect
    dispatchPointer(strip, 'pointerdown', { clientX: 100, pointerId: 1 })
    dispatchPointer(strip, 'pointermove', { clientX: 300, pointerId: 1 })
    dispatchPointer(strip, 'pointerup', { clientX: 300, pointerId: 1 })
    expect(onSeek.mock.calls.length).toBeGreaterThanOrEqual(2)
  })

  it('keeps frame snapping outside the strip until the initiating contact ends', () => {
    const onSeek = vi.fn()
    const container = render({ duration: 10, currentTime: 0, fps: 24, onSeek })
    const strip = container.querySelector('[data-mol-id="video-scrubber-strip"]')
    if (!strip) throw new Error('strip missing')
    strip.getBoundingClientRect = () => new DOMRect(10, 20, 100, 40)
    dispatchPointer(strip, 'pointerdown', { clientX: 30, pointerId: 1 })
    dispatchPointer(window, 'pointermove', { clientX: 120, pointerId: 2 })
    dispatchPointer(window, 'pointermove', { clientX: 120, pointerId: 1 })
    dispatchPointer(window, 'pointerup', { clientX: 120, pointerId: 1 })
    dispatchPointer(window, 'pointermove', { clientX: 50, pointerId: 1 })
    expect(onSeek.mock.calls).toEqual([[2], [10]])
  })

  it('a press from another pointer does not take over the contact in progress', () => {
    const onSeek = vi.fn()
    const strip = seekableStrip(render({ duration: 10, currentTime: 0, fps: 24, onSeek }))
    dispatchPointer(strip, 'pointerdown', { clientX: 30, pointerId: 1 })
    dispatchPointer(strip, 'pointerdown', { clientX: 60, pointerId: 2 })
    expect(onSeek.mock.calls).toEqual([[2]])
    dispatchPointer(strip, 'pointerup', { clientX: 60, pointerId: 1 })
    dispatchPointer(strip, 'pointerdown', { clientX: 60, pointerId: 2 })
    expect(onSeek.mock.calls).toEqual([[2], [5]])
  })

  it('a second press of the same pointer replaces the contact in progress', () => {
    const onSeek = vi.fn()
    const strip = seekableStrip(render({ duration: 10, currentTime: 0, fps: 24, onSeek }))
    dispatchPointer(strip, 'pointerdown', { clientX: 30, pointerId: 1 })
    dispatchPointer(strip, 'pointerdown', { clientX: 60, pointerId: 1 })
    dispatchPointer(window, 'pointermove', { clientX: 80, pointerId: 1 })
    dispatchPointer(window, 'pointerup', { clientX: 80, pointerId: 1 })
    dispatchPointer(window, 'pointermove', { clientX: 50, pointerId: 1 })
    expect(onSeek.mock.calls).toEqual([[2], [5], [7]])
  })

  it('a contact that is not the primary pointer is ignored', () => {
    const onSeek = vi.fn()
    const strip = seekableStrip(render({ duration: 10, currentTime: 0, fps: 24, onSeek }))
    dispatchPointer(strip, 'pointerdown', {
      clientX: 30,
      pointerId: 1,
      pointerType: 'touch',
      isPrimary: false,
    })
    expect(onSeek).not.toHaveBeenCalled()
  })

  it('a cancelled press outside the strip ends the contact', () => {
    const onSeek = vi.fn()
    const strip = seekableStrip(render({ duration: 10, currentTime: 0, fps: 24, onSeek }))
    dispatchPointer(strip, 'pointerdown', { clientX: 30, pointerId: 1 })
    dispatchPointer(window, 'pointercancel', { clientX: 60, pointerId: 1 })
    dispatchPointer(strip, 'pointermove', { clientX: 50, pointerId: 1 })
    expect(onSeek.mock.calls).toEqual([[2]])
  })

  it('the window losing focus ends the contact', () => {
    const onSeek = vi.fn()
    const strip = seekableStrip(render({ duration: 10, currentTime: 0, fps: 24, onSeek }))
    dispatchPointer(strip, 'pointerdown', { clientX: 30, pointerId: 1 })
    window.dispatchEvent(new Event('blur'))
    dispatchPointer(strip, 'pointermove', { clientX: 50, pointerId: 1 })
    expect(onSeek.mock.calls).toEqual([[2]])
  })

  it('losing the pointer capture ends the contact', () => {
    const onSeek = vi.fn()
    const strip = seekableStrip(render({ duration: 10, currentTime: 0, fps: 24, onSeek }))
    dispatchPointer(strip, 'pointerdown', { clientX: 30, pointerId: 1 })
    dispatchPointer(strip, 'lostpointercapture', { clientX: 30, pointerId: 1 })
    dispatchPointer(strip, 'pointermove', { clientX: 50, pointerId: 1 })
    expect(onSeek.mock.calls).toEqual([[2]])
  })

  it('a held touch keeps the page from scrolling', () => {
    const onSeek = vi.fn()
    const strip = seekableStrip(render({ duration: 10, currentTime: 0, fps: 24, onSeek }))
    const touch = { pointerId: 1, pointerType: 'touch' }
    dispatchPointer(strip, 'pointerdown', { clientX: 30, clientY: 20, ...touch })
    expect(dispatchTouchMove(60, 100)).toBe(true)
    dispatchPointer(window, 'pointerup', { clientX: 60, clientY: 100, ...touch })
    expect(dispatchTouchMove(62, 120)).toBe(false)
  })

  it('a touch that turns into a vertical swipe ends the contact and lets the page scroll', () => {
    const onSeek = vi.fn()
    const strip = seekableStrip(render({ duration: 10, currentTime: 0, fps: 24, onSeek }))
    // The strip's own `touch-action: none` never scrolls; a stylesheet that lifts it makes this reachable.
    strip.style.setProperty('touch-action', 'auto', 'important')
    const touch = { pointerId: 1, pointerType: 'touch' }
    dispatchPointer(strip, 'pointerdown', { clientX: 30, clientY: 20, ...touch })
    expect(dispatchTouchMove(30, 100)).toBe(false)
    dispatchPointer(window, 'pointermove', { clientX: 60, clientY: 22, ...touch })
    expect(onSeek.mock.calls).toEqual([[2]])
  })

  it('a touch that moves along a scrollable strip keeps seeking and holds the page still', () => {
    const onSeek = vi.fn()
    const strip = seekableStrip(render({ duration: 10, currentTime: 0, fps: 24, onSeek }))
    strip.style.setProperty('touch-action', 'auto', 'important')
    const touch = { pointerId: 1, pointerType: 'touch' }
    dispatchPointer(strip, 'pointerdown', { clientX: 30, clientY: 20, ...touch })
    expect(dispatchTouchMove(100, 22)).toBe(true)
    dispatchPointer(window, 'pointermove', { clientX: 100, clientY: 22, ...touch })
    expect(onSeek.mock.calls).toEqual([[2], [9]])
  })

  it('stops following the pointer once the scrubber unmounts', async () => {
    const onSeek = vi.fn()
    const view = renderLive({ duration: 10, currentTime: 0, fps: 24, onSeek })
    const strip = seekableStrip(view.container)
    dispatchPointer(strip, 'pointerdown', { clientX: 30, pointerId: 1 })
    await view.unmount()
    dispatchPointer(window, 'pointermove', { clientX: 60, pointerId: 1 })
    dispatchPointer(window, 'pointerup', { clientX: 60, pointerId: 1 })
    expect(onSeek.mock.calls).toEqual([[2]])
  })

  it('ends the contact when onSeek is removed mid-press', async () => {
    const onSeek = vi.fn()
    const view = renderLive({ duration: 10, currentTime: 0, fps: 24, onSeek })
    const strip = seekableStrip(view.container)
    dispatchPointer(strip, 'pointerdown', { clientX: 30, pointerId: 1 })
    await view.set({ onSeek: undefined })
    await view.set({ onSeek })
    dispatchPointer(window, 'pointermove', { clientX: 60, pointerId: 1 })
    expect(onSeek.mock.calls).toEqual([[2]])
  })

  it('a new onSeek function mid-press keeps the contact', async () => {
    const first = vi.fn()
    const second = vi.fn()
    const view = renderLive({ duration: 10, currentTime: 0, fps: 24, onSeek: first })
    const strip = seekableStrip(view.container)
    dispatchPointer(strip, 'pointerdown', { clientX: 30, pointerId: 1 })
    await view.set({ onSeek: second })
    dispatchPointer(window, 'pointermove', { clientX: 60, pointerId: 1 })
    expect(first.mock.calls).toEqual([[2]])
    expect(second.mock.calls).toEqual([[5]])
  })

  it('arrow-right steps forward exactly one frame; arrow-left steps back one frame', () => {
    const onSeek = vi.fn()
    const container = render({ duration: 60, currentTime: 1, fps: 24, onSeek })
    const strip = container.querySelector<HTMLElement>('[data-mol-id="video-scrubber-strip"]')
    if (!strip) throw new Error('strip missing')
    strip.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
    expect(onSeek).toHaveBeenLastCalledWith(frameToTime(25, 24)) // 1s = frame 24, +1 = 25
    strip.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }))
    expect(onSeek).toHaveBeenLastCalledWith(frameToTime(23, 24))
  })

  it('shift+arrows step ±1 second', () => {
    const onSeek = vi.fn()
    const container = render({ duration: 60, currentTime: 5, fps: 24, onSeek })
    const strip = container.querySelector<HTMLElement>('[data-mol-id="video-scrubber-strip"]')
    if (!strip) throw new Error('strip missing')
    strip.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowRight', shiftKey: true, bubbles: true }),
    )
    expect(onSeek).toHaveBeenLastCalledWith(6)
    strip.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowLeft', shiftKey: true, bubbles: true }),
    )
    expect(onSeek).toHaveBeenLastCalledWith(4)
  })

  it('PageUp/PageDown step ±10 frames', () => {
    const onSeek = vi.fn()
    const container = render({ duration: 60, currentTime: 2, fps: 24, onSeek })
    const strip = container.querySelector<HTMLElement>('[data-mol-id="video-scrubber-strip"]')
    if (!strip) throw new Error('strip missing')
    strip.dispatchEvent(new KeyboardEvent('keydown', { key: 'PageDown', bubbles: true }))
    // Frame 48 + 10 = 58 → 58/24
    expect(onSeek).toHaveBeenLastCalledWith(frameToTime(58, 24))
    strip.dispatchEvent(new KeyboardEvent('keydown', { key: 'PageUp', bubbles: true }))
    expect(onSeek).toHaveBeenLastCalledWith(frameToTime(38, 24))
  })

  it('Home jumps to 0; End jumps to duration', () => {
    const onSeek = vi.fn()
    const container = render({ duration: 60, currentTime: 5, fps: 24, onSeek })
    const strip = container.querySelector<HTMLElement>('[data-mol-id="video-scrubber-strip"]')
    if (!strip) throw new Error('strip missing')
    strip.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }))
    expect(onSeek).toHaveBeenLastCalledWith(0)
    strip.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }))
    expect(onSeek).toHaveBeenLastCalledWith(60)
  })

  it('keyboard handler clamps stepping at the bounds', () => {
    const onSeek = vi.fn()
    const container = render({ duration: 60, currentTime: 0, fps: 24, onSeek })
    const strip = container.querySelector<HTMLElement>('[data-mol-id="video-scrubber-strip"]')
    if (!strip) throw new Error('strip missing')
    strip.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }))
    expect(onSeek).toHaveBeenLastCalledWith(0)
  })

  it('exposes aria-valuenow / valuemax on the strip', () => {
    const container = render({ duration: 60, currentTime: 3.5 })
    const strip = container.querySelector('[data-mol-id="video-scrubber-strip"]')
    expect(strip?.getAttribute('aria-valuenow')).toBe('3.5')
    expect(strip?.getAttribute('aria-valuemax')).toBe('60')
    expect(strip?.getAttribute('role')).toBe('slider')
  })

  it('forwards id and uses an aria-labelled root', () => {
    const container = render({ duration: 60, currentTime: 0, id: 'my-scrubber' })
    const root = container.querySelector('[data-mol-id="video-scrubber"]')
    expect(root?.id).toBe('my-scrubber')
    expect(root?.getAttribute('aria-label')).toBeTruthy()
  })

  it('falls back to fps=24 when fps is invalid', () => {
    const container = render({ duration: 60, currentTime: 1, fps: 0 })
    const root = container.querySelector('[data-mol-id="video-scrubber"]')
    expect(root?.getAttribute('data-fps')).toBe('24')
    expect(root?.getAttribute('data-frame')).toBe('24')
  })
})
