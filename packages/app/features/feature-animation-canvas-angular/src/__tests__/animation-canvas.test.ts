// @vitest-environment jsdom
/**
 * Unit tests of `AnimationCanvas` — the port of
 * `@molecule/app-feature-animation-canvas-react`'s own suite. The React suite
 * renders the component with a stubbed ClassMap and asserts the markup; this
 * port mounts the same tree through Angular's real renderer (the same
 * `createApplication` + JIT host approach the conformance kit's Angular
 * adapter uses) and asserts the same markup.
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

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'

const { AnimationCanvas } = await import('../animation-canvas.component.js')

beforeEach(() => {
  setProvider(createSimpleI18nProvider('en'))
})

/** The host template every case mounts: the canvas plus all its inputs. */
const TEMPLATE = `<svg mol-animation-canvas [keyframes]="p['keyframes']" [currentTime]="p['currentTime']" [onSeek]="p['onSeek']" [onChange]="p['onChange']" [width]="p['width']" [height]="p['height']" [className]="p['className']"></svg>`

/** A mounted spec host: its DOM, a props setter, and a teardown. */
interface Mounted {
  /** The host element whose children the component template produced. */
  readonly host: HTMLElement
  /** Merges props over the current ones and flushes change detection. */
  setProps(next: Record<string, unknown>): Promise<void>
  /** Destroys the app and removes the host. */
  destroy(): Promise<void>
}

const mounted: Mounted[] = []

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
})

/**
 * Mounts the canvas through a JIT host template, written exactly the way an
 * Angular app would write it.
 *
 * @param props - The inputs the template binds as `p['name']`.
 * @returns The mounted host.
 */
async function render(props: Record<string, unknown> = {}): Promise<Mounted> {
  const Host = Component({
    selector: 'mol-spec-host',
    standalone: true,
    imports: [AnimationCanvas as Type<unknown>],
    changeDetection: ChangeDetectionStrategy.Eager,
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
  const rendered: Mounted = {
    host,
    setProps: async (next: Record<string, unknown>) => {
      ref.instance.p = { ...ref.instance.p, ...next }
      ref.changeDetectorRef.markForCheck()
      appRef.tick()
    },
    destroy: async () => {
      appRef.destroy()
      host.remove()
    },
  }
  mounted.push(rendered)
  return rendered
}

/** The rendered canvas root (`svg[mol-animation-canvas]`). */
const canvasEl = (host: HTMLElement): SVGSVGElement => {
  const el = host.querySelector('svg[mol-animation-canvas]')
  if (!el) throw new Error('no AnimationCanvas host rendered')
  return el as SVGSVGElement
}

/** The shape group of one shape id. */
const shapeEl = (host: HTMLElement, id: string): SVGGElement => {
  const el = host.querySelector(`[data-shape-id="${id}"]`)
  if (!el) throw new Error(`no shape ${id} rendered`)
  return el as SVGGElement
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
  it('renders a labelled root svg', async () => {
    const keyframes = [
      { time: 0, state: [oneShape('a', 0, 0)] },
      { time: 1, state: [oneShape('a', 100, 0)] },
    ]
    const m = await render({ keyframes, currentTime: 0, width: 400, height: 200 })
    const root = m.host.querySelector('[data-mol-id="animation-canvas"]')
    expect(root).not.toBeNull()
    expect(root?.getAttribute('role')).toBe('img')
  })

  it('labels the canvas root only (shape groups carry no aria-label)', async () => {
    const keyframes = [
      { time: 0, state: [oneShape('a', 0, 0)] },
      { time: 1, state: [oneShape('a', 100, 0)] },
    ]
    const m = await render({ keyframes, currentTime: 0, width: 400, height: 200 })
    // The root `<svg role="img">` names the whole picture…
    const root = m.host.querySelector('[data-mol-id="animation-canvas"]') as SVGSVGElement
    expect(root.getAttribute('aria-label')).toBe('Animation canvas')
    // …and the shape groups inside it are presentational, so they expose no
    // label of their own (axe's aria-prohibited-attr).
    expect(shapeEl(m.host, 'a').getAttribute('aria-label')).toBeNull()
  })

  it('renders one visible shape group per shape', async () => {
    const keyframes = [
      { time: 0, state: [oneShape('a', 0, 0), oneShape('b', 50, 50)] },
      { time: 1, state: [oneShape('a', 100, 0), oneShape('b', 200, 50)] },
    ]
    const m = await render({ keyframes, currentTime: 0.5, width: 400, height: 200 })
    expect(m.host.querySelector('[data-mol-id="animation-canvas-shape-a"]')).not.toBeNull()
    expect(m.host.querySelector('[data-mol-id="animation-canvas-shape-b"]')).not.toBeNull()
  })

  it('positions shapes at the linearly-interpolated midpoint', async () => {
    const keyframes = [
      { time: 0, state: [oneShape('a', 0, 0)] },
      { time: 1, state: [oneShape('a', 100, 60)] },
    ]
    const m = await render({ keyframes, currentTime: 0.5, width: 400, height: 200 })
    expect(shapeEl(m.host, 'a').getAttribute('transform')).toContain('translate(50 30)')
  })

  it('uses easing when set on the target keyframe', async () => {
    const keyframes = [
      { time: 0, state: [oneShape('a', 0, 0)] },
      { time: 1, state: [{ ...oneShape('a', 100, 0), easing: 'easeIn' }] },
    ]
    const m = await render({ keyframes, currentTime: 0.25, width: 400, height: 200 })
    const xMatch = shapeEl(m.host, 'a')
      .getAttribute('transform')!
      .match(/translate\(([-\d.]+) /)
    const x = parseFloat(xMatch![1])
    // easeIn at 0.25 must be < 25 (linear) but > 0.
    expect(x).toBeLessThan(25)
    expect(x).toBeGreaterThan(0)
  })

  it('renders correctly at exact keyframe boundaries', async () => {
    const keyframes = [
      { time: 0, state: [oneShape('a', 0, 0)] },
      { time: 1, state: [oneShape('a', 100, 0)] },
      { time: 2, state: [oneShape('a', 50, 0)] },
    ]
    const m = await render({ keyframes, currentTime: 0, width: 400, height: 200 })
    expect(shapeEl(m.host, 'a').getAttribute('transform')).toContain('translate(0 0)')

    await m.setProps({ currentTime: 1 })
    expect(shapeEl(m.host, 'a').getAttribute('transform')).toContain('translate(100 0)')

    await m.setProps({ currentTime: 2 })
    expect(shapeEl(m.host, 'a').getAttribute('transform')).toContain('translate(50 0)')
  })

  it('seeks via onSeek when canvas is clicked', async () => {
    const keyframes = [
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
      const m = await render({ keyframes, currentTime: 0, onSeek, width: 400, height: 200 })
      const root = canvasEl(m.host)
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

  it('renders fewer shape groups when shapes vanish (still rendered with eased opacity)', async () => {
    const keyframes = [
      { time: 0, state: [oneShape('a', 0, 0), oneShape('b', 0, 0)] },
      { time: 1, state: [oneShape('a', 100, 0)] },
    ]
    const m = await render({ keyframes, currentTime: 1, width: 400, height: 200 })
    // At final keyframe `b` is gone — interpolateState returns it with
    // opacity 0 (faded out). The group is still in the DOM but with
    // opacity 0 so it's not visible.
    const groups = m.host.querySelectorAll('[data-shape-id]')
    expect(groups.length).toBeGreaterThanOrEqual(1)
    const a = m.host.querySelector('[data-mol-id="animation-canvas-shape-a"]')!
    expect(a.getAttribute('opacity')).toBe('1')
  })
})
