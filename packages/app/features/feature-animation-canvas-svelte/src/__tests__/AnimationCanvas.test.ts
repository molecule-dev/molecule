// @vitest-environment jsdom
/**
 * Unit tests for `AnimationCanvas`, ported from
 * `@molecule/app-feature-animation-canvas-react`'s own suite: the same
 * behavioral assertions, rendered with a real mount (jsdom) and the bonded
 * ClassMap.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { type ComponentProps, flushSync, mount, unmount } from 'svelte'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createSimpleI18nProvider } from '@molecule/app-i18n'

import type AnimationCanvas from '../AnimationCanvas.svelte'
import type { AnimationKeyframe } from '../types.js'
import AnimationCanvasHost from './AnimationCanvasHost.svelte'

const i18n = createSimpleI18nProvider('en')

/** A mounted canvas: its container and a teardown. */
interface Rendered {
  /** The element holding the mounted canvas. */
  container: HTMLElement
  /** Unmounts the component and removes the container. */
  destroy(): Promise<void>
}

const mounted: Rendered[] = []

beforeEach(() => {
  document.body.innerHTML = ''
})

afterEach(async () => {
  for (const { destroy } of mounted.splice(0)) await destroy()
  document.body.innerHTML = ''
})

/**
 * Mounts `AnimationCanvas` with the given props under the i18n context the
 * canvas's translated label reads.
 *
 * @param props - The canvas props.
 * @returns The container holding the mounted canvas.
 */
function render(props: ComponentProps<typeof AnimationCanvas>): Rendered {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const instance = mount(AnimationCanvasHost, {
    target: container,
    props: {
      config: { i18n },
      props,
    },
  })
  flushSync()
  const rendered: Rendered = {
    container,
    destroy: async () => {
      await unmount(instance)
      container.remove()
    },
  }
  mounted.push(rendered)
  return rendered
}

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

describe('AnimationCanvas', () => {
  it('renders a labelled root svg', () => {
    const keyframes: AnimationKeyframe[] = [
      { time: 0, state: [oneShape('a', 0, 0)] },
      { time: 1, state: [oneShape('a', 100, 0)] },
    ]
    const { container } = render({ keyframes, currentTime: 0, width: 400, height: 200 })
    const root = container.querySelector('[data-mol-id="animation-canvas"]')
    expect(root).not.toBeNull()
    expect(root?.getAttribute('role')).toBe('img')
  })

  it('labels the canvas root only (shape groups carry no aria-label)', () => {
    const keyframes: AnimationKeyframe[] = [
      { time: 0, state: [oneShape('a', 0, 0)] },
      { time: 1, state: [oneShape('a', 100, 0)] },
    ]
    const { container } = render({ keyframes, currentTime: 0, width: 400, height: 200 })
    // The root `<svg role="img">` names the whole picture…
    const root = container.querySelector<SVGSVGElement>('[data-mol-id="animation-canvas"]')!
    expect(root.getAttribute('aria-label')).toBe('Animation canvas')
    // …and the shape groups inside it are presentational, so they expose no
    // label of their own (axe's aria-prohibited-attr).
    const shape = container.querySelector<SVGGElement>('[data-mol-id="animation-canvas-shape-a"]')!
    expect(shape.getAttribute('aria-label')).toBeNull()
  })

  it('renders one visible shape group per shape', () => {
    const keyframes: AnimationKeyframe[] = [
      { time: 0, state: [oneShape('a', 0, 0), oneShape('b', 50, 50)] },
      { time: 1, state: [oneShape('a', 100, 0), oneShape('b', 200, 50)] },
    ]
    const { container } = render({ keyframes, currentTime: 0.5, width: 400, height: 200 })
    expect(container.querySelector('[data-mol-id="animation-canvas-shape-a"]')).not.toBeNull()
    expect(container.querySelector('[data-mol-id="animation-canvas-shape-b"]')).not.toBeNull()
  })

  it('positions shapes at the linearly-interpolated midpoint', () => {
    const keyframes: AnimationKeyframe[] = [
      { time: 0, state: [oneShape('a', 0, 0)] },
      { time: 1, state: [oneShape('a', 100, 60)] },
    ]
    const { container } = render({ keyframes, currentTime: 0.5, width: 400, height: 200 })
    const g = container.querySelector<SVGGElement>('[data-mol-id="animation-canvas-shape-a"]')!
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
    const { container } = render({ keyframes, currentTime: 0.25, width: 400, height: 200 })
    const g = container.querySelector<SVGGElement>('[data-mol-id="animation-canvas-shape-a"]')!
    const xMatch = g.getAttribute('transform')!.match(/translate\(([-\d.]+) /)
    const x = parseFloat(xMatch![1])
    // easeIn at 0.25 must be < 25 (linear) but > 0.
    expect(x).toBeLessThan(25)
    expect(x).toBeGreaterThan(0)
  })

  it('renders correctly at exact keyframe boundaries', async () => {
    const keyframes: AnimationKeyframe[] = [
      { time: 0, state: [oneShape('a', 0, 0)] },
      { time: 1, state: [oneShape('a', 100, 0)] },
      { time: 2, state: [oneShape('a', 50, 0)] },
    ]
    for (const [time, expected] of [
      [0, 'translate(0 0)'],
      [1, 'translate(100 0)'],
      [2, 'translate(50 0)'],
    ] as const) {
      const rendered = render({ keyframes, currentTime: time, width: 400, height: 200 })
      const g = rendered.container.querySelector<SVGGElement>(
        '[data-mol-id="animation-canvas-shape-a"]',
      )!
      expect(g.getAttribute('transform')).toContain(expected)
      await rendered.destroy()
      mounted.splice(mounted.indexOf(rendered), 1)
    }
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
      }
    }
    try {
      const { container } = render({
        keyframes,
        currentTime: 0,
        onSeek,
        width: 400,
        height: 200,
      })
      const root = container.querySelector('[data-mol-id="animation-canvas"]')!
      // Click at x=100 → ratio 0.25 → time 0 + 0.25 * 2 = 0.5.
      root.dispatchEvent(
        new PointerEvent('pointerdown', { clientX: 100, clientY: 50, bubbles: true }),
      )
      expect(onSeek).toHaveBeenCalledTimes(1)
      expect(onSeek.mock.calls[0]![0]).toBeCloseTo(0.5, 6)
    } finally {
      Element.prototype.getBoundingClientRect = origGet
    }
  })

  it('renders fewer shape groups when shapes vanish (still rendered with eased opacity)', () => {
    const keyframes: AnimationKeyframe[] = [
      { time: 0, state: [oneShape('a', 0, 0), oneShape('b', 0, 0)] },
      { time: 1, state: [oneShape('a', 100, 0)] },
    ]
    const { container } = render({ keyframes, currentTime: 1, width: 400, height: 200 })
    // At final keyframe `b` is gone — interpolateState returns it with
    // opacity 0 (faded out). The group is still in the DOM but with
    // opacity 0 so it's not visible.
    const groups = container.querySelectorAll('[data-shape-id]')
    expect(groups.length).toBeGreaterThanOrEqual(1)
    const a = container.querySelector('[data-mol-id="animation-canvas-shape-a"]')!
    expect(a.getAttribute('opacity')).toBe('1')
  })
})
