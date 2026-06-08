// @vitest-environment jsdom

import { render } from '@testing-library/react'
import type { ReactNode } from 'react'
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Clip } from '@molecule/app-feature-track-lane-react'
import { createSimpleI18nProvider } from '@molecule/app-i18n'
import { I18nProvider } from '@molecule/app-react'
import { setClassMap, type UIClassMap } from '@molecule/app-ui'

import {
  clampZoom,
  computeRippleUpdates,
  computeRulerTicks,
  formatTickTime,
  type Track,
  VideoTimeline,
  zoomFromWheelDelta,
} from '../VideoTimeline.js'

/**
 * Build a UIClassMap stub via Proxy (any token resolves to its name).
 *
 * @returns A stub UIClassMap suitable for tests.
 */
function buildStubClassMap(): UIClassMap {
  const handler: ProxyHandler<Record<string, unknown>> = {
    get(_target, prop): unknown {
      if (prop === 'cn') {
        return (...classes: unknown[]) =>
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
  return new Proxy({}, handler) as unknown as UIClassMap
}

/**
 * Wrap children in `I18nProvider`.
 *
 * @param props - Wrapper props.
 * @param props.children - Children to wrap.
 * @returns The wrapped element tree.
 */
function Wrap({ children }: { children: ReactNode }): React.ReactElement {
  return <I18nProvider provider={createSimpleI18nProvider('en')}>{children}</I18nProvider>
}

/**
 * Dispatch a real `PointerEvent` so listeners installed via React's
 * synthetic system + window-level listeners both pick it up.
 *
 * @param target - Target element / window.
 * @param type - Pointer event type.
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

beforeEach(() => {
  setClassMap(buildStubClassMap())
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
  it('renders one track row per track', () => {
    const { container } = render(
      <Wrap>
        <VideoTimeline tracks={baseTracks} currentTime={0} duration={60} />
      </Wrap>,
    )
    const trackEls = container.querySelectorAll('[data-mol-id="video-timeline-track"]')
    expect(trackEls.length).toBe(2)
    expect(trackEls[0].getAttribute('data-track-id')).toBe('tv')
    expect(trackEls[0].getAttribute('data-track-kind')).toBe('video')
    expect(trackEls[1].getAttribute('data-track-kind')).toBe('audio')
  })

  it('renders ruler ticks across the duration', () => {
    const { container } = render(
      <Wrap>
        <VideoTimeline tracks={baseTracks} currentTime={0} duration={60} pixelsPerSecond={20} />
      </Wrap>,
    )
    const ticks = container.querySelectorAll('[data-mol-id="video-timeline-tick"]')
    expect(ticks.length).toBeGreaterThan(1)
    // Tick `data-time` values should be monotonic.
    const times = Array.from(ticks).map((t) => Number(t.getAttribute('data-time')))
    for (let i = 1; i < times.length; i++) {
      expect(times[i]).toBeGreaterThan(times[i - 1])
    }
  })

  it('positions the playhead at currentTime * pixelsPerSecond + headerWidth', () => {
    const { container } = render(
      <Wrap>
        <VideoTimeline
          tracks={baseTracks}
          currentTime={5}
          duration={60}
          pixelsPerSecond={20}
          laneHeaderWidth={120}
        />
      </Wrap>,
    )
    const playhead = container.querySelector<HTMLElement>('[data-mol-id="video-timeline-playhead"]')
    expect(playhead?.style.left).toBe('220px') // 5 * 20 + 120
  })

  it('sets aria-valuenow on the ruler to currentTime', () => {
    const { container } = render(
      <Wrap>
        <VideoTimeline tracks={baseTracks} currentTime={3.5} duration={60} />
      </Wrap>,
    )
    const ruler = container.querySelector('[data-mol-id="video-timeline-ruler"]')
    expect(ruler?.getAttribute('aria-valuenow')).toBe('3.5')
    expect(ruler?.getAttribute('aria-valuemax')).toBe('60')
  })

  it('fires onSeek with the clicked time on ruler pointerdown', () => {
    const onSeek = vi.fn()
    const { container } = render(
      <Wrap>
        <VideoTimeline
          tracks={baseTracks}
          currentTime={0}
          duration={60}
          pixelsPerSecond={20}
          onSeek={onSeek}
        />
      </Wrap>,
    )
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
        toJSON() {},
      }) as DOMRect
    dispatchPointer(ruler, 'pointerdown', { clientX: 60, pointerId: 1 })
    // 60px / 20pps = 3s
    expect(onSeek).toHaveBeenCalledWith(3)
  })

  it('clamps onSeek time to [0, duration]', () => {
    const onSeek = vi.fn()
    const { container } = render(
      <Wrap>
        <VideoTimeline
          tracks={baseTracks}
          currentTime={0}
          duration={10}
          pixelsPerSecond={20}
          onSeek={onSeek}
        />
      </Wrap>,
    )
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
        toJSON() {},
      }) as DOMRect
    // 10 seconds * 20 pps = 200px is the duration boundary; click at 800px.
    dispatchPointer(ruler, 'pointerdown', { clientX: 800, pointerId: 1 })
    expect(onSeek).toHaveBeenLastCalledWith(10)
    // And below zero clamps to 0.
    dispatchPointer(ruler, 'pointerdown', { clientX: -50, pointerId: 2 })
    expect(onSeek).toHaveBeenLastCalledWith(0)
  })

  it('insert mode: dragging a clip emits exactly one onClipMove call', () => {
    const onClipMove = vi.fn()
    const { container } = render(
      <Wrap>
        <VideoTimeline
          tracks={baseTracks}
          currentTime={0}
          duration={60}
          pixelsPerSecond={20}
          mode="insert"
          onClipMove={onClipMove}
        />
      </Wrap>,
    )
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

  it('ripple mode: dragging a clip shifts later clips on the same track', () => {
    const onClipMove = vi.fn()
    const { container } = render(
      <Wrap>
        <VideoTimeline
          tracks={baseTracks}
          currentTime={0}
          duration={60}
          pixelsPerSecond={20}
          mode="ripple"
          onClipMove={onClipMove}
        />
      </Wrap>,
    )
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

  it('ripple-mode trackId argument is the track id, not undefined', () => {
    const onClipMove = vi.fn()
    const { container } = render(
      <Wrap>
        <VideoTimeline
          tracks={baseTracks}
          currentTime={0}
          duration={60}
          pixelsPerSecond={20}
          onClipMove={onClipMove}
        />
      </Wrap>,
    )
    const clips = container.querySelectorAll('[data-mol-id="track-lane-clip"]')
    dispatchPointer(clips[0], 'pointerdown', { clientX: 0, pointerId: 1 })
    dispatchPointer(window, 'pointermove', { clientX: 40, pointerId: 1 })
    dispatchPointer(window, 'pointerup', { clientX: 40, pointerId: 1 })
    for (const call of onClipMove.mock.calls) {
      expect(call[2]).toBe('tv')
    }
  })

  it('forwards onClipResize with the track id', () => {
    const onClipResize = vi.fn()
    const { container } = render(
      <Wrap>
        <VideoTimeline
          tracks={baseTracks}
          currentTime={0}
          duration={60}
          pixelsPerSecond={20}
          onClipResize={onClipResize}
        />
      </Wrap>,
    )
    const handles = container.querySelectorAll('[data-mol-id="track-lane-clip-handle"]')
    dispatchPointer(handles[0], 'pointerdown', { clientX: 40, pointerId: 1 })
    dispatchPointer(window, 'pointermove', { clientX: 80, pointerId: 1 }) // +40px = +2s
    dispatchPointer(window, 'pointerup', { clientX: 80, pointerId: 1 })
    expect(onClipResize).toHaveBeenCalled()
    const last = onClipResize.mock.calls[onClipResize.mock.calls.length - 1]
    expect(last[0]).toBe('v1')
    expect(last[2]).toBe('tv') // track id
  })

  it('renders a zoom slider with min/max wired to props', () => {
    const onZoomChange = vi.fn()
    const { container } = render(
      <Wrap>
        <VideoTimeline
          tracks={baseTracks}
          currentTime={0}
          duration={60}
          pixelsPerSecond={50}
          zoomMin={5}
          zoomMax={150}
          onZoomChange={onZoomChange}
        />
      </Wrap>,
    )
    const slider = container.querySelector<HTMLInputElement>(
      '[data-mol-id="video-timeline-zoom-slider"]',
    )
    expect(slider?.getAttribute('min')).toBe('5')
    expect(slider?.getAttribute('max')).toBe('150')
    expect(slider?.value).toBe('50')
  })

  it('zoom-out button calls onZoomChange with a smaller, clamped value', () => {
    const onZoomChange = vi.fn()
    const { container } = render(
      <Wrap>
        <VideoTimeline
          tracks={baseTracks}
          currentTime={0}
          duration={60}
          pixelsPerSecond={20}
          onZoomChange={onZoomChange}
        />
      </Wrap>,
    )
    const btn = container.querySelector<HTMLButtonElement>(
      '[data-mol-id="video-timeline-zoom-out"]',
    )
    btn?.click()
    expect(onZoomChange).toHaveBeenCalled()
    const arg = onZoomChange.mock.calls[0][0] as number
    expect(arg).toBeLessThan(20)
    expect(arg).toBeGreaterThanOrEqual(2)
  })

  it('exposes mode via data-mode and uses an aria-labelled root', () => {
    const { container } = render(
      <Wrap>
        <VideoTimeline tracks={baseTracks} currentTime={0} duration={60} mode="insert" />
      </Wrap>,
    )
    const root = container.querySelector('[data-mol-id="video-timeline"]')
    expect(root?.getAttribute('data-mode')).toBe('insert')
    expect(root?.getAttribute('aria-label')).toBeTruthy()
  })

  it('falls back to a translated kind label when track.name is omitted', () => {
    const tracksNoName: Track[] = [{ id: 'tv', kind: 'subtitle', clips: [] }]
    const { container } = render(
      <Wrap>
        <VideoTimeline tracks={tracksNoName} currentTime={0} duration={10} />
      </Wrap>,
    )
    const name = container.querySelector('[data-mol-id="track-lane-name"]')
    // Default English fallback for `subtitle`.
    expect(name?.textContent).toBe('Subtitle')
  })
})
