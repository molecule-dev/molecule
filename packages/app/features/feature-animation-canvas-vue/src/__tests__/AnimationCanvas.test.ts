// @vitest-environment jsdom
/**
 * Unit tests for the Vue `AnimationCanvas` — a port of
 * `@molecule/app-feature-animation-canvas-react/src/__tests__/AnimationCanvas.test.tsx`:
 * the same behavioral assertions, rendered with Vue in jsdom and asserted on
 * the markup the component produces.
 *
 * @module
 */

import { afterEach, describe, expect, it, vi } from 'vitest'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `relative`), so a real ClassMap bond is not needed — the same stub the React
// tests install.
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

import { createApp, defineComponent, h, nextTick, ref } from 'vue'

import { createSimpleI18nProvider } from '@molecule/app-i18n'
import { createI18nPlugin } from '@molecule/app-vue'

import { AnimationCanvas } from '../AnimationCanvas.js'
import type { AnimationCanvasProps, AnimationKeyframe } from '../types.js'

const i18n = createSimpleI18nProvider('en')

const apps: Array<{ app: ReturnType<typeof createApp>; host: HTMLElement }> = []

afterEach(() => {
  for (const { app, host } of apps.splice(0)) {
    app.unmount()
    host.remove()
  }
})

/** A mounted canvas: its container and a props setter. */
interface Rendered {
  /** The element holding the mounted canvas. */
  container: HTMLElement
  /** Merges props over the current ones and waits for the re-render. */
  setProps(next: Partial<AnimationCanvasProps>): Promise<void>
}

/**
 * Renders an {@link AnimationCanvas} with the given props.
 *
 * @param props - The canvas props.
 * @returns The mount container and a props setter.
 */
function render(props: AnimationCanvasProps): Rendered {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const propsRef = ref<AnimationCanvasProps>(props)
  const app = createApp(
    defineComponent({
      render: () => h(AnimationCanvas, propsRef.value),
    }),
  )
  app.use(createI18nPlugin(i18n))
  app.mount(host)
  apps.push({ app, host })
  return {
    container: host,
    setProps: async (next: Partial<AnimationCanvasProps>) => {
      propsRef.value = { ...propsRef.value, ...next }
      await nextTick()
    },
  }
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
    const root = container.querySelector('[data-mol-id="animation-canvas"]') as SVGSVGElement
    expect(root.getAttribute('aria-label')).toBe('Animation canvas')
    // …and the shape groups inside it are presentational, so they expose no
    // label of their own (axe's aria-prohibited-attr).
    const shape = container.querySelector('[data-mol-id="animation-canvas-shape-a"]') as SVGGElement
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
    const { container } = render({ keyframes, currentTime: 0.25, width: 400, height: 200 })
    const g = container.querySelector('[data-mol-id="animation-canvas-shape-a"]') as SVGGElement
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
    const { container, setProps } = render({ keyframes, currentTime: 0, width: 400, height: 200 })
    let g = container.querySelector('[data-mol-id="animation-canvas-shape-a"]') as SVGGElement
    expect(g.getAttribute('transform')).toContain('translate(0 0)')

    await setProps({ currentTime: 1 })
    g = container.querySelector('[data-mol-id="animation-canvas-shape-a"]') as SVGGElement
    expect(g.getAttribute('transform')).toContain('translate(100 0)')

    await setProps({ currentTime: 2 })
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
