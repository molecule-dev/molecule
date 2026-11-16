// @vitest-environment jsdom
/**
 * Unit tests of `TrackLane` — the port of
 * `@molecule/app-feature-track-lane-react`'s own suite. The React suite renders
 * the component with mocked UI dependencies and asserts the markup; this port
 * mounts the same mocked tree through Angular's real renderer (the same
 * `createApplication` + JIT host approach the conformance kit's Angular
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

import type { Clip } from '../types.js'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `cursorPointer`), so tests can assert which cm.* class was applied without a
// real bond — the same mock the React tests use.
vi.mock('@molecule/app-ui', () => ({
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
vi.mock('@molecule/app-angular', () => ({
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

const { clampClipMove, clipToPixels, pixelsToTime, TrackLane } = await import('../index.js')

/** The host template every test mounts: one attribute-selector lane with every input bound. */
const TEMPLATE = `<div mol-track-lane [name]="p['name']" [clips]="p['clips']" [pixelsPerSecond]="p['pixelsPerSecond']" [lane]="p['lane']" [height]="p['height']" [onClipMove]="p['onClipMove']" [onClipResize]="p['onClipResize']" [onClipClick]="p['onClipClick']" [selectedClipId]="p['selectedClipId']" [className]="p['className']"></div>`

/** A mounted spec host: its DOM and a teardown. */
interface Mounted {
  /** The host element whose children the component template produced. */
  readonly host: HTMLElement
  /** Destroys the app and removes the host. */
  destroy(): Promise<void>
}

/**
 * Mounts the lane through a JIT host template, written the way an Angular app
 * would write it.
 *
 * @param props - The props object the template reads as `p['name']`.
 * @returns The mounted host.
 */
async function mount(props: Record<string, unknown>): Promise<Mounted> {
  const Host = Component({
    selector: 'mol-spec-host',
    standalone: true,
    imports: [TrackLane as Type<unknown>],
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
    destroy: async () => {
      appRef.destroy()
      host.remove()
    },
  }
}

const mounted: Mounted[] = []

/**
 * Mounts a `TrackLane` with the given props.
 *
 * @param props - Component props.
 * @returns The host element.
 */
const render = async (props: Record<string, unknown>): Promise<HTMLElement> => {
  const m = await mount(props)
  mounted.push(m)
  return m.host
}

/**
 * Dispatch a real `PointerEvent` so the global window listener picks it up.
 *
 * @param target - Element to dispatch from (for pointerdown) or window (for move/up).
 * @param type - Event type.
 * @param init - Pointer init properties.
 */
function dispatchPointer(
  target: Element | Window,
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

const baseClips: Clip[] = [
  { id: 'c1', startTime: 0, duration: 2, color: '#0af', label: 'Kick' },
  { id: 'c2', startTime: 4, duration: 1.5, label: 'Snare' },
  { id: 'c3', startTime: 8, duration: 3 },
]

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
  document.body.innerHTML = ''
})

describe('clipToPixels', () => {
  it('projects startTime and duration through pixelsPerSecond', () => {
    expect(clipToPixels({ startTime: 0, duration: 2 }, 20)).toEqual({ left: 0, width: 40 })
    expect(clipToPixels({ startTime: 4, duration: 1.5 }, 20)).toEqual({ left: 80, width: 30 })
  })

  it('floors width at 1 pixel for sub-pixel durations', () => {
    expect(clipToPixels({ startTime: 0, duration: 0.0001 }, 20).width).toBe(1)
  })

  it('falls back to scale=1 when pixelsPerSecond is zero or negative', () => {
    expect(clipToPixels({ startTime: 3, duration: 2 }, 0)).toEqual({ left: 3, width: 2 })
    expect(clipToPixels({ startTime: 3, duration: 2 }, -10)).toEqual({ left: 3, width: 2 })
  })
})

describe('pixelsToTime', () => {
  it('inverts pixelsPerSecond and clamps to >= 0', () => {
    expect(pixelsToTime(40, 20)).toBe(2)
    expect(pixelsToTime(-30, 20)).toBe(0)
  })
})

describe('clampClipMove', () => {
  it('returns the input when non-negative, else 0', () => {
    expect(clampClipMove(5)).toBe(5)
    expect(clampClipMove(0)).toBe(0)
    expect(clampClipMove(-1)).toBe(0)
  })
})

describe('<TrackLane>', () => {
  it('renders a clip per item with labelled clips visible', async () => {
    const container = await render({ name: 'Drums', clips: baseClips, pixelsPerSecond: 20 })
    const clipEls = container.querySelectorAll('[data-mol-id="track-lane-clip"]')
    expect(clipEls.length).toBe(3)
    const labels = Array.from(
      container.querySelectorAll('[data-mol-id="track-lane-clip-label"]'),
    ).map((el) => el.textContent?.trim())
    expect(labels).toEqual(['Kick', 'Snare'])
  })

  it('renders the lane header with the supplied name', async () => {
    const container = await render({ name: 'Drums', clips: baseClips })
    const nameEl = container.querySelector('[data-mol-id="track-lane-name"]')
    expect(nameEl?.textContent?.trim()).toBe('Drums')
  })

  it('omits the header when name and lane are both undefined', async () => {
    const container = await render({ clips: baseClips })
    expect(container.querySelector('[data-mol-id="track-lane-header"]')).toBeNull()
  })

  it('positions clips by clipToPixels', async () => {
    const container = await render({ clips: baseClips, pixelsPerSecond: 20 })
    const clipEls = container.querySelectorAll<HTMLElement>('[data-mol-id="track-lane-clip"]')
    expect(clipEls[0].style.left).toBe('0px')
    expect(clipEls[0].style.width).toBe('40px')
    expect(clipEls[1].style.left).toBe('80px')
    expect(clipEls[1].style.width).toBe('30px')
    expect(clipEls[2].style.left).toBe('160px')
    expect(clipEls[2].style.width).toBe('60px')
  })

  it('marks the selected clip with data-selected="true" and aria-pressed', async () => {
    const container = await render({ clips: baseClips, selectedClipId: 'c2' })
    const clipEls = container.querySelectorAll('[data-mol-id="track-lane-clip"]')
    expect(clipEls[0].getAttribute('data-selected')).toBe('false')
    expect(clipEls[1].getAttribute('data-selected')).toBe('true')
    expect(clipEls[1].getAttribute('aria-pressed')).toBe('true')
  })

  it('forwards lane id via data-lane and to handlers', async () => {
    const onClipClick = vi.fn()
    const container = await render({ clips: baseClips, lane: 'lane-7', onClipClick })
    expect(container.querySelector('[data-mol-id="track-lane"]')?.getAttribute('data-lane')).toBe(
      'lane-7',
    )
    const clipEls = container.querySelectorAll('[data-mol-id="track-lane-clip"]')
    dispatchPointer(clipEls[0], 'pointerdown', { clientX: 50, pointerId: 1 })
    dispatchPointer(window, 'pointerup', { clientX: 50, pointerId: 1 })
    expect(onClipClick).toHaveBeenCalledWith('c1', 'lane-7')
  })

  it('fires onClipClick when pointerdown -> pointerup with no movement', async () => {
    const onClipClick = vi.fn()
    const onClipMove = vi.fn()
    const container = await render({ clips: baseClips, onClipClick, onClipMove })
    const clipEls = container.querySelectorAll('[data-mol-id="track-lane-clip"]')
    dispatchPointer(clipEls[1], 'pointerdown', { clientX: 100, pointerId: 1 })
    dispatchPointer(window, 'pointerup', { clientX: 100, pointerId: 1 })
    expect(onClipClick).toHaveBeenCalledTimes(1)
    expect(onClipClick).toHaveBeenCalledWith('c2', undefined)
    expect(onClipMove).not.toHaveBeenCalled()
  })

  it('fires onClipMove (not onClipClick) when pointer moves past the drag threshold', async () => {
    const onClipClick = vi.fn()
    const onClipMove = vi.fn()
    const container = await render({
      clips: baseClips,
      pixelsPerSecond: 20,
      onClipClick,
      onClipMove,
    })
    const clipEls = container.querySelectorAll('[data-mol-id="track-lane-clip"]')
    dispatchPointer(clipEls[1], 'pointerdown', { clientX: 100, pointerId: 1 })
    dispatchPointer(window, 'pointermove', { clientX: 140, pointerId: 1 }) // +40px = +2s
    dispatchPointer(window, 'pointerup', { clientX: 140, pointerId: 1 })
    expect(onClipMove).toHaveBeenCalled()
    const lastCall = onClipMove.mock.calls[onClipMove.mock.calls.length - 1]
    expect(lastCall[0]).toBe('c2')
    expect(lastCall[1]).toBeCloseTo(6, 5) // origin 4 + 2 = 6
    expect(onClipClick).not.toHaveBeenCalled()
  })

  it('clamps onClipMove startTime to >= 0', async () => {
    const onClipMove = vi.fn()
    const container = await render({ clips: baseClips, pixelsPerSecond: 20, onClipMove })
    const clipEls = container.querySelectorAll('[data-mol-id="track-lane-clip"]')
    // Drag clip 'c1' (origin startTime=0) to the left by 200px
    dispatchPointer(clipEls[0], 'pointerdown', { clientX: 200, pointerId: 1 })
    dispatchPointer(window, 'pointermove', { clientX: 0, pointerId: 1 })
    const last = onClipMove.mock.calls[onClipMove.mock.calls.length - 1]
    expect(last[1]).toBe(0)
  })

  it('fires onClipResize when the right-edge handle is dragged', async () => {
    const onClipResize = vi.fn()
    const onClipMove = vi.fn()
    const container = await render({
      clips: baseClips,
      pixelsPerSecond: 20,
      onClipResize,
      onClipMove,
    })
    const handle = container.querySelectorAll('[data-mol-id="track-lane-clip-handle"]')[1]
    dispatchPointer(handle, 'pointerdown', { clientX: 200, pointerId: 1 })
    dispatchPointer(window, 'pointermove', { clientX: 240, pointerId: 1 }) // +40px = +2s
    dispatchPointer(window, 'pointerup', { clientX: 240, pointerId: 1 })
    expect(onClipResize).toHaveBeenCalled()
    const last = onClipResize.mock.calls[onClipResize.mock.calls.length - 1]
    expect(last[0]).toBe('c2')
    expect(last[1]).toBeCloseTo(3.5, 5) // origin 1.5 + 2 = 3.5
    expect(onClipMove).not.toHaveBeenCalled()
  })

  it('floors resize duration at MIN_CLIP_DURATION_SECONDS', async () => {
    const onClipResize = vi.fn()
    const container = await render({ clips: baseClips, pixelsPerSecond: 20, onClipResize })
    const handle = container.querySelectorAll('[data-mol-id="track-lane-clip-handle"]')[1]
    // Drag handle far left to attempt a negative duration
    dispatchPointer(handle, 'pointerdown', { clientX: 200, pointerId: 1 })
    dispatchPointer(window, 'pointermove', { clientX: 0, pointerId: 1 })
    const last = onClipResize.mock.calls[onClipResize.mock.calls.length - 1]
    expect(last[1]).toBeGreaterThan(0)
    expect(last[1]).toBeLessThanOrEqual(0.05 + 1e-9)
  })

  it('uses translated aria labels for the lane and clip handles', async () => {
    const container = await render({ name: 'Drums', clips: baseClips })
    const lane = container.querySelector('[data-mol-id="track-lane"]')
    expect(lane?.getAttribute('aria-label')).toBeTruthy()
    const handle = container.querySelector('[data-mol-id="track-lane-clip-handle"]')
    expect(handle?.getAttribute('aria-label')).toBeTruthy()
  })

  it('renders an empty body when clips is []', async () => {
    const container = await render({ name: 'Empty', clips: [] })
    expect(container.querySelectorAll('[data-mol-id="track-lane-clip"]').length).toBe(0)
    expect(container.querySelector('[data-mol-id="track-lane-body"]')).not.toBeNull()
  })
})
