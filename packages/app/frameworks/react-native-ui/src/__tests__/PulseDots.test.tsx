// @vitest-environment jsdom
import { act, cleanup, render } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { DotPulseMotion } from '@molecule/app-ui'

import * as elements from '../elements/index.js'

interface TimingConfig {
  toValue: number
  duration: number
  delay: number
  easing: (fraction: number) => number
  useNativeDriver: boolean
  isInteraction: boolean
}

interface AnimatedHostProps {
  children: ReactNode
  accessible?: boolean
  accessibilityElementsHidden?: boolean
  importantForAccessibility?: string
  pointerEvents?: string
  style: unknown[]
}

const device = vi.hoisted(() => {
  class Value {
    constructor(public current: number) {}

    setValue(value: number): void {
      this.current = value
    }

    interpolate(config: { inputRange: number[]; outputRange: number[] }) {
      return config
    }
  }

  const remove = vi.fn()
  const hosts: AnimatedHostProps[] = []
  return {
    Value,
    query: vi.fn<() => Promise<boolean>>(),
    subscribe: vi.fn((_event: string, _listener: (reduced: boolean) => void) => ({ remove })),
    remove,
    hosts,
    timing: vi.fn((value: Value, config: TimingConfig) => ({
      start: value.current,
      value,
      config,
    })),
    loop: vi.fn(() => ({ start: vi.fn(), stop: vi.fn() })),
    bezier: vi.fn(() => (x: number) => x * x),
  }
})

let recipe: DotPulseMotion | undefined

vi.mock('@molecule/app-ui', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getClassMap: () => ({
    typingPulse: recipe,
    splitForNative: (className: string, inherited: string) => ({
      view: '',
      text: className || inherited,
      display: 'flex',
      lines: null,
      weight: null,
    }),
  }),
}))

vi.mock('react-native', () => ({
  View: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  AccessibilityInfo: { isReduceMotionEnabled: device.query, addEventListener: device.subscribe },
  Animated: {
    Value: device.Value,
    timing: device.timing,
    loop: device.loop,
    View: (props: AnimatedHostProps) => {
      device.hosts.push(props)
      return <div data-native-dot="">{props.children}</div>
    },
  },
  Easing: { bezier: device.bezier },
  Platform: {
    OS: 'ios',
    select: <T,>({ ios, default: fallback }: { ios?: T; default?: T }) => ios ?? fallback,
  },
}))

vi.mock('react-native-svg', () => ({
  Svg: ({ className, children }: { className?: string; children?: ReactNode }) => (
    <svg className={className}>{children}</svg>
  ),
  Circle: ({ cx, cy, r, fill }: { cx: number; cy: number; r: number; fill: string }) => (
    <circle cx={cx} cy={cy} r={r} fill={fill} />
  ),
}))

vi.mock('react-native-external-keyboard', () => ({ ExternalKeyboardViewNative: () => null }))
vi.mock('@react-native-community/slider', () => ({ default: () => null }))

let finishQuery: (reduced: boolean) => void

beforeEach(() => {
  vi.clearAllMocks()
  device.hosts.length = 0
  recipe = undefined
  device.query.mockReturnValue(
    new Promise<boolean>((resolve) => {
      finishQuery = resolve
    }),
  )
})

afterEach(cleanup)

function preferenceChanged(reduced: boolean): void {
  const listener = device.subscribe.mock.lastCall?.[1]
  if (!listener) throw new Error('The dots did not subscribe to reduced motion')
  act(() => listener(reduced))
}

describe('PulseDots on device', () => {
  it('draws only full-size decorative dots in the inherited text colour while preference is pending', async () => {
    const { container } = render(
      <elements.Box as="span" className="inherited-ink">
        <elements.PulseDots size={8} durationMs={1200} />
      </elements.Box>,
    )

    expect(device.hosts).toHaveLength(3)
    for (const host of device.hosts) {
      expect(host).toMatchObject({
        accessible: false,
        accessibilityElementsHidden: true,
        importantForAccessibility: 'no-hide-descendants',
        pointerEvents: 'none',
      })
      expect(host.style).toContainEqual({ width: 8, height: 8 })
      expect(host.style).toContainEqual({ opacity: 1, transform: [{ scale: 1 }] })
    }
    const circles = container.querySelectorAll('[data-native-dot] svg.inherited-ink circle')
    expect(circles).toHaveLength(3)
    for (const circle of circles) {
      expect([
        circle.getAttribute('cx'),
        circle.getAttribute('cy'),
        circle.getAttribute('r'),
      ]).toEqual(['4', '4', '4'])
      expect(circle.getAttribute('fill')).toBe('currentColor')
    }
    expect(device.loop).not.toHaveBeenCalled()
    await act(async () => finishQuery(true))
    expect(device.loop).not.toHaveBeenCalled()
  })

  it('loops on the native driver with the CSS easing, dim paint and one-time phase offsets', async () => {
    render(<elements.PulseDots size={6} durationMs={1200} />)
    await act(async () => finishQuery(false))

    const animations = device.timing.mock.results.map(({ value }) => value)
    expect(animations.map(({ config }) => config.delay)).toEqual([0, 200, 400])
    expect(device.bezier).toHaveBeenCalledWith(0.42, 0, 0.58, 1)
    for (const { start, config } of animations) {
      expect(start).toBe(1)
      expect(config).toMatchObject({
        duration: 1200,
        toValue: 0,
        useNativeDriver: true,
        isInteraction: false,
      })
      const brightness = (fraction: number): number =>
        start + (config.toValue - start) * config.easing(fraction)
      expect([0, 0.4, 0.8, 0.9, 1].map(brightness)).toEqual([0, 1, 0, 0, 0])
      expect(brightness(0.2)).toBeCloseTo(0.25)
      expect(brightness(0.6)).toBeCloseTo(0.75)
    }
    for (const host of device.hosts.slice(-3)) {
      expect(host.style).toContainEqual({
        opacity: { inputRange: [0, 1], outputRange: [0.3, 1] },
        transform: [{ scale: { inputRange: [0, 1], outputRange: [0.8, 1] } }],
      })
    }
    expect(device.loop).toHaveBeenCalledTimes(3)
    for (const { value } of device.loop.mock.results) expect(value.start).toHaveBeenCalledOnce()
  })

  it('stops the old loops and uses the latest duration and ClassMap recipe', async () => {
    const { rerender } = render(<elements.PulseDots size={6} durationMs={1200} />)
    await act(async () => finishQuery(false))
    const oldLoops = device.loop.mock.results.map(({ value }) => value)
    for (const { value } of device.timing.mock.results) value.value.setValue(0)

    recipe = { peakAt: 0.25, restAt: 0.75, stagger: 0.125, dimOpacity: 0.2, dimScale: 0.5 }
    rerender(<elements.PulseDots size={6} durationMs={800} />)

    expect(oldLoops).toHaveLength(3)
    for (const loop of oldLoops) expect(loop.stop).toHaveBeenCalledOnce()
    const animations = device.timing.mock.results.slice(3).map(({ value }) => value)
    expect(animations.map(({ start, config }) => [start, config.duration, config.delay])).toEqual([
      [1, 800, 0],
      [1, 800, 100],
      [1, 800, 200],
    ])
    for (const { config } of animations) {
      expect([0, 0.25, 0.75].map(config.easing)).toEqual([1, 0, 1])
    }
    for (const host of device.hosts.slice(-3)) {
      expect(host.style).toContainEqual({
        opacity: { inputRange: [0, 1], outputRange: [0.2, 1] },
        transform: [{ scale: { inputRange: [0, 1], outputRange: [0.5, 1] } }],
      })
    }
  })

  it('honours live preferences over a stale initial query and stops all active loops on unmount', async () => {
    const { unmount } = render(<elements.PulseDots size={6} durationMs={1200} />)
    expect(device.subscribe).toHaveBeenCalledExactlyOnceWith(
      'reduceMotionChanged',
      expect.any(Function),
    )
    preferenceChanged(true)
    await act(async () => finishQuery(false))
    expect(device.loop).not.toHaveBeenCalled()

    preferenceChanged(false)
    expect(device.loop).toHaveBeenCalledTimes(3)
    preferenceChanged(true)
    for (const { value } of device.loop.mock.results) expect(value.stop).toHaveBeenCalledOnce()
    for (const host of device.hosts.slice(-3)) {
      expect(host.style).toContainEqual({ opacity: 1, transform: [{ scale: 1 }] })
    }

    preferenceChanged(false)
    expect(device.loop).toHaveBeenCalledTimes(6)
    unmount()
    for (const { value } of device.loop.mock.results) expect(value.stop).toHaveBeenCalledOnce()
    expect(device.remove).toHaveBeenCalledOnce()
  })

  it('stays stationary if reading reduced motion fails and accepts the next live preference', async () => {
    device.query.mockRejectedValue(new Error('Reduced motion unavailable'))
    await act(async () => {
      render(<elements.PulseDots size={6} durationMs={1200} />)
    })
    expect(device.loop).not.toHaveBeenCalled()
    preferenceChanged(false)
    expect(device.loop).toHaveBeenCalledTimes(3)
  })

  it('keeps a zero-duration pulse stationary', async () => {
    render(<elements.PulseDots size={6} durationMs={0} />)
    await act(async () => finishQuery(false))
    expect(device.loop).not.toHaveBeenCalled()
    for (const host of device.hosts.slice(-3)) {
      expect(host.style).toContainEqual({ opacity: 1, transform: [{ scale: 1 }] })
    }
  })
})
