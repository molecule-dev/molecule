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
  type TemplateRef,
  type Type,
  ViewChild,
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
vi.mock('@molecule/app-angular', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

const { clampClipMove, clipToPixels, pixelsToTime, TrackLane } = await import('../index.js')

/**
 * The host template every test mounts: one attribute-selector lane with every
 * input bound, and the template a clip label renders a control from.
 */
const TEMPLATE = `<ng-template #labelControl><button>Go</button></ng-template><div mol-track-lane [name]="p['name']" [clips]="p['clips']" [pixelsPerSecond]="p['pixelsPerSecond']" [lane]="p['lane']" [height]="p['height']" [onClipMove]="p['onClipMove']" [onClipResize]="p['onClipResize']" [onClipClick]="p['onClipClick']" [selectedClipId]="p['selectedClipId']" [className]="p['className']"></div>`

/** The props the host template binds, and the template its `ng-template` holds. */
class SpecHost {
  /** The props the template binds. */
  p: Record<string, unknown> = {}
  /** The template a clip label renders a control from. */
  labelControl?: TemplateRef<unknown>
}
// The query as a property decorator applied by call, as the component above is.
ViewChild('labelControl', { static: true })(SpecHost.prototype, 'labelControl')

/** A mounted spec host: its DOM, its re-render and a teardown. */
interface Mounted {
  /** The host element whose children the component template produced. */
  readonly host: HTMLElement
  /** The template a clip label renders a control from. */
  readonly labelControl: TemplateRef<unknown>
  /** Replaces the lane's props (merged over the current ones) and re-renders it. */
  setProps(next: Record<string, unknown>): void
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
    changeDetection: ChangeDetectionStrategy.Eager,
    template: TEMPLATE,
  })(SpecHost)
  const appRef: ApplicationRef = await createApplication({
    providers: [provideZonelessChangeDetection()],
  })
  const ref: ComponentRef<SpecHost> = createComponent(Host, {
    environmentInjector: appRef.injector,
  })
  ref.instance.p = props
  const host = ref.location.nativeElement as HTMLElement
  document.body.appendChild(host)
  appRef.attachView(ref.hostView)
  appRef.tick()
  const control = ref.instance.labelControl
  if (!control) throw new Error('the spec host has no label template')
  return {
    host,
    labelControl: control,
    setProps: (next) => {
      ref.instance.p = { ...ref.instance.p, ...next }
      // Zoneless: tick() only refreshes views marked dirty, and nothing marks
      // the host after a plain field write, so mark it before ticking.
      ref.changeDetectorRef.markForCheck()
      appRef.tick()
    },
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
 * The mounted lane behind a host element `render` returned.
 *
 * @param host - The element `render` returned.
 * @returns The mounted lane.
 */
function laneOf(host: HTMLElement): Mounted {
  const m = mounted.find((entry) => entry.host === host)
  if (!m) throw new Error('no lane is mounted in this host')
  return m
}

/**
 * The element of the clip with the given id.
 *
 * @param container - The mounted lane's host element.
 * @param id - The clip id.
 * @returns The clip block.
 */
function clipOf(container: HTMLElement, id: string): Element {
  const clip = container.querySelector(`[data-mol-id="track-lane-clip"][data-clip-id="${id}"]`)
  if (!clip) throw new Error(`clip ${id} missing`)
  return clip
}

/** One pointer-capture call a test recorded: the verb, the element and the pointer id. */
type CaptureCall = ['set' | 'release', Element, number]

/** Puts the page's pointer capture back after each test. */
const restoreCapture: Array<() => void> = []

/**
 * Records pointer capture for the current test (jsdom has none of its own).
 *
 * @returns Each call so far.
 */
function recordPointerCapture(): CaptureCall[] {
  const calls: CaptureCall[] = []
  const record = (verb: 'set' | 'release') =>
    function (this: Element, pointerId: number): void {
      calls.push([verb, this, pointerId])
    }
  const own = {
    setPointerCapture: Object.getOwnPropertyDescriptor(Element.prototype, 'setPointerCapture'),
    releasePointerCapture: Object.getOwnPropertyDescriptor(
      Element.prototype,
      'releasePointerCapture',
    ),
  }
  Object.defineProperties(Element.prototype, {
    setPointerCapture: { configurable: true, value: record('set') },
    releasePointerCapture: { configurable: true, value: record('release') },
  })
  restoreCapture.push(() => {
    for (const name of ['setPointerCapture', 'releasePointerCapture'] as const) {
      if (own[name]) Object.defineProperty(Element.prototype, name, own[name])
      else delete (Element.prototype as Partial<Element>)[name]
    }
  })
  return calls
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
  type: 'pointerdown' | 'pointermove' | 'pointerup' | 'pointercancel',
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
  for (const restore of restoreCapture.splice(0)) restore()
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

  it('does not activate a clip when a stationary contact is canceled', async () => {
    const onClipClick = vi.fn()
    const container = await render({
      clips: [{ id: 'clip', startTime: 0, duration: 2 }],
      onClipClick,
    })
    const clip = container.querySelector('[data-mol-id="track-lane-clip"]')
    if (!clip) throw new Error('clip missing')
    dispatchPointer(clip, 'pointerdown', { pointerId: 3 })
    dispatchPointer(window, 'pointercancel', { pointerId: 3 })
    expect(onClipClick).not.toHaveBeenCalled()
  })

  // Beyond React's suite: the gesture rules React's lane gets from its UI
  // kit's drag binding, which React's own tests do not pin.
  it('does not activate a clip when the window loses focus before the release', async () => {
    const onClipClick = vi.fn()
    const container = await render({ clips: baseClips, onClipClick })
    dispatchPointer(clipOf(container, 'c1'), 'pointerdown', { clientX: 100, pointerId: 1 })
    window.dispatchEvent(new FocusEvent('blur'))
    dispatchPointer(window, 'pointerup', { clientX: 100, pointerId: 1 })
    expect(onClipClick).not.toHaveBeenCalled()
  })

  it('stops reporting moves when the window loses focus mid-drag', async () => {
    const onClipMove = vi.fn()
    const container = await render({ clips: baseClips, onClipMove })
    dispatchPointer(clipOf(container, 'c2'), 'pointerdown', { clientX: 100, pointerId: 1 })
    dispatchPointer(window, 'pointermove', { clientX: 140, pointerId: 1 })
    window.dispatchEvent(new FocusEvent('blur'))
    dispatchPointer(window, 'pointermove', { clientX: 180, pointerId: 1 })
    expect(onClipMove).toHaveBeenCalledTimes(1)
  })

  it('cancels the gesture when the pressed clip loses its pointer capture', async () => {
    const onClipClick = vi.fn()
    const container = await render({ clips: baseClips, onClipClick })
    const clip = clipOf(container, 'c1')
    clip.dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true, button: 0, clientX: 100, pointerId: 1 }),
    )
    clip.dispatchEvent(new PointerEvent('lostpointercapture', { pointerId: 1 }))
    dispatchPointer(window, 'pointerup', { clientX: 100, pointerId: 1 })
    expect(onClipClick).not.toHaveBeenCalled()
  })

  it('does not click when the release is past the drag threshold without a move', async () => {
    const onClipClick = vi.fn()
    const container = await render({ clips: baseClips, onClipClick })
    dispatchPointer(clipOf(container, 'c1'), 'pointerdown', { clientX: 100, pointerId: 1 })
    dispatchPointer(window, 'pointerup', { clientX: 110, pointerId: 1 })
    expect(onClipClick).not.toHaveBeenCalled()
  })

  it('ignores a press from a non-primary pointer', async () => {
    const onClipClick = vi.fn()
    const container = await render({ clips: baseClips, onClipClick })
    clipOf(container, 'c1').dispatchEvent(
      new PointerEvent('pointerdown', {
        bubbles: true,
        cancelable: true,
        clientX: 100,
        button: 0,
        pointerId: 2,
        pointerType: 'touch',
        isPrimary: false,
      }),
    )
    dispatchPointer(window, 'pointerup', { clientX: 100, pointerId: 2 })
    expect(onClipClick).not.toHaveBeenCalled()
  })

  it('lets an ancestor see the pointer press', async () => {
    const onPointerDown = vi.fn()
    window.addEventListener('pointerdown', onPointerDown)
    try {
      const container = await render({ clips: baseClips })
      dispatchPointer(clipOf(container, 'c1'), 'pointerdown', { clientX: 100, pointerId: 1 })
      expect(onPointerDown).toHaveBeenCalledTimes(1)
    } finally {
      window.removeEventListener('pointerdown', onPointerDown)
    }
  })

  it('still fires onClipClick when an ancestor stops the release event', async () => {
    const onClipClick = vi.fn()
    const container = await render({ clips: baseClips, onClipClick })
    const stop = (event: Event): void => event.stopPropagation()
    container.addEventListener('pointerup', stop)
    dispatchPointer(clipOf(container, 'c1'), 'pointerdown', { clientX: 100, pointerId: 1 })
    dispatchPointer(clipOf(container, 'c1'), 'pointerup', { clientX: 100, pointerId: 1 })
    expect(onClipClick).toHaveBeenCalledTimes(1)
  })

  it('captures the pressed clip pointer for the gesture', async () => {
    const calls = recordPointerCapture()
    const container = await render({ clips: baseClips })
    const clip = clipOf(container, 'c2')
    dispatchPointer(clip, 'pointerdown', { clientX: 100, pointerId: 1 })
    expect(calls).toEqual([['set', clip, 1]])
    dispatchPointer(window, 'pointerup', { clientX: 100, pointerId: 1 })
    expect(calls).toEqual([
      ['set', clip, 1],
      ['release', clip, 1],
    ])
  })

  it('cancels the gesture when the clip leaves the lane mid-drag', async () => {
    const onClipMove = vi.fn()
    const container = await render({ clips: baseClips, onClipMove })
    dispatchPointer(clipOf(container, 'c2'), 'pointerdown', { clientX: 100, pointerId: 1 })
    dispatchPointer(window, 'pointermove', { clientX: 140, pointerId: 1 })
    laneOf(container).setProps({ clips: [baseClips[0], baseClips[2]] })
    dispatchPointer(window, 'pointermove', { clientX: 180, pointerId: 1 })
    expect(onClipMove).toHaveBeenCalledTimes(1)
  })

  it('leaves a press on a control inside a clip alone', async () => {
    const onClipClick = vi.fn()
    const onClipMove = vi.fn()
    const container = await render({ clips: baseClips, onClipClick, onClipMove })
    // The label draws a control inside the clip.
    laneOf(container).setProps({
      clips: [{ id: 'c1', startTime: 0, duration: 2, label: laneOf(container).labelControl }],
    })
    const button = container.querySelector('[data-mol-id="track-lane-clip"] button')
    if (!button) throw new Error('button missing')
    dispatchPointer(button, 'pointerdown', { clientX: 20, pointerId: 1 })
    dispatchPointer(window, 'pointermove', { clientX: 80, pointerId: 1 })
    dispatchPointer(window, 'pointerup', { clientX: 80, pointerId: 1 })
    expect(onClipMove).not.toHaveBeenCalled()
    expect(onClipClick).not.toHaveBeenCalled()
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
