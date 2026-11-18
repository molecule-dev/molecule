// @vitest-environment jsdom
/**
 * Unit tests of `VideoScrubber` — the port of
 * `@molecule/app-feature-video-scrubber-react`'s own suite: the same test names
 * and the same behavioral assertions, mounted through Angular's real renderer
 * (the same `createApplication` + JIT host approach the conformance kit's
 * Angular adapter uses) with the mocked ClassMap the React suite uses.
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
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setClassMap, type UIClassMap } from '@molecule/app-ui'

import type { Thumbnail } from '../types.js'

const { VideoScrubber } = await import('../video-scrubber.component.js')
const {
  computeFilmstripTicks,
  formatFrameNumber,
  frameToTime,
  selectClosestThumbnail,
  snapTimeToFrame,
  timeToFrame,
} = await import('../video-scrubber.component.js')

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

/** The host template, written the way an Angular app writes the component. */
const TEMPLATE = `<div mol-video-scrubber [duration]="p['duration']" [currentTime]="p['currentTime']" [fps]="p['fps']" [thumbnails]="p['thumbnails']" [onSeek]="p['onSeek']" [showFrameNumber]="p['showFrameNumber']" [thumbnailCount]="p['thumbnailCount']" [thumbnailHeight]="p['thumbnailHeight']" [id]="p['id']" [className]="p['className']"></div>`

/** A mounted spec host: its DOM, a flush and a teardown. */
interface Mounted {
  /** The host element whose child is the component. */
  readonly host: HTMLElement
  /** Flushes change detection. */
  flush(): void
  /** Destroys the app and removes the host. */
  destroy(): Promise<void>
}

/**
 * Mounts one standalone component through a JIT host template.
 *
 * @param component - The component class under test.
 * @param props - The props object the template reads as `p['key']`.
 * @returns The mounted host.
 */
async function mount(
  component: Type<unknown>,
  props: Record<string, unknown> = {},
): Promise<Mounted> {
  const Host = Component({
    selector: 'mol-spec-host',
    standalone: true,
    imports: [component],
    changeDetection: ChangeDetectionStrategy.Default,
    template: TEMPLATE,
  })(
    class SpecHost {
      /** The props the template binds. */
      p: Record<string, unknown> = props
    },
  )
  const appRef: ApplicationRef = await createApplication({
    providers: [provideZonelessChangeDetection()],
  })
  const ref: ComponentRef<{ p: Record<string, unknown> }> = createComponent(Host, {
    environmentInjector: appRef.injector,
  })
  const host = ref.location.nativeElement as HTMLElement
  document.body.appendChild(host)
  appRef.attachView(ref.hostView)
  appRef.tick()
  return {
    host,
    flush: () => appRef.tick(),
    destroy: async () => {
      appRef.destroy()
      host.remove()
    },
  }
}

/** Mounted hosts, torn down after each test. */
const mounted: Mounted[] = []

/**
 * Mounts a {@link VideoScrubber} and returns its host element.
 *
 * @param props - The scrubber props.
 * @returns The host element holding the rendered component.
 */
async function render(props: Record<string, unknown>): Promise<HTMLElement> {
  const instance = await mount(VideoScrubber, props)
  mounted.push(instance)
  return instance.host
}

/**
 * Dispatch a real `PointerEvent` so the component's listeners pick it up.
 *
 * @param target - Target element.
 * @param type - Pointer event type.
 * @param init - Pointer init properties.
 */
function dispatchPointer(
  target: Element,
  type: 'pointerdown' | 'pointermove' | 'pointerup',
  init: { clientX?: number; clientY?: number; pointerId?: number; button?: number },
): void {
  const event = new Event(type, { bubbles: true, cancelable: true }) as Event & {
    clientX: number
    clientY: number
    pointerId: number
    button: number
  }
  event.clientX = init.clientX ?? 0
  event.clientY = init.clientY ?? 0
  event.pointerId = init.pointerId ?? 1
  event.button = init.button ?? 0
  target.dispatchEvent(event)
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

afterEach(async () => {
  for (const instance of mounted.splice(0)) await instance.destroy()
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
  it('renders the configured number of filmstrip cells', async () => {
    const container = await render({ duration: 60, currentTime: 0, thumbnailCount: 8 })
    const cells = container.querySelectorAll('[data-mol-id="video-scrubber-cell"]')
    expect(cells.length).toBe(8)
  })

  it('positions the playhead at currentTime / duration as a percentage', async () => {
    const container = await render({ duration: 60, currentTime: 15 })
    const playhead = container.querySelector<HTMLElement>('[data-mol-id="video-scrubber-playhead"]')
    expect(playhead?.style.left).toBe('25%') // 15 / 60
  })

  it('clamps the playhead percentage to at most 100%', async () => {
    const container = await render({ duration: 60, currentTime: 120 })
    const playhead = container.querySelector<HTMLElement>('[data-mol-id="video-scrubber-playhead"]')
    expect(playhead?.style.left).toBe('100%')
  })

  it('shows the frame readout by default and exposes the current frame in data-frame', async () => {
    const container = await render({ duration: 60, currentTime: 1, fps: 24 })
    const root = container.querySelector('[data-mol-id="video-scrubber"]')
    expect(root?.getAttribute('data-frame')).toBe('24') // 1s * 24fps = 24
    const readout = container.querySelector('[data-mol-id="video-scrubber-frame-current"]')
    expect(readout?.textContent).toBe('#24')
  })

  it('hides the frame readout when showFrameNumber is false', async () => {
    const container = await render({
      duration: 60,
      currentTime: 1,
      fps: 24,
      showFrameNumber: false,
    })
    expect(container.querySelector('[data-mol-id="video-scrubber-frame-readout"]')).toBeNull()
  })

  it('uses the closest thumbnail src as the cell background', async () => {
    const container = await render({
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

  it('emits a frame-snapped time on click-anywhere seek', async () => {
    const onSeek = vi.fn()
    const container = await render({ duration: 60, currentTime: 0, fps: 24, onSeek })
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

  it('clamps onSeek argument into [0, duration]', async () => {
    const onSeek = vi.fn()
    const container = await render({ duration: 10, currentTime: 0, fps: 24, onSeek })
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
    // Way before the left edge.
    dispatchPointer(strip, 'pointerdown', { clientX: -500, pointerId: 2 })
    expect(onSeek).toHaveBeenLastCalledWith(0)
  })

  it('continues to scrub on pointermove while dragging', async () => {
    const onSeek = vi.fn()
    const container = await render({ duration: 60, currentTime: 0, fps: 24, onSeek })
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

  it('arrow-right steps forward exactly one frame; arrow-left steps back one frame', async () => {
    const onSeek = vi.fn()
    const container = await render({ duration: 60, currentTime: 1, fps: 24, onSeek })
    const strip = container.querySelector<HTMLElement>('[data-mol-id="video-scrubber-strip"]')
    if (!strip) throw new Error('strip missing')
    strip.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
    expect(onSeek).toHaveBeenLastCalledWith(frameToTime(25, 24)) // 1s = frame 24, +1 = 25
    strip.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }))
    expect(onSeek).toHaveBeenLastCalledWith(frameToTime(23, 24))
  })

  it('shift+arrows step ±1 second', async () => {
    const onSeek = vi.fn()
    const container = await render({ duration: 60, currentTime: 5, fps: 24, onSeek })
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

  it('PageUp/PageDown step ±10 frames', async () => {
    const onSeek = vi.fn()
    const container = await render({ duration: 60, currentTime: 2, fps: 24, onSeek })
    const strip = container.querySelector<HTMLElement>('[data-mol-id="video-scrubber-strip"]')
    if (!strip) throw new Error('strip missing')
    strip.dispatchEvent(new KeyboardEvent('keydown', { key: 'PageDown', bubbles: true }))
    // Frame 48 + 10 = 58 → 58/24
    expect(onSeek).toHaveBeenLastCalledWith(frameToTime(58, 24))
    strip.dispatchEvent(new KeyboardEvent('keydown', { key: 'PageUp', bubbles: true }))
    expect(onSeek).toHaveBeenLastCalledWith(frameToTime(38, 24))
  })

  it('Home jumps to 0; End jumps to duration', async () => {
    const onSeek = vi.fn()
    const container = await render({ duration: 60, currentTime: 5, fps: 24, onSeek })
    const strip = container.querySelector<HTMLElement>('[data-mol-id="video-scrubber-strip"]')
    if (!strip) throw new Error('strip missing')
    strip.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }))
    expect(onSeek).toHaveBeenLastCalledWith(0)
    strip.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }))
    expect(onSeek).toHaveBeenLastCalledWith(60)
  })

  it('keyboard handler clamps stepping at the bounds', async () => {
    const onSeek = vi.fn()
    const container = await render({ duration: 60, currentTime: 0, fps: 24, onSeek })
    const strip = container.querySelector<HTMLElement>('[data-mol-id="video-scrubber-strip"]')
    if (!strip) throw new Error('strip missing')
    strip.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }))
    expect(onSeek).toHaveBeenLastCalledWith(0)
  })

  it('exposes aria-valuenow / valuemax on the strip', async () => {
    const container = await render({ duration: 60, currentTime: 3.5 })
    const strip = container.querySelector('[data-mol-id="video-scrubber-strip"]')
    expect(strip?.getAttribute('aria-valuenow')).toBe('3.5')
    expect(strip?.getAttribute('aria-valuemax')).toBe('60')
    expect(strip?.getAttribute('role')).toBe('slider')
  })

  it('forwards id and uses an aria-labelled root', async () => {
    const container = await render({ duration: 60, currentTime: 0, id: 'my-scrubber' })
    const root = container.querySelector('[data-mol-id="video-scrubber"]')
    expect(root?.id).toBe('my-scrubber')
    expect(root?.getAttribute('aria-label')).toBeTruthy()
  })

  it('falls back to fps=24 when fps is invalid', async () => {
    const container = await render({ duration: 60, currentTime: 1, fps: 0 })
    const root = container.querySelector('[data-mol-id="video-scrubber"]')
    expect(root?.getAttribute('data-fps')).toBe('24')
    expect(root?.getAttribute('data-frame')).toBe('24')
  })
})
