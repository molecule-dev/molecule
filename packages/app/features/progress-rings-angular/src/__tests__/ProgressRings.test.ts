// @vitest-environment jsdom
/**
 * Unit tests of the Angular `<ProgressRings>` — a port of
 * `@molecule/app-progress-rings-react/src/__tests__/ProgressRings.test.tsx`:
 * the same test names and the same behavioral assertions (single + concentric
 * variants, geometry, accessibility wiring), mounted through Angular's real
 * renderer (the same `createApplication` + JIT host approach the conformance
 * kit's Angular adapter uses) with the mocked ClassMap/i18n the React suite
 * uses.
 *
 * @module
 */

import '@angular/compiler'
import {
  ChangeDetectionStrategy,
  Component,
  type ComponentRef,
  createComponent,
  provideZonelessChangeDetection,
  type Type,
} from '@angular/core'
import { type ApplicationRef, createApplication } from '@angular/platform-browser'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@molecule/app-ui', () => ({
  getClassMap: () => ({
    cn: (...args: unknown[]) => args.flat().filter(Boolean).join(' '),
  }),
}))

vi.mock('@molecule/app-angular', () => ({
  useTranslation: () => ({
    t: (_key: string, values?: Record<string, unknown>, opts?: { defaultValue?: string }) => {
      let s = opts?.defaultValue ?? _key
      if (values) {
        for (const [k, v] of Object.entries(values)) {
          s = s.replaceAll(`{{${k}}}`, String(v))
        }
      }
      return s
    },
  }),
}))

const { ProgressRings } = await import('../progress-rings.component.js')

/** The host template: the component on its React root element, inputs bound. */
const TEMPLATE = `<svg mol-progress-rings [rings]="p['rings']" [size]="p['size']" [strokeWidth]="p['strokeWidth']" [gap]="p['gap']" [cornerRadius]="p['cornerRadius']" [className]="p['className']" [dataMolId]="p['dataMolId']" [ariaLabel]="p['ariaLabel']"></svg>`

/** A mounted spec host: its DOM and teardown. */
interface Mounted {
  /** The host element whose children the component template produced. */
  readonly host: HTMLElement
  /** Destroys the app and removes the host. */
  destroy(): Promise<void>
}

/**
 * Mounts one standalone component through a JIT host template, written
 * exactly the way an Angular app would write it.
 *
 * @param component - The component class under test.
 * @param props - The props object the template reads as `p['rings']` etc.
 * @returns The mounted host.
 */
async function mount(component: Type<unknown>, props: Record<string, unknown>): Promise<Mounted> {
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
    destroy: async () => {
      appRef.destroy()
      host.remove()
    },
  }
}

const teardowns: Array<() => Promise<void>> = []

afterEach(async () => {
  for (const teardown of teardowns.splice(0)) await teardown()
  document.body.innerHTML = ''
})

/**
 * Mounts a `<ProgressRings>` and returns the element it rendered into.
 *
 * @param props - The component props.
 * @returns The mount container.
 */
async function render(props: Record<string, unknown>): Promise<HTMLElement> {
  const mounted = await mount(ProgressRings, props)
  teardowns.push(mounted.destroy)
  return mounted.host
}

describe('<ProgressRings>', () => {
  describe('single-ring variant', () => {
    it('renders one ring (1 group, 2 circles — track + arc)', async () => {
      const container = await render({ rings: [{ value: 50, max: 100, color: '#ff0000' }] })
      const groups = container.querySelectorAll('g')
      expect(groups).toHaveLength(1)
      const circles = container.querySelectorAll('circle')
      expect(circles).toHaveLength(2)
    })

    it('uses the supplied color as the stroke', async () => {
      const container = await render({ rings: [{ value: 1, max: 1, color: '#abcdef' }] })
      const circles = container.querySelectorAll('circle')
      expect(circles[0]?.getAttribute('stroke')).toBe('#abcdef')
      expect(circles[1]?.getAttribute('stroke')).toBe('#abcdef')
    })
  })

  describe('triad / concentric variant', () => {
    it('renders 3 rings as 3 nested groups', async () => {
      const container = await render({
        rings: [
          { value: 8, max: 10, color: '#a' },
          { value: 5, max: 8, color: '#b' },
          { value: 2, max: 4, color: '#c' },
        ],
      })
      const groups = container.querySelectorAll('g')
      expect(groups).toHaveLength(3)
      // 2 circles per ring (track + arc) × 3 rings = 6
      expect(container.querySelectorAll('circle')).toHaveLength(6)
    })

    it('nests inner rings with smaller radii than outer rings', async () => {
      const container = await render({
        size: 200,
        strokeWidth: 10,
        gap: 4,
        rings: [
          { value: 1, max: 2, color: '#a' },
          { value: 1, max: 2, color: '#b' },
          { value: 1, max: 2, color: '#c' },
        ],
      })
      const tracks = Array.from(container.querySelectorAll('g')).map((g) =>
        Number(g.querySelector('circle')?.getAttribute('r') ?? 0),
      )
      expect(tracks[0]).toBeGreaterThan(tracks[1] ?? 0)
      expect(tracks[1]).toBeGreaterThan(tracks[2] ?? 0)
    })
  })

  describe('geometry math', () => {
    it('clamps overflow values (value > max) so dasharray never exceeds the circumference', async () => {
      const container = await render({
        size: 100,
        strokeWidth: 10,
        rings: [{ value: 999, max: 100, color: '#000' }],
      })
      const arc = container.querySelectorAll('circle')[1]
      const radius = Number(arc?.getAttribute('r'))
      const circumference = 2 * Math.PI * radius
      const dasharray = arc?.getAttribute('stroke-dasharray') ?? ''
      const filled = Number(dasharray.split(' ')[0])
      expect(filled).toBeLessThanOrEqual(circumference + 0.01)
      expect(filled).toBeCloseTo(circumference, 3)
    })

    it('clamps underflow values (value < 0) to 0', async () => {
      const container = await render({ rings: [{ value: -10, max: 100, color: '#000' }] })
      const arc = container.querySelectorAll('circle')[1]
      const filled = Number((arc?.getAttribute('stroke-dasharray') ?? '0').split(' ')[0])
      expect(filled).toBe(0)
    })

    it('falls back to max=1 when max<=0 (avoids divide-by-zero)', async () => {
      // Should render without throwing.
      const container = await render({ rings: [{ value: 0.5, max: 0, color: '#000' }] })
      expect(container.querySelectorAll('circle').length).toBe(2)
    })
  })

  describe('accessibility', () => {
    it('renders role="img" on the outer SVG and a translated default aria-label', async () => {
      const container = await render({
        rings: [
          { value: 1, max: 2, color: '#a' },
          { value: 1, max: 2, color: '#b' },
        ],
      })
      const svg = container.querySelector('svg')
      expect(svg?.getAttribute('role')).toBe('img')
      expect(svg?.getAttribute('aria-label')).toBe('Progress rings (2 rings)')
    })

    it('honors an explicit ariaLabel prop', async () => {
      const container = await render({
        ariaLabel: 'Daily activity rings',
        rings: [{ value: 1, max: 2, color: '#a' }],
      })
      expect(container.querySelector('svg')?.getAttribute('aria-label')).toBe(
        'Daily activity rings',
      )
    })

    it("uses per-ring `label` as that group's aria-label", async () => {
      const container = await render({
        rings: [
          { value: 1, max: 2, color: '#a', label: 'Steps' },
          { value: 1, max: 2, color: '#b', label: 'Sleep' },
        ],
      })
      const groups = container.querySelectorAll('g')
      expect(groups[0]?.getAttribute('aria-label')).toBe('Steps')
      expect(groups[1]?.getAttribute('aria-label')).toBe('Sleep')
    })

    it('falls back to a translated per-ring label when none is supplied', async () => {
      const container = await render({
        rings: [
          { value: 1, max: 2, color: '#a' },
          { value: 1, max: 2, color: '#b' },
        ],
      })
      const groups = container.querySelectorAll('g')
      expect(groups[0]?.getAttribute('aria-label')).toBe('Ring 1')
      expect(groups[1]?.getAttribute('aria-label')).toBe('Ring 2')
    })

    it('exposes a customisable data-mol-id for AI-agent selectors', async () => {
      const container = await render({
        dataMolId: 'health-summary-rings',
        rings: [{ value: 1, max: 2, color: '#a' }],
      })
      expect(container.querySelector('svg')?.getAttribute('data-mol-id')).toBe(
        'health-summary-rings',
      )
    })

    it('defaults the data-mol-id to "progress-rings"', async () => {
      const container = await render({ rings: [{ value: 1, max: 2, color: '#a' }] })
      expect(container.querySelector('svg')?.getAttribute('data-mol-id')).toBe('progress-rings')
    })
  })

  describe('configurable geometry props', () => {
    it('respects custom size', async () => {
      const container = await render({ size: 240, rings: [{ value: 1, max: 2, color: '#a' }] })
      const svg = container.querySelector('svg')
      expect(svg?.getAttribute('width')).toBe('240')
      expect(svg?.getAttribute('height')).toBe('240')
      expect(svg?.getAttribute('viewBox')).toBe('0 0 240 240')
    })

    it('respects custom strokeWidth', async () => {
      const container = await render({
        strokeWidth: 20,
        rings: [{ value: 1, max: 2, color: '#a' }],
      })
      const arc = container.querySelectorAll('circle')[1]
      expect(arc?.getAttribute('stroke-width')).toBe('20')
    })

    it('cornerRadius="butt" sets strokeLinecap to butt on the arc', async () => {
      const container = await render({
        cornerRadius: 'butt',
        rings: [{ value: 1, max: 2, color: '#a' }],
      })
      const arc = container.querySelectorAll('circle')[1]
      expect(arc?.getAttribute('stroke-linecap')).toBe('butt')
    })

    it('defaults to round caps (Apple-Health pill look)', async () => {
      const container = await render({ rings: [{ value: 1, max: 2, color: '#a' }] })
      const arc = container.querySelectorAll('circle')[1]
      expect(arc?.getAttribute('stroke-linecap')).toBe('round')
    })
  })
})
