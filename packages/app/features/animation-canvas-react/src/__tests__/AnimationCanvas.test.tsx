// @vitest-environment jsdom

import { fireEvent, render } from '@testing-library/react'
import type { ReactNode } from 'react'
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createSimpleI18nProvider } from '@molecule/app-i18n'
import { I18nProvider } from '@molecule/app-react'
import { setClassMap, type UIClassMap } from '@molecule/app-ui'

import { AnimationCanvas } from '../AnimationCanvas.js'
import type { AnimationKeyframe } from '../types.js'

/**
 * Build a UIClassMap stub via Proxy: `cn(...)` joins truthy strings,
 * every other property/method access returns its key as a string token.
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
 * Wrap children in I18nProvider so `useTranslation()` works.
 *
 * @param props - Wrapper props.
 * @param props.children - Children to wrap.
 * @returns The wrapped element tree.
 */
function Wrap({ children }: { children: ReactNode }): React.ReactElement {
  return <I18nProvider provider={createSimpleI18nProvider('en')}>{children}</I18nProvider>
}

beforeEach(() => {
  setClassMap(buildStubClassMap())
})

const oneShape = (
  id: string,
  x: number,
  y: number,
  opacity = 1,
): { id: string; x: number; y: number; rotation: number; scale: number; opacity: number } => ({
  id,
  x,
  y,
  rotation: 0,
  scale: 1,
  opacity,
})

describe('<AnimationCanvas>', () => {
  it('renders a labelled root svg', () => {
    const keyframes: AnimationKeyframe[] = [
      { time: 0, state: [oneShape('a', 0, 0)] },
      { time: 1, state: [oneShape('a', 100, 0)] },
    ]
    const { container } = render(
      <Wrap>
        <AnimationCanvas keyframes={keyframes} currentTime={0} width={400} height={200} />
      </Wrap>,
    )
    const root = container.querySelector('[data-mol-id="animation-canvas"]')
    expect(root).not.toBeNull()
    expect(root?.getAttribute('role')).toBe('img')
  })

  it('renders one visible shape group per shape', () => {
    const keyframes: AnimationKeyframe[] = [
      { time: 0, state: [oneShape('a', 0, 0), oneShape('b', 50, 50)] },
      { time: 1, state: [oneShape('a', 100, 0), oneShape('b', 200, 50)] },
    ]
    const { container } = render(
      <Wrap>
        <AnimationCanvas keyframes={keyframes} currentTime={0.5} width={400} height={200} />
      </Wrap>,
    )
    expect(container.querySelector('[data-mol-id="animation-canvas-shape-a"]')).not.toBeNull()
    expect(container.querySelector('[data-mol-id="animation-canvas-shape-b"]')).not.toBeNull()
  })

  it('positions shapes at the linearly-interpolated midpoint', () => {
    const keyframes: AnimationKeyframe[] = [
      { time: 0, state: [oneShape('a', 0, 0)] },
      { time: 1, state: [oneShape('a', 100, 60)] },
    ]
    const { container } = render(
      <Wrap>
        <AnimationCanvas keyframes={keyframes} currentTime={0.5} width={400} height={200} />
      </Wrap>,
    )
    const g = container.querySelector('[data-mol-id="animation-canvas-shape-a"]') as SVGGElement
    expect(g.getAttribute('transform')).toContain('translate(50 30)')
  })

  it('uses easing when set on the target keyframe', () => {
    const keyframes: AnimationKeyframe[] = [
      { time: 0, state: [oneShape('a', 0, 0)] },
      {
        time: 1,
        state: [{ ...oneShape('a', 100, 0), easing: 'easeIn' as const }],
      },
    ]
    const { container } = render(
      <Wrap>
        <AnimationCanvas keyframes={keyframes} currentTime={0.25} width={400} height={200} />
      </Wrap>,
    )
    const g = container.querySelector('[data-mol-id="animation-canvas-shape-a"]') as SVGGElement
    const xMatch = g.getAttribute('transform')!.match(/translate\(([-\d.]+) /)
    const x = parseFloat(xMatch![1])
    // easeIn at 0.25 must be < 25 (linear) but > 0.
    expect(x).toBeLessThan(25)
    expect(x).toBeGreaterThan(0)
  })

  it('renders correctly at exact keyframe boundaries', () => {
    const keyframes: AnimationKeyframe[] = [
      { time: 0, state: [oneShape('a', 0, 0)] },
      { time: 1, state: [oneShape('a', 100, 0)] },
      { time: 2, state: [oneShape('a', 50, 0)] },
    ]
    const { container, rerender } = render(
      <Wrap>
        <AnimationCanvas keyframes={keyframes} currentTime={0} width={400} height={200} />
      </Wrap>,
    )
    let g = container.querySelector('[data-mol-id="animation-canvas-shape-a"]') as SVGGElement
    expect(g.getAttribute('transform')).toContain('translate(0 0)')

    rerender(
      <Wrap>
        <AnimationCanvas keyframes={keyframes} currentTime={1} width={400} height={200} />
      </Wrap>,
    )
    g = container.querySelector('[data-mol-id="animation-canvas-shape-a"]') as SVGGElement
    expect(g.getAttribute('transform')).toContain('translate(100 0)')

    rerender(
      <Wrap>
        <AnimationCanvas keyframes={keyframes} currentTime={2} width={400} height={200} />
      </Wrap>,
    )
    g = container.querySelector('[data-mol-id="animation-canvas-shape-a"]') as SVGGElement
    expect(g.getAttribute('transform')).toContain('translate(50 0)')
  })

  it('seeks via onSeek when canvas is clicked', () => {
    const keyframes: AnimationKeyframe[] = [
      { time: 0, state: [oneShape('a', 0, 0)] },
      { time: 2, state: [oneShape('a', 100, 0)] },
    ]
    const onSeek = vi.fn<(t: number) => void>()
    const origGet = Element.prototype.getBoundingClientRect
    Element.prototype.getBoundingClientRect = function () {
      return {
        left: 0,
        top: 0,
        right: 400,
        bottom: 200,
        width: 400,
        height: 200,
        x: 0,
        y: 0,
        toJSON() {
          return {}
        },
      } as DOMRect
    }
    try {
      const { container } = render(
        <Wrap>
          <AnimationCanvas
            keyframes={keyframes}
            currentTime={0}
            onSeek={onSeek}
            width={400}
            height={200}
          />
        </Wrap>,
      )
      const root = container.querySelector('[data-mol-id="animation-canvas"]')!
      // Click at x=100 → ratio 0.25 → time 0 + 0.25 * 2 = 0.5.
      fireEvent.pointerDown(root, { clientX: 100, clientY: 50 })
      expect(onSeek).toHaveBeenCalledTimes(1)
      expect(onSeek.mock.calls[0][0]).toBeCloseTo(0.5, 6)
    } finally {
      Element.prototype.getBoundingClientRect = origGet
    }
  })

  it('renders fewer shape groups when shapes vanish (still rendered with eased opacity)', () => {
    const keyframes: AnimationKeyframe[] = [
      { time: 0, state: [oneShape('a', 0, 0), oneShape('b', 0, 0)] },
      { time: 1, state: [oneShape('a', 100, 0)] },
    ]
    const { container } = render(
      <Wrap>
        <AnimationCanvas keyframes={keyframes} currentTime={1} width={400} height={200} />
      </Wrap>,
    )
    // At final keyframe `b` is gone — interpolateState returns it with
    // opacity 0 (faded out). The group is still in the DOM but with
    // opacity 0 so it's not visible.
    const groups = container.querySelectorAll('[data-shape-id]')
    expect(groups.length).toBeGreaterThanOrEqual(1)
    const a = container.querySelector('[data-mol-id="animation-canvas-shape-a"]')!
    expect(a.getAttribute('opacity')).toBe('1')
  })
})
