// @vitest-environment jsdom
/**
 * Unit tests for the Vue `TrackLane` — a port of
 * `@molecule/app-feature-track-lane-react/src/__tests__/TrackLane.test.tsx`:
 * the same behavioral assertions, rendered with Vue in jsdom and asserted on
 * the markup the component produces.
 *
 * @module
 */

import { afterEach, describe, expect, it, vi } from 'vitest'

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
vi.mock('@molecule/app-vue', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

import { createApp, defineComponent, h, nextTick, shallowRef, type VNodeChild } from 'vue'

import {
  clampClipMove,
  type Clip,
  clipToPixels,
  pixelsToTime,
  TrackLane,
  type TrackLaneProps,
} from '../index.js'

/** The mounted app and its host element. */
interface Mounted {
  /** The host element the app mounted into. */
  container: HTMLElement
  /** Replaces the lane's props (merged over the current ones) and waits for its re-render. */
  setProps(next: Partial<TrackLaneProps>): Promise<void>
  /** Unmounts the app (and with it the component's window listeners). */
  unmount: () => void
}

/** The apps mounted by the current test, unmounted after it. */
let apps: Mounted[] = []

/**
 * Mounts a `TrackLane` with the given props and optional slots.
 *
 * @param props - Component props.
 * @param slots - Named slots.
 * @returns The host element, its re-render and its unmount function.
 */
function render(props: TrackLaneProps, slots?: Record<string, () => VNodeChild[]>): Mounted {
  const host = document.createElement('div')
  document.body.appendChild(host)
  // The props as a ref, so replacing them re-renders the wrapper.
  const current = shallowRef<TrackLaneProps>(props)
  const app = createApp(defineComponent({ render: () => h(TrackLane, current.value, slots) }))
  app.mount(host)
  const mounted: Mounted = {
    container: host,
    setProps: async (next) => {
      current.value = { ...current.value, ...next }
      await nextTick()
    },
    unmount: () => {
      app.unmount()
      host.remove()
    },
  }
  apps.push(mounted)
  return mounted
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

const baseClips: Clip[] = [
  { id: 'c1', startTime: 0, duration: 2, color: '#0af', label: 'Kick' },
  { id: 'c2', startTime: 4, duration: 1.5, label: 'Snare' },
  { id: 'c3', startTime: 8, duration: 3 },
]

afterEach(() => {
  for (const app of apps) app.unmount()
  apps = []
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
  it('renders a clip per item with labelled clips visible', () => {
    const { container } = render({ name: 'Drums', clips: baseClips, pixelsPerSecond: 20 })
    const clipEls = container.querySelectorAll('[data-mol-id="track-lane-clip"]')
    expect(clipEls.length).toBe(3)
    const labels = Array.from(
      container.querySelectorAll('[data-mol-id="track-lane-clip-label"]'),
    ).map((el) => el.textContent)
    expect(labels).toEqual(['Kick', 'Snare'])
  })

  it('renders the lane header with the supplied name', () => {
    const { container } = render({ name: 'Drums', clips: baseClips })
    const nameEl = container.querySelector('[data-mol-id="track-lane-name"]')
    expect(nameEl?.textContent).toBe('Drums')
  })

  it('omits the header when name and lane are both undefined', () => {
    const { container } = render({ clips: baseClips })
    expect(container.querySelector('[data-mol-id="track-lane-header"]')).toBeNull()
  })

  it('positions clips by clipToPixels', () => {
    const { container } = render({ clips: baseClips, pixelsPerSecond: 20 })
    const clipEls = container.querySelectorAll<HTMLElement>('[data-mol-id="track-lane-clip"]')
    expect(clipEls[0].style.left).toBe('0px')
    expect(clipEls[0].style.width).toBe('40px')
    expect(clipEls[1].style.left).toBe('80px')
    expect(clipEls[1].style.width).toBe('30px')
    expect(clipEls[2].style.left).toBe('160px')
    expect(clipEls[2].style.width).toBe('60px')
  })

  it('marks the selected clip with data-selected="true" and aria-pressed', () => {
    const { container } = render({ clips: baseClips, selectedClipId: 'c2' })
    const clipEls = container.querySelectorAll('[data-mol-id="track-lane-clip"]')
    expect(clipEls[0].getAttribute('data-selected')).toBe('false')
    expect(clipEls[1].getAttribute('data-selected')).toBe('true')
    expect(clipEls[1].getAttribute('aria-pressed')).toBe('true')
  })

  it('forwards lane id via data-lane and to handlers', () => {
    const onClipClick = vi.fn()
    const { container } = render({ clips: baseClips, lane: 'lane-7', onClipClick })
    expect(container.querySelector('[data-mol-id="track-lane"]')?.getAttribute('data-lane')).toBe(
      'lane-7',
    )
    const clipEls = container.querySelectorAll('[data-mol-id="track-lane-clip"]')
    dispatchPointer(clipEls[0], 'pointerdown', { clientX: 50, pointerId: 1 })
    dispatchPointer(window, 'pointerup', { clientX: 50, pointerId: 1 })
    expect(onClipClick).toHaveBeenCalledWith('c1', 'lane-7')
  })

  it('fires onClipClick when pointerdown -> pointerup with no movement', () => {
    const onClipClick = vi.fn()
    const onClipMove = vi.fn()
    const { container } = render({ clips: baseClips, onClipClick, onClipMove })
    const clipEls = container.querySelectorAll('[data-mol-id="track-lane-clip"]')
    dispatchPointer(clipEls[1], 'pointerdown', { clientX: 100, pointerId: 1 })
    dispatchPointer(window, 'pointerup', { clientX: 100, pointerId: 1 })
    expect(onClipClick).toHaveBeenCalledTimes(1)
    expect(onClipClick).toHaveBeenCalledWith('c2', undefined)
    expect(onClipMove).not.toHaveBeenCalled()
  })

  it('does not activate a clip when a stationary contact is canceled', () => {
    const onClipClick = vi.fn()
    const { container } = render({
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
  it('does not activate a clip when the window loses focus before the release', () => {
    const onClipClick = vi.fn()
    const { container } = render({ clips: baseClips, onClipClick })
    dispatchPointer(clipOf(container, 'c1'), 'pointerdown', { clientX: 100, pointerId: 1 })
    window.dispatchEvent(new FocusEvent('blur'))
    dispatchPointer(window, 'pointerup', { clientX: 100, pointerId: 1 })
    expect(onClipClick).not.toHaveBeenCalled()
  })

  it('stops reporting moves when the window loses focus mid-drag', () => {
    const onClipMove = vi.fn()
    const { container } = render({ clips: baseClips, onClipMove })
    dispatchPointer(clipOf(container, 'c2'), 'pointerdown', { clientX: 100, pointerId: 1 })
    dispatchPointer(window, 'pointermove', { clientX: 140, pointerId: 1 })
    window.dispatchEvent(new FocusEvent('blur'))
    dispatchPointer(window, 'pointermove', { clientX: 180, pointerId: 1 })
    expect(onClipMove).toHaveBeenCalledTimes(1)
  })

  it('cancels the gesture when the pressed clip loses its pointer capture', () => {
    const onClipClick = vi.fn()
    const { container } = render({ clips: baseClips, onClipClick })
    clipOf(container, 'c1').dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true, button: 0, clientX: 100, pointerId: 1 }),
    )
    clipOf(container, 'c1').dispatchEvent(new PointerEvent('lostpointercapture', { pointerId: 1 }))
    dispatchPointer(window, 'pointerup', { clientX: 100, pointerId: 1 })
    expect(onClipClick).not.toHaveBeenCalled()
  })

  it('does not click when the release is past the drag threshold without a move', () => {
    const onClipClick = vi.fn()
    const { container } = render({ clips: baseClips, onClipClick })
    dispatchPointer(clipOf(container, 'c1'), 'pointerdown', { clientX: 100, pointerId: 1 })
    dispatchPointer(window, 'pointerup', { clientX: 110, pointerId: 1 })
    expect(onClipClick).not.toHaveBeenCalled()
  })

  it('ignores a press from a non-primary pointer', () => {
    const onClipClick = vi.fn()
    const { container } = render({ clips: baseClips, onClipClick })
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

  it('lets an ancestor see the pointer press', () => {
    const onPointerDown = vi.fn()
    window.addEventListener('pointerdown', onPointerDown)
    try {
      const { container } = render({ clips: baseClips })
      dispatchPointer(clipOf(container, 'c1'), 'pointerdown', { clientX: 100, pointerId: 1 })
      expect(onPointerDown).toHaveBeenCalledTimes(1)
    } finally {
      window.removeEventListener('pointerdown', onPointerDown)
    }
  })

  it('still fires onClipClick when an ancestor stops the release event', () => {
    const onClipClick = vi.fn()
    const { container } = render({ clips: baseClips, onClipClick })
    const stop = (event: Event): void => event.stopPropagation()
    container.addEventListener('pointerup', stop)
    dispatchPointer(clipOf(container, 'c1'), 'pointerdown', { clientX: 100, pointerId: 1 })
    dispatchPointer(clipOf(container, 'c1'), 'pointerup', { clientX: 100, pointerId: 1 })
    expect(onClipClick).toHaveBeenCalledTimes(1)
  })

  it('captures the pressed clip pointer for the gesture', () => {
    const calls = recordPointerCapture()
    const { container } = render({ clips: baseClips })
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
    const { container, setProps } = render({ clips: baseClips, onClipMove })
    dispatchPointer(clipOf(container, 'c2'), 'pointerdown', { clientX: 100, pointerId: 1 })
    dispatchPointer(window, 'pointermove', { clientX: 140, pointerId: 1 })
    await setProps({ clips: [baseClips[0], baseClips[2]] })
    dispatchPointer(window, 'pointermove', { clientX: 180, pointerId: 1 })
    expect(onClipMove).toHaveBeenCalledTimes(1)
  })

  it('leaves a press on a control inside a clip alone', () => {
    const onClipClick = vi.fn()
    const onClipMove = vi.fn()
    const { container } = render({
      clips: [{ id: 'c1', startTime: 0, duration: 2, label: h('button', 'Go') }],
      onClipClick,
      onClipMove,
    })
    const button = container.querySelector('[data-mol-id="track-lane-clip"] button')
    if (!button) throw new Error('button missing')
    dispatchPointer(button, 'pointerdown', { clientX: 20, pointerId: 1 })
    dispatchPointer(window, 'pointermove', { clientX: 80, pointerId: 1 })
    dispatchPointer(window, 'pointerup', { clientX: 80, pointerId: 1 })
    expect(onClipMove).not.toHaveBeenCalled()
    expect(onClipClick).not.toHaveBeenCalled()
  })

  it('fires onClipMove (not onClipClick) when pointer moves past the drag threshold', () => {
    const onClipClick = vi.fn()
    const onClipMove = vi.fn()
    const { container } = render({
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

  it('clamps onClipMove startTime to >= 0', () => {
    const onClipMove = vi.fn()
    const { container } = render({ clips: baseClips, pixelsPerSecond: 20, onClipMove })
    const clipEls = container.querySelectorAll('[data-mol-id="track-lane-clip"]')
    // Drag clip 'c1' (origin startTime=0) to the left by 200px
    dispatchPointer(clipEls[0], 'pointerdown', { clientX: 200, pointerId: 1 })
    dispatchPointer(window, 'pointermove', { clientX: 0, pointerId: 1 })
    const last = onClipMove.mock.calls[onClipMove.mock.calls.length - 1]
    expect(last[1]).toBe(0)
  })

  it('fires onClipResize when the right-edge handle is dragged', () => {
    const onClipResize = vi.fn()
    const onClipMove = vi.fn()
    const { container } = render({
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

  it('floors resize duration at MIN_CLIP_DURATION_SECONDS', () => {
    const onClipResize = vi.fn()
    const { container } = render({ clips: baseClips, pixelsPerSecond: 20, onClipResize })
    const handle = container.querySelectorAll('[data-mol-id="track-lane-clip-handle"]')[1]
    // Drag handle far left to attempt a negative duration
    dispatchPointer(handle, 'pointerdown', { clientX: 200, pointerId: 1 })
    dispatchPointer(window, 'pointermove', { clientX: 0, pointerId: 1 })
    const last = onClipResize.mock.calls[onClipResize.mock.calls.length - 1]
    expect(last[1]).toBeGreaterThan(0)
    expect(last[1]).toBeLessThanOrEqual(0.05 + 1e-9)
  })

  it('uses translated aria labels for the lane and clip handles', () => {
    const { container } = render({ name: 'Drums', clips: baseClips })
    const lane = container.querySelector('[data-mol-id="track-lane"]')
    expect(lane?.getAttribute('aria-label')).toBeTruthy()
    const handle = container.querySelector('[data-mol-id="track-lane-clip-handle"]')
    expect(handle?.getAttribute('aria-label')).toBeTruthy()
  })

  it('renders an empty body when clips is []', () => {
    const { container } = render({ name: 'Empty', clips: [] })
    expect(container.querySelectorAll('[data-mol-id="track-lane-clip"]').length).toBe(0)
    expect(container.querySelector('[data-mol-id="track-lane-body"]')).not.toBeNull()
  })

  // Beyond React's suite: the Vue convention that a node-valued prop also
  // accepts a same-named slot, which the slot wins.
  it('renders a name passed as the same-named slot', () => {
    const { container } = render(
      { clips: baseClips },
      { name: () => [h('em', { 'data-slot': '' }, 'Slot')] },
    )
    const nameEl = container.querySelector('[data-mol-id="track-lane-name"]')
    expect(nameEl?.querySelector('[data-slot]')?.textContent).toBe('Slot')
  })
})
