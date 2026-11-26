// @vitest-environment jsdom
/**
 * Unit tests of `VideoTimeline` — the port of
 * `@molecule/app-feature-video-timeline-react`'s own suite. The React suite
 * renders the component with mocked UI dependencies and asserts the markup;
 * this port mounts the same mocked tree through Angular's real renderer (the
 * same `createApplication` + JIT host approach the conformance kit's Angular
 * adapter uses) and asserts the same markup strings.
 *
 * @module
 */

import '@angular/compiler'
import {
  type ApplicationRef,
  ChangeDetectionStrategy,
  Component,
  type ComponentRef,
  createComponent,
  provideZonelessChangeDetection,
  type Type,
} from '@angular/core'
import { createApplication } from '@angular/platform-browser'
import { afterEach, describe, expect, it, vi } from 'vitest'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `cursorPointer`), so tests can assert which cm.* class was applied without a
// real bond — the same mock the React tests use.
vi.mock('@molecule/app-ui', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getClassMap: () => {
    const handler: ProxyHandler<Record<string, unknown>> = {
      get(_t, prop) {
        if (prop === 'cn') {
          return (...cls: unknown[]) =>
            cls
              .flat(Infinity)
              .map((c) => (typeof c === 'function' ? c() : c))
              .filter((c) => typeof c === 'string' && c.length > 0)
              .join(' ')
        }
        const token = String(prop)
        return (..._args: unknown[]) => token
      },
    }
    return new Proxy({}, handler)
  },
}))

// The i18n mock the React tests install for `@molecule/app-react`: `t`
// resolves to the inline English default.
vi.mock('@molecule/app-angular', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

const {
  clampZoom,
  computeRippleUpdates,
  computeRulerTicks,
  formatTickTime,
  VideoTimeline,
  zoomFromWheelDelta,
} = await import('../index.js')

import type { Clip } from '@molecule/app-feature-track-lane-angular'

import type { Track, VideoTimelineProps } from '../types.js'

/** The host template every test mounts: one attribute-selector timeline with every input bound. */
const TEMPLATE = `<div mol-video-timeline [tracks]="p['tracks']" [currentTime]="p['currentTime']" [duration]="p['duration']" [onSeek]="p['onSeek']" [onClipMove]="p['onClipMove']" [onClipResize]="p['onClipResize']" [pixelsPerSecond]="p['pixelsPerSecond']" [zoomMin]="p['zoomMin']" [zoomMax]="p['zoomMax']" [mode]="p['mode']" [onZoomChange]="p['onZoomChange']" [selectedClipId]="p['selectedClipId']" [onClipClick]="p['onClipClick']" [trackHeight]="p['trackHeight']" [laneHeaderWidth]="p['laneHeaderWidth']" [rulerHeight]="p['rulerHeight']" [className]="p['className']"></div>`

/** A mounted spec host: its DOM, a props update and a teardown. */
interface Mounted {
  /** The host element whose children the component template produced. */
  readonly host: HTMLElement
  /** Merges new props in, as a parent re-rendering would, and runs change detection. */
  setProps(next: Partial<VideoTimelineProps>): Promise<void>
  /** Destroys the app and removes the host. */
  destroy(): Promise<void>
}

/**
 * Mounts the timeline through a JIT host template, written the way an Angular
 * app would write it.
 *
 * @param props - The props object the template reads as `p['name']`.
 * @returns The mounted host.
 */
async function mountHost(props: VideoTimelineProps): Promise<Mounted> {
  const Host = Component({
    selector: 'mol-spec-host',
    standalone: true,
    imports: [VideoTimeline as Type<unknown>],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: TEMPLATE,
  })(
    class SpecHost {
      /** The props the template binds. */
      p: VideoTimelineProps = props
    },
  )
  const appRef: ApplicationRef = await createApplication({
    providers: [provideZonelessChangeDetection()],
  })
  // The instance is the host class above, whose `p` the template reads.
  const ref: ComponentRef<{ p: VideoTimelineProps }> = createComponent(Host, {
    environmentInjector: appRef.injector,
  })
  const host = ref.location.nativeElement as HTMLElement
  document.body.appendChild(host)
  appRef.attachView(ref.hostView)
  appRef.tick()
  return {
    host,
    setProps: async (next) => {
      // Zoneless Angular refreshes only a view marked dirty, and a plain field write marks nothing.
      ref.instance.p = { ...ref.instance.p, ...next }
      ref.changeDetectorRef.markForCheck()
      appRef.tick()
    },
    destroy: async () => {
      appRef.destroy()
      host.remove()
    },
  }
}

/** The mounted hosts of the current test, destroyed in `afterEach`. */
const mounted: Mounted[] = []

/**
 * Mounts a `VideoTimeline` with the given props.
 *
 * @param props - Component props.
 * @returns The host element.
 */
const render = async (props: VideoTimelineProps): Promise<HTMLElement> => {
  const m = await mountHost(props)
  mounted.push(m)
  return m.host
}

/** A timeline whose props a test changes afterwards, as a parent re-rendering it would. */
interface Updatable {
  /** The host element the timeline mounted into. */
  container: HTMLElement
  /** Merges new props in and renders them. */
  setProps(next: Partial<VideoTimelineProps>): Promise<void>
}

/**
 * Mounts a `VideoTimeline` whose props the test can change afterwards, the
 * way a parent re-renders it.
 *
 * @param props - Component props.
 * @returns The host element and the props update.
 */
const renderUpdatable = async (props: VideoTimelineProps): Promise<Updatable> => {
  const m = await mountHost(props)
  mounted.push(m)
  return { container: m.host, setProps: (next) => m.setProps(next) }
}

/** What a dispatched pointer event says about itself. */
interface PointerInit {
  clientX?: number
  clientY?: number
  pointerId?: number
  button?: number
  /** The device the pointer belongs to (`mouse`, `touch`, `pen`). */
  pointerType?: string
  /** Whether the pointer is the first one of its type on the surface. */
  isPrimary?: boolean
}

/**
 * Dispatch a real `PointerEvent` so element listeners and window-level
 * listeners both pick it up.
 *
 * @param target - Target element / window.
 * @param type - Pointer event type.
 * @param init - Pointer init properties.
 */
function dispatchPointer(
  target: Element | Window,
  type: 'pointerdown' | 'pointermove' | 'pointerup' | 'pointercancel' | 'lostpointercapture',
  init: PointerInit,
): void {
  const event = new Event(type, { bubbles: true, cancelable: true }) as Event & PointerInit
  event.clientX = init.clientX ?? 0
  event.clientY = init.clientY ?? 0
  event.pointerId = init.pointerId ?? 1
  event.button = init.button ?? 0
  if (init.pointerType !== undefined) event.pointerType = init.pointerType
  if (init.isPrimary !== undefined) event.isPrimary = init.isPrimary
  target.dispatchEvent(event)
}

/**
 * The ruler body of a rendered timeline. jsdom lays nothing out, so the ruler
 * is given a rect that starts at the viewport's left edge: a pointer's
 * `clientX` is then its offset into the ruler.
 *
 * @param container - The rendered timeline's host.
 * @returns The ruler body.
 */
function rulerOf(container: HTMLElement): HTMLElement {
  const ruler = container.querySelector<HTMLElement>('[data-mol-id="video-timeline-ruler"]')
  if (!ruler) throw new Error('ruler missing')
  ruler.getBoundingClientRect = () =>
    ({
      left: 0,
      top: 0,
      right: 800,
      bottom: 28,
      width: 800,
      height: 28,
      x: 0,
      y: 0,
      toJSON() {
        /* jsdom shape */
      },
    }) as DOMRect
  return ruler
}

/**
 * Dispatch a cancelable `wheel` event the way testing-library's
 * `fireEvent.wheel` does, and report whether the event was left to the
 * browser (`true`) or consumed by the component (`false`).
 *
 * @param target - Target element.
 * @param init - Wheel init properties.
 * @returns False when a handler called `preventDefault()`.
 */
function fireWheel(target: Element, init: WheelEventInit): boolean {
  const event = new WheelEvent('wheel', {
    bubbles: true,
    cancelable: true,
    composed: true,
    ...init,
  })
  target.dispatchEvent(event)
  return !event.defaultPrevented
}

/**
 * Dispatch a cancelable `touchmove` carrying one contact, and report whether
 * the event was left to the browser (`true`, the page scrolls) or consumed by
 * the component (`false`).
 *
 * @param clientX - The contact's viewport x.
 * @param clientY - The contact's viewport y.
 * @returns False when a handler called `preventDefault()`.
 */
function fireTouchMove(clientX: number, clientY: number): boolean {
  const event = new Event('touchmove', { bubbles: true, cancelable: true })
  Object.defineProperty(event, 'touches', { value: [{ clientX, clientY }] })
  window.dispatchEvent(event)
  return !event.defaultPrevented
}

const baseClipsV: Clip[] = [
  { id: 'v1', startTime: 0, duration: 2, label: 'Intro' },
  { id: 'v2', startTime: 4, duration: 1.5, label: 'Body' },
  { id: 'v3', startTime: 8, duration: 3, label: 'Outro' },
]

const baseClipsA: Clip[] = [
  { id: 'a1', startTime: 0, duration: 6, label: 'Music' },
  { id: 'a2', startTime: 7, duration: 2, label: 'VO' },
]

const baseTracks: Track[] = [
  { id: 'tv', kind: 'video', clips: baseClipsV, name: 'Video 1' },
  { id: 'ta', kind: 'audio', clips: baseClipsA, name: 'Audio 1' },
]

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
  document.body.innerHTML = ''
})

describe('clampZoom', () => {
  it('clamps into [min, max]', () => {
    expect(clampZoom(50, 10, 100)).toBe(50)
    expect(clampZoom(5, 10, 100)).toBe(10)
    expect(clampZoom(500, 10, 100)).toBe(100)
  })

  it('returns min for non-finite input (NaN, Infinity both treated as invalid)', () => {
    expect(clampZoom(Number.NaN, 10, 100)).toBe(10)
    expect(clampZoom(Number.POSITIVE_INFINITY, 10, 100)).toBe(10)
  })
})

describe('zoomFromWheelDelta', () => {
  it('zooms in on negative deltaY (scroll up)', () => {
    const next = zoomFromWheelDelta(20, -100, 2, 200)
    expect(next).toBeGreaterThan(20)
  })

  it('zooms out on positive deltaY (scroll down)', () => {
    const next = zoomFromWheelDelta(20, 100, 2, 200)
    expect(next).toBeLessThan(20)
  })

  it('returns clamped current when deltaY is 0', () => {
    expect(zoomFromWheelDelta(20, 0, 2, 200)).toBe(20)
  })

  it('clamps to min/max', () => {
    expect(zoomFromWheelDelta(2, 100, 2, 200)).toBe(2)
    expect(zoomFromWheelDelta(200, -100, 2, 200)).toBe(200)
  })
})

describe('computeRulerTicks', () => {
  it('returns at least one tick at time 0', () => {
    const ticks = computeRulerTicks(0, 20)
    expect(ticks[0]).toEqual({ time: 0, pixel: 0 })
  })

  it('emits ticks across the duration with adequate pixel spacing', () => {
    const ticks = computeRulerTicks(60, 20) // 1200px wide
    // Adjacent ticks must be at least 60px apart.
    for (let i = 1; i < ticks.length; i++) {
      expect(ticks[i].pixel - ticks[i - 1].pixel).toBeGreaterThanOrEqual(59.999)
    }
    // First tick at 0, last tick <= 60.
    expect(ticks[0].time).toBe(0)
    expect(ticks[ticks.length - 1].time).toBeLessThanOrEqual(60)
  })

  it('selects a coarser interval at low zoom', () => {
    const tight = computeRulerTicks(60, 200)
    const loose = computeRulerTicks(60, 5)
    expect(loose.length).toBeLessThan(tight.length)
  })

  it('handles zero / negative pixelsPerSecond by returning a single 0 tick', () => {
    expect(computeRulerTicks(60, 0)).toEqual([{ time: 0, pixel: 0 }])
    expect(computeRulerTicks(60, -1)).toEqual([{ time: 0, pixel: 0 }])
  })
})

describe('computeRippleUpdates', () => {
  it('returns just the dragged clip when delta is 0', () => {
    const updates = computeRippleUpdates(baseClipsV, 'v1', 0)
    expect(updates).toEqual([{ id: 'v1', startTime: 0 }])
  })

  it('shifts later clips by the same delta', () => {
    const updates = computeRippleUpdates(baseClipsV, 'v1', 1)
    // v1: 0 -> 1, v2: 4 -> 5, v3: 8 -> 9 (all later than v1's origin 0)
    const byId = Object.fromEntries(updates.map((u) => [u.id, u.startTime]))
    expect(byId.v1).toBe(1)
    expect(byId.v2).toBe(5)
    expect(byId.v3).toBe(9)
  })

  it('does not shift clips that started earlier than the dragged clip', () => {
    // Drag v2 forward — only v3 should ripple, NOT v1.
    const updates = computeRippleUpdates(baseClipsV, 'v2', 5)
    const ids = updates.map((u) => u.id)
    expect(ids).toContain('v2')
    expect(ids).toContain('v3')
    expect(ids).not.toContain('v1')
  })

  it('clamps the dragged clip to startTime >= 0', () => {
    const updates = computeRippleUpdates(baseClipsV, 'v2', -5)
    const dragged = updates.find((u) => u.id === 'v2')
    expect(dragged?.startTime).toBe(0)
  })

  it('returns empty array when the dragged id is not on the lane', () => {
    expect(computeRippleUpdates(baseClipsV, 'nope', 5)).toEqual([])
  })
})

describe('formatTickTime', () => {
  it('uses seconds format below 60', () => {
    expect(formatTickTime(0)).toBe('0s')
    expect(formatTickTime(2)).toBe('2s')
    expect(formatTickTime(2.5)).toBe('2.5s')
  })

  it('uses mm:ss format at and above 60', () => {
    expect(formatTickTime(60)).toBe('1:00')
    expect(formatTickTime(125)).toBe('2:05')
  })
})

describe('<VideoTimeline>', () => {
  it('renders one track row per track', async () => {
    const container = await render({ tracks: baseTracks, currentTime: 0, duration: 60 })
    const trackEls = container.querySelectorAll('[data-mol-id="video-timeline-track"]')
    expect(trackEls.length).toBe(2)
    expect(trackEls[0].getAttribute('data-track-id')).toBe('tv')
    expect(trackEls[0].getAttribute('data-track-kind')).toBe('video')
    expect(trackEls[1].getAttribute('data-track-kind')).toBe('audio')
  })

  it('renders ruler ticks across the duration', async () => {
    const container = await render({
      tracks: baseTracks,
      currentTime: 0,
      duration: 60,
      pixelsPerSecond: 20,
    })
    const ticks = container.querySelectorAll('[data-mol-id="video-timeline-tick"]')
    expect(ticks.length).toBeGreaterThan(1)
    // Tick `data-time` values should be monotonic.
    const times = Array.from(ticks).map((t) => Number(t.getAttribute('data-time')))
    for (let i = 1; i < times.length; i++) {
      expect(times[i]).toBeGreaterThan(times[i - 1])
    }
  })

  it('positions the playhead at currentTime * pixelsPerSecond + headerWidth', async () => {
    const container = await render({
      tracks: baseTracks,
      currentTime: 5,
      duration: 60,
      pixelsPerSecond: 20,
      laneHeaderWidth: 120,
    })
    const playhead = container.querySelector<HTMLElement>('[data-mol-id="video-timeline-playhead"]')
    expect(playhead?.style.left).toBe('220px') // 5 * 20 + 120
  })

  it('sets aria-valuenow on the ruler to currentTime', async () => {
    const container = await render({ tracks: baseTracks, currentTime: 3.5, duration: 60 })
    const ruler = container.querySelector('[data-mol-id="video-timeline-ruler"]')
    expect(ruler?.getAttribute('aria-valuenow')).toBe('3.5')
    expect(ruler?.getAttribute('aria-valuemax')).toBe('60')
  })

  it('fires onSeek with the clicked time on ruler pointerdown', async () => {
    const onSeek = vi.fn()
    const container = await render({
      tracks: baseTracks,
      currentTime: 0,
      duration: 60,
      pixelsPerSecond: 20,
      onSeek,
    })
    const ruler = container.querySelector<HTMLElement>('[data-mol-id="video-timeline-ruler"]')
    expect(ruler).not.toBeNull()
    if (!ruler) return
    // jsdom returns 0,0,0,0 for getBoundingClientRect — stub it.
    ruler.getBoundingClientRect = () =>
      ({
        left: 0,
        top: 0,
        right: 800,
        bottom: 28,
        width: 800,
        height: 28,
        x: 0,
        y: 0,
        toJSON() {
          /* jsdom shape */
        },
      }) as DOMRect
    dispatchPointer(ruler, 'pointerdown', { clientX: 60, pointerId: 1 })
    // 60px / 20pps = 3s
    expect(onSeek).toHaveBeenCalledWith(3)
  })

  it('clamps onSeek time to [0, duration]', async () => {
    const onSeek = vi.fn()
    const container = await render({
      tracks: baseTracks,
      currentTime: 0,
      duration: 10,
      pixelsPerSecond: 20,
      onSeek,
    })
    const ruler = container.querySelector<HTMLElement>('[data-mol-id="video-timeline-ruler"]')
    if (!ruler) throw new Error('ruler missing')
    ruler.getBoundingClientRect = () =>
      ({
        left: 0,
        top: 0,
        right: 1000,
        bottom: 28,
        width: 1000,
        height: 28,
        x: 0,
        y: 0,
        toJSON() {
          /* jsdom shape */
        },
      }) as DOMRect
    // 10 seconds * 20 pps = 200px is the duration boundary; click at 800px.
    dispatchPointer(ruler, 'pointerdown', { clientX: 800, pointerId: 1 })
    expect(onSeek).toHaveBeenLastCalledWith(10)
    // Released before the next press: the pointer that pressed first owns the scrub.
    dispatchPointer(ruler, 'pointerup', { clientX: 800, pointerId: 1 })
    // And below zero clamps to 0.
    dispatchPointer(ruler, 'pointerdown', { clientX: -50, pointerId: 2 })
    expect(onSeek).toHaveBeenLastCalledWith(0)
  })

  it('seeks on every pointer move until the release, wherever the pointer is', async () => {
    const onSeek = vi.fn()
    const container = await render({
      tracks: baseTracks,
      currentTime: 0,
      duration: 60,
      pixelsPerSecond: 20,
      onSeek,
    })
    const ruler = rulerOf(container)
    dispatchPointer(ruler, 'pointerdown', { clientX: 60, pointerId: 1 })
    // Moves reach the window even once the pointer has left the ruler.
    dispatchPointer(window, 'pointermove', { clientX: 100, pointerId: 1 })
    dispatchPointer(window, 'pointermove', { clientX: 140, pointerId: 1 })
    dispatchPointer(window, 'pointerup', { clientX: 140, pointerId: 1 })
    // The release seeks nothing, and neither does a move after it.
    dispatchPointer(window, 'pointermove', { clientX: 180, pointerId: 1 })
    expect(onSeek.mock.calls).toEqual([[3], [5], [7]])
  })

  it('ignores a second pointer pressing the ruler during a scrub', async () => {
    const onSeek = vi.fn()
    const container = await render({
      tracks: baseTracks,
      currentTime: 0,
      duration: 60,
      pixelsPerSecond: 20,
      onSeek,
    })
    const ruler = rulerOf(container)
    dispatchPointer(ruler, 'pointerdown', { clientX: 60, pointerId: 1 })
    // A second finger lands on the ruler while the first pointer is still down.
    dispatchPointer(ruler, 'pointerdown', { clientX: 200, pointerId: 2 })
    dispatchPointer(window, 'pointermove', { clientX: 220, pointerId: 2 })
    // The pointer that started the scrub still owns it.
    dispatchPointer(window, 'pointermove', { clientX: 80, pointerId: 1 })
    dispatchPointer(window, 'pointerup', { clientX: 80, pointerId: 1 })
    // Once that pointer lifts, the second one can press.
    dispatchPointer(ruler, 'pointerdown', { clientX: 40, pointerId: 2 })
    expect(onSeek.mock.calls).toEqual([[3], [4], [2]])
  })

  it('ignores a non-primary pointer pressing the ruler', async () => {
    const onSeek = vi.fn()
    const container = await render({
      tracks: baseTracks,
      currentTime: 0,
      duration: 60,
      pixelsPerSecond: 20,
      onSeek,
    })
    const ruler = rulerOf(container)
    // A second touch: not the primary pointer of its type.
    dispatchPointer(ruler, 'pointerdown', {
      clientX: 60,
      pointerId: 2,
      pointerType: 'touch',
      isPrimary: false,
    })
    dispatchPointer(window, 'pointermove', {
      clientX: 100,
      pointerId: 2,
      pointerType: 'touch',
      isPrimary: false,
    })
    dispatchPointer(window, 'pointerup', { clientX: 100, pointerId: 2 })
    // The primary pointer seeks as usual.
    dispatchPointer(ruler, 'pointerdown', {
      clientX: 20,
      pointerId: 1,
      pointerType: 'mouse',
      isPrimary: true,
    })
    expect(onSeek.mock.calls).toEqual([[1]])
  })

  it('ends the scrub and releases the pointer when the window loses focus', async () => {
    const onSeek = vi.fn()
    const container = await render({
      tracks: baseTracks,
      currentTime: 0,
      duration: 60,
      pixelsPerSecond: 20,
      onSeek,
    })
    const ruler = rulerOf(container)
    const capture = vi.fn()
    const release = vi.fn()
    Object.assign(ruler, { setPointerCapture: capture, releasePointerCapture: release })
    dispatchPointer(ruler, 'pointerdown', { clientX: 60, pointerId: 1 })
    dispatchPointer(window, 'pointermove', { clientX: 100, pointerId: 1 })
    // The pointer's release never reaches a page that is out of focus.
    window.dispatchEvent(new Event('blur'))
    dispatchPointer(window, 'pointermove', { clientX: 140, pointerId: 1 })
    // Hovering the ruler afterwards seeks nothing either.
    dispatchPointer(ruler, 'pointermove', { clientX: 180, pointerId: 1 })
    expect(onSeek.mock.calls).toEqual([[3], [5]])
    expect(capture).toHaveBeenCalledExactlyOnceWith(1)
    expect(release).toHaveBeenCalledExactlyOnceWith(1)
  })

  it('ends the scrub when the pointer is cancelled', async () => {
    const onSeek = vi.fn()
    const container = await render({
      tracks: baseTracks,
      currentTime: 0,
      duration: 60,
      pixelsPerSecond: 20,
      onSeek,
    })
    const ruler = rulerOf(container)
    dispatchPointer(ruler, 'pointerdown', { clientX: 60, pointerId: 1 })
    dispatchPointer(window, 'pointermove', { clientX: 100, pointerId: 1 })
    dispatchPointer(window, 'pointercancel', { clientX: 100, pointerId: 1 })
    dispatchPointer(ruler, 'pointermove', { clientX: 140, pointerId: 1 })
    expect(onSeek.mock.calls).toEqual([[3], [5]])
  })

  it('ends the scrub when the ruler loses pointer capture', async () => {
    const onSeek = vi.fn()
    const container = await render({
      tracks: baseTracks,
      currentTime: 0,
      duration: 60,
      pixelsPerSecond: 20,
      onSeek,
    })
    const ruler = rulerOf(container)
    dispatchPointer(ruler, 'pointerdown', { clientX: 60, pointerId: 1 })
    dispatchPointer(window, 'pointermove', { clientX: 100, pointerId: 1 })
    // The browser takes the capture back, and says so for the pointer that held it.
    dispatchPointer(ruler, 'lostpointercapture', { clientX: 100, pointerId: 1 })
    dispatchPointer(window, 'pointermove', { clientX: 140, pointerId: 1 })
    expect(onSeek.mock.calls).toEqual([[3], [5]])
  })

  it('keeps seeking through a handler bound again during a scrub', async () => {
    const first = vi.fn()
    const second = vi.fn()
    const { container, setProps } = await renderUpdatable({
      tracks: baseTracks,
      currentTime: 0,
      duration: 60,
      pixelsPerSecond: 20,
      onSeek: first,
    })
    const ruler = rulerOf(container)
    dispatchPointer(ruler, 'pointerdown', { clientX: 60, pointerId: 1 })
    // The parent re-renders while the pointer is down (the seek moved its own
    // state) and passes a new inline handler.
    await setProps({ currentTime: 3, onSeek: second })
    dispatchPointer(window, 'pointermove', { clientX: 100, pointerId: 1 })
    dispatchPointer(window, 'pointerup', { clientX: 100, pointerId: 1 })
    // The scrub was never interrupted: its next move goes through the new handler.
    expect(first.mock.calls).toEqual([[3]])
    expect(second.mock.calls).toEqual([[5]])
  })

  it('keeps the page from scrolling under a touch that scrubs the ruler', async () => {
    const onSeek = vi.fn()
    const container = await render({
      tracks: baseTracks,
      currentTime: 0,
      duration: 60,
      pixelsPerSecond: 20,
      onSeek,
    })
    const ruler = rulerOf(container)
    // A finger lands on the ruler, which declares `touch-action: none`.
    dispatchPointer(ruler, 'pointerdown', {
      clientX: 60,
      pointerId: 1,
      pointerType: 'touch',
      isPrimary: true,
    })
    // Its first real movement runs down the page, where a scroller would take it.
    expect(fireTouchMove(100, 60)).toBe(false)
    // The scrub is still owned: the movement seeks as well.
    dispatchPointer(window, 'pointermove', {
      clientX: 100,
      clientY: 60,
      pointerId: 1,
      pointerType: 'touch',
      isPrimary: true,
    })
    expect(onSeek.mock.calls).toEqual([[3], [5]])
  })

  it('hands a vertical touch swipe back when the ruler is made scrollable', async () => {
    // A stylesheet that takes the ruler's `touch-action: none` away.
    const sheet = document.createElement('style')
    sheet.textContent = '[data-mol-id="video-timeline-ruler"] { touch-action: pan-y !important; }'
    document.head.appendChild(sheet)
    try {
      const onSeek = vi.fn()
      const container = await render({
        tracks: baseTracks,
        currentTime: 0,
        duration: 60,
        pixelsPerSecond: 20,
        onSeek,
      })
      const ruler = rulerOf(container)
      dispatchPointer(ruler, 'pointerdown', {
        clientX: 60,
        pointerId: 1,
        pointerType: 'touch',
        isPrimary: true,
      })
      // A movement mostly down the page is a scroll, not a scrub: the page keeps it.
      expect(fireTouchMove(100, 60)).toBe(true)
      // And the scrub is over: later movements seek nothing.
      dispatchPointer(window, 'pointermove', {
        clientX: 140,
        clientY: 90,
        pointerId: 1,
        pointerType: 'touch',
        isPrimary: true,
      })
      expect(onSeek.mock.calls).toEqual([[3]])
    } finally {
      sheet.remove()
    }
  })

  it('insert mode: dragging a clip emits exactly one onClipMove call', async () => {
    const onClipMove = vi.fn()
    const container = await render({
      tracks: baseTracks,
      currentTime: 0,
      duration: 60,
      pixelsPerSecond: 20,
      mode: 'insert',
      onClipMove,
    })
    const clips = container.querySelectorAll('[data-mol-id="track-lane-clip"]')
    // First clip on first track is v1 at startTime=0.
    dispatchPointer(clips[0], 'pointerdown', { clientX: 0, pointerId: 1 })
    dispatchPointer(window, 'pointermove', { clientX: 40, pointerId: 1 }) // +40px = +2s
    dispatchPointer(window, 'pointerup', { clientX: 40, pointerId: 1 })
    // Only the dragged clip should have moved — exactly one update.
    const v1Calls = onClipMove.mock.calls.filter((c) => c[0] === 'v1')
    expect(v1Calls.length).toBeGreaterThan(0)
    // No call should target v2 or v3 (they should NOT ripple in insert mode).
    expect(onClipMove.mock.calls.some((c) => c[0] === 'v2')).toBe(false)
    expect(onClipMove.mock.calls.some((c) => c[0] === 'v3')).toBe(false)
  })

  it('ripple mode: dragging a clip shifts later clips on the same track', async () => {
    const onClipMove = vi.fn()
    const container = await render({
      tracks: baseTracks,
      currentTime: 0,
      duration: 60,
      pixelsPerSecond: 20,
      mode: 'ripple',
      onClipMove,
    })
    const clips = container.querySelectorAll('[data-mol-id="track-lane-clip"]')
    // Drag v1 forward by 2s.
    dispatchPointer(clips[0], 'pointerdown', { clientX: 0, pointerId: 1 })
    dispatchPointer(window, 'pointermove', { clientX: 40, pointerId: 1 })
    dispatchPointer(window, 'pointerup', { clientX: 40, pointerId: 1 })
    // Should produce updates for v1, v2, AND v3 (all later or equal).
    const ids = new Set(onClipMove.mock.calls.map((c) => c[0]))
    expect(ids.has('v1')).toBe(true)
    expect(ids.has('v2')).toBe(true)
    expect(ids.has('v3')).toBe(true)
    // Audio track clips should NOT be touched.
    expect(ids.has('a1')).toBe(false)
    expect(ids.has('a2')).toBe(false)
  })

  it('ripple-mode trackId argument is the track id, not undefined', async () => {
    const onClipMove = vi.fn()
    const container = await render({
      tracks: baseTracks,
      currentTime: 0,
      duration: 60,
      pixelsPerSecond: 20,
      onClipMove,
    })
    const clips = container.querySelectorAll('[data-mol-id="track-lane-clip"]')
    dispatchPointer(clips[0], 'pointerdown', { clientX: 0, pointerId: 1 })
    dispatchPointer(window, 'pointermove', { clientX: 40, pointerId: 1 })
    dispatchPointer(window, 'pointerup', { clientX: 40, pointerId: 1 })
    for (const call of onClipMove.mock.calls) {
      expect(call[2]).toBe('tv')
    }
  })

  it('forwards onClipResize with the track id', async () => {
    const onClipResize = vi.fn()
    const container = await render({
      tracks: baseTracks,
      currentTime: 0,
      duration: 60,
      pixelsPerSecond: 20,
      onClipResize,
    })
    const handles = container.querySelectorAll('[data-mol-id="track-lane-clip-handle"]')
    dispatchPointer(handles[0], 'pointerdown', { clientX: 40, pointerId: 1 })
    dispatchPointer(window, 'pointermove', { clientX: 80, pointerId: 1 }) // +40px = +2s
    dispatchPointer(window, 'pointerup', { clientX: 80, pointerId: 1 })
    expect(onClipResize).toHaveBeenCalled()
    const last = onClipResize.mock.calls[onClipResize.mock.calls.length - 1]
    expect(last[0]).toBe('v1')
    expect(last[2]).toBe('tv') // track id
  })

  it('renders a zoom slider with min/max wired to props', async () => {
    const onZoomChange = vi.fn()
    const container = await render({
      tracks: baseTracks,
      currentTime: 0,
      duration: 60,
      pixelsPerSecond: 50,
      zoomMin: 5,
      zoomMax: 150,
      onZoomChange,
    })
    const slider = container.querySelector<HTMLInputElement>(
      '[data-mol-id="video-timeline-zoom-slider"]',
    )
    expect(slider?.getAttribute('min')).toBe('5')
    expect(slider?.getAttribute('max')).toBe('150')
    expect(slider?.value).toBe('50')
  })

  it('consumes Ctrl-wheel over the tracks and leaves ordinary scrolling alone', async () => {
    const onZoomChange = vi.fn()
    const container = await render({
      tracks: baseTracks,
      currentTime: 0,
      duration: 60,
      onZoomChange,
    })
    const tracks = container.querySelector('[data-mol-id="video-timeline-tracks"]')
    if (!tracks) throw new Error('tracks missing')
    expect(fireWheel(tracks, { deltaY: -100 })).toBe(true)
    expect(onZoomChange).not.toHaveBeenCalled()
    expect(fireWheel(tracks, { deltaY: -100, ctrlKey: true })).toBe(false)
    expect(onZoomChange).toHaveBeenCalledExactlyOnceWith(22)
  })

  it('leaves a Ctrl-wheel with no vertical delta alone', async () => {
    const onZoomChange = vi.fn()
    const container = await render({
      tracks: baseTracks,
      currentTime: 0,
      duration: 60,
      onZoomChange,
    })
    const tracks = container.querySelector('[data-mol-id="video-timeline-tracks"]')
    if (!tracks) throw new Error('tracks missing')
    // A trackpad pinch reports no vertical delta where it starts and ends.
    expect(fireWheel(tracks, { deltaY: 0, deltaX: -3, ctrlKey: true })).toBe(true)
    expect(onZoomChange).not.toHaveBeenCalled()
  })

  it('starts and stops consuming Ctrl-wheel as onZoomChange comes and goes', async () => {
    const onZoomChange = vi.fn()
    const { container, setProps } = await renderUpdatable({
      tracks: baseTracks,
      currentTime: 0,
      duration: 60,
    })
    const tracksOf = (): Element => {
      const element = container.querySelector('[data-mol-id="video-timeline-tracks"]')
      if (!element) throw new Error('tracks missing')
      return element
    }
    // No handler yet: the browser keeps the wheel.
    expect(fireWheel(tracksOf(), { deltaY: -100, ctrlKey: true })).toBe(true)
    // One arrives later: from now on the timeline consumes the gesture.
    await setProps({ onZoomChange })
    expect(fireWheel(tracksOf(), { deltaY: -100, ctrlKey: true })).toBe(false)
    expect(onZoomChange).toHaveBeenCalledExactlyOnceWith(22)
    // Taken away again: the listener goes with it.
    await setProps({ onZoomChange: undefined })
    expect(fireWheel(tracksOf(), { deltaY: -100, ctrlKey: true })).toBe(true)
    expect(onZoomChange).toHaveBeenCalledTimes(1)
  })

  it('zoom-out button steps out by the same factor the wheel uses', async () => {
    const onZoomChange = vi.fn()
    const container = await render({
      tracks: baseTracks,
      currentTime: 0,
      duration: 60,
      pixelsPerSecond: 33,
      onZoomChange,
    })
    const btn = container.querySelector<HTMLButtonElement>(
      '[data-mol-id="video-timeline-zoom-out"]',
    )
    btn?.click()
    // One step out of 33 is exactly 30 (33 * (1 / 1.1)); dividing by 1.1 rounds just below it.
    expect(onZoomChange).toHaveBeenCalledExactlyOnceWith(30)
  })

  it('zoom-out button calls onZoomChange with a smaller, clamped value', async () => {
    const onZoomChange = vi.fn()
    const container = await render({
      tracks: baseTracks,
      currentTime: 0,
      duration: 60,
      pixelsPerSecond: 20,
      onZoomChange,
    })
    const btn = container.querySelector<HTMLButtonElement>(
      '[data-mol-id="video-timeline-zoom-out"]',
    )
    btn?.click()
    expect(onZoomChange).toHaveBeenCalled()
    const arg = onZoomChange.mock.calls[0][0] as number
    expect(arg).toBeLessThan(20)
    expect(arg).toBeGreaterThanOrEqual(2)
  })

  it('exposes mode via data-mode and uses an aria-labelled root', async () => {
    const container = await render({
      tracks: baseTracks,
      currentTime: 0,
      duration: 60,
      mode: 'insert',
    })
    const root = container.querySelector('[data-mol-id="video-timeline"]')
    expect(root?.getAttribute('data-mode')).toBe('insert')
    expect(root?.getAttribute('aria-label')).toBeTruthy()
  })

  it('falls back to a translated kind label when track.name is omitted', async () => {
    const tracksNoName: Track[] = [{ id: 'tv', kind: 'subtitle', clips: [] }]
    const container = await render({ tracks: tracksNoName, currentTime: 0, duration: 10 })
    const name = container.querySelector('[data-mol-id="track-lane-name"]')
    // Default English fallback for `subtitle`.
    expect(name?.textContent?.trim()).toBe('Subtitle')
  })
})
