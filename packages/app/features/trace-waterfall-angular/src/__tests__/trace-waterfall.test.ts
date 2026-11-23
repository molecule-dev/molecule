// @vitest-environment jsdom
/**
 * Unit tests for the Angular trace waterfall — a port of
 * `@molecule/app-trace-waterfall-react/src/__tests__/TraceWaterfall.test.tsx`:
 * the same behavioral assertions, mounted through Angular's real renderer (the
 * `createApplication` + JIT host approach the conformance kit's Angular adapter
 * uses) and asserted on the markup it produces.
 *
 * @module
 */

import '@angular/compiler'
import {
  type ApplicationRef,
  ChangeDetectionStrategy,
  Component,
  createComponent,
  provideZonelessChangeDetection,
  type Type,
} from '@angular/core'
import { createApplication } from '@angular/platform-browser'
import { afterEach, describe, expect, it, vi } from 'vitest'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `flex`), so tests can assert which cm.* call was applied without a real
// bond — the same mock the React package's own tests use.
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

import { provideI18n } from '@molecule/app-angular'
import { createSimpleI18nProvider } from '@molecule/app-i18n'

import { formatDurationLabel } from '../format.js'
import { layoutSpans, serviceColor } from '../layout.js'
import type { Span } from '../types.js'

const { TraceWaterfall } = await import('../trace-waterfall.component.js')

/** A mounted host: its element and a teardown. */
interface Mounted {
  /** The host element the component template produced. */
  readonly host: HTMLElement
  /** Destroys the app and removes the host. */
  destroy(): Promise<void>
}

const mounted: Mounted[] = []

/**
 * Mounts a host component through Angular's real renderer and ticks it once.
 *
 * @param host - The host component type.
 * @returns The mounted host.
 */
async function mountHost(host: Type<unknown>): Promise<Mounted> {
  const appRef: ApplicationRef = await createApplication({
    providers: [provideZonelessChangeDetection(), provideI18n(createSimpleI18nProvider('en'))],
  })
  const ref = createComponent(host, { environmentInjector: appRef.injector })
  const element = ref.location.nativeElement as HTMLElement
  document.body.appendChild(element)
  appRef.attachView(ref.hostView)
  appRef.tick()
  const entry: Mounted = {
    host: element,
    destroy: async () => {
      ref.destroy()
      element.remove()
      await appRef.destroy()
    },
  }
  mounted.push(entry)
  return entry
}

/**
 * Renders the waterfall the way an app would: through a JIT host template, with
 * an `<ng-template>` for the node-valued `emptyState` prop when the case
 * supplies one.
 *
 * @param props - The component inputs.
 * @param emptyState - Markup for the `emptyState` node, when it is supplied.
 * @returns The mounted host.
 */
async function render(props: Record<string, unknown> = {}, emptyState?: string): Promise<Mounted> {
  const Host = Component({
    changeDetection: ChangeDetectionStrategy.Default,
    selector: 'mol-spec-host',
    standalone: true,
    imports: [TraceWaterfall as Type<unknown>],
    template: `
      ${emptyState === undefined ? '' : `<ng-template #emptyTpl>${emptyState}</ng-template>`}
      <mol-trace-waterfall
        [spans]="p['spans']"
        [rootSpanId]="p['rootSpanId']"
        [selectedSpanId]="p['selectedSpanId']"
        [onSpanClick]="p['onSpanClick']"
        [className]="p['className']"
        ${emptyState === undefined ? '' : '[emptyState]="emptyTpl"'}
      ></mol-trace-waterfall>
    `,
  })(
    class SpecHost {
      /** The inputs the template binds. */
      p: Record<string, unknown> = props
    },
  )
  return mountHost(Host)
}

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
  document.body.replaceChildren()
})

const sampleSpans: Span[] = [
  { id: 'a', name: 'GET /api', service: 'edge', startTime: 0, duration: 100, status: 'ok' },
  { id: 'b', parentId: 'a', name: 'auth.verify', service: 'auth', startTime: 5, duration: 20 },
  { id: 'c', parentId: 'a', name: 'db.query', service: 'db', startTime: 30, duration: 60 },
  { id: 'd', parentId: 'c', name: 'pg.exec', service: 'db', startTime: 32, duration: 50 },
]

describe('formatDurationLabel', () => {
  it('renders sub-millisecond durations as microseconds', () => {
    expect(formatDurationLabel(0.25)).toBe('250µs')
  })
  it('renders sub-second durations as milliseconds', () => {
    expect(formatDurationLabel(125)).toBe('125ms')
  })
  it('renders durations >= 1000 as seconds with one decimal', () => {
    expect(formatDurationLabel(2500)).toBe('2.5s')
  })
  it('clamps invalid values to 0ms', () => {
    expect(formatDurationLabel(-1)).toBe('0ms')
    expect(formatDurationLabel(Number.NaN)).toBe('0ms')
  })
})

describe('serviceColor', () => {
  it('is deterministic per service name', () => {
    expect(serviceColor('auth')).toBe(serviceColor('auth'))
  })
  it('produces different colors for different services in most cases', () => {
    // Across a handful of names we should see at least 2 distinct colors.
    const colors = new Set(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map(serviceColor))
    expect(colors.size).toBeGreaterThan(1)
  })
})

describe('layoutSpans', () => {
  it('returns rows in depth-first order with correct depths', () => {
    const layout = layoutSpans(sampleSpans)
    expect(layout.rows.map((r) => r.span.id)).toEqual(['a', 'b', 'c', 'd'])
    expect(layout.rows.map((r) => r.depth)).toEqual([0, 1, 1, 2])
  })
  it('sorts siblings by start time', () => {
    const out = layoutSpans([
      { id: 'a', name: 'a', startTime: 0, duration: 100 },
      { id: 'c', parentId: 'a', name: 'c', startTime: 50, duration: 10 },
      { id: 'b', parentId: 'a', name: 'b', startTime: 10, duration: 10 },
    ])
    expect(out.rows.map((r) => r.span.id)).toEqual(['a', 'b', 'c'])
  })
  it('treats orphan parentId as root', () => {
    const out = layoutSpans([
      { id: 'x', parentId: 'missing', name: 'x', startTime: 0, duration: 5 },
    ])
    expect(out.rows).toHaveLength(1)
    expect(out.rows[0].depth).toBe(0)
  })
  it('computes start/width fractions over the trace duration', () => {
    const layout = layoutSpans(sampleSpans)
    // trace runs 0..100, so root spans full width starting at 0.
    expect(layout.rows[0].startFraction).toBe(0)
    expect(layout.rows[0].widthFraction).toBe(1)
    // child b: start 5, dur 20 → 0.05 / 0.20 fractions
    expect(layout.rows[1].startFraction).toBeCloseTo(0.05)
    expect(layout.rows[1].widthFraction).toBeCloseTo(0.2)
  })
  it('restricts output to a subtree when rootSpanId is provided', () => {
    const layout = layoutSpans(sampleSpans, 'c')
    expect(layout.rows.map((r) => r.span.id)).toEqual(['c', 'd'])
    expect(layout.rows[0].depth).toBe(0)
    expect(layout.rows[1].depth).toBe(1)
  })
  it('returns an empty layout for an empty input', () => {
    const layout = layoutSpans([])
    expect(layout.rows).toEqual([])
    expect(layout.traceDuration).toBe(1)
  })
  it('clamps traceDuration to a positive value when all spans collapse to a point', () => {
    const layout = layoutSpans([{ id: 'a', name: 'a', startTime: 5, duration: 0 }])
    expect(layout.traceDuration).toBe(1)
  })
})

describe('<TraceWaterfall>', () => {
  it('renders a region with the expected aria-label', async () => {
    const container = (await render({ spans: sampleSpans })).host
    const root = container.querySelector('[data-mol-id="trace-waterfall"]')
    expect(root).not.toBeNull()
    expect(root?.getAttribute('role')).toBe('region')
    expect(root?.getAttribute('aria-label')).toBe('Distributed trace waterfall')
  })

  it('renders one row per span', async () => {
    const container = (await render({ spans: sampleSpans })).host
    const rows = container.querySelectorAll('[data-mol-id="trace-waterfall-row"]')
    expect(rows).toHaveLength(4)
  })

  it('renders the time axis with multiple ticks', async () => {
    const container = (await render({ spans: sampleSpans })).host
    const ticks = container.querySelectorAll('[data-mol-id="trace-waterfall-axis-tick"]')
    expect(ticks.length).toBeGreaterThanOrEqual(2)
  })

  it('renders a service tag with a color when service is present', async () => {
    const container = (await render({ spans: sampleSpans })).host
    const tags = container.querySelectorAll('[data-mol-id="trace-waterfall-service-tag"]')
    expect(tags.length).toBe(4)
    const first = tags[0] as HTMLElement
    expect(first.style.background).not.toBe('')
  })

  it('omits the service tag when service is missing', async () => {
    const container = (
      await render({ spans: [{ id: 'solo', name: 'lone', startTime: 0, duration: 10 }] })
    ).host
    const tags = container.querySelectorAll('[data-mol-id="trace-waterfall-service-tag"]')
    expect(tags).toHaveLength(0)
  })

  it('uses the error color for spans with status="error"', async () => {
    const container = (
      await render({
        spans: [{ id: 'a', name: 'boom', startTime: 0, duration: 10, status: 'error' }],
      })
    ).host
    const bar = container.querySelector('[data-mol-id="trace-waterfall-bar"]') as HTMLElement
    expect(bar.style.background).toBe('rgb(239, 68, 68)')
  })

  it('positions bars by start fraction and width fraction', async () => {
    const container = (await render({ spans: sampleSpans })).host
    const bars = container.querySelectorAll('[data-mol-id="trace-waterfall-bar"]')
    // sampleSpans[1] = b: startTime 5 / duration 20 / total 100 → left 5%, width 20%
    const bBar = bars[1] as HTMLElement
    expect(bBar.style.left).toBe('5%')
    expect(bBar.style.width).toBe('20%')
  })

  it('calls onSpanClick with the clicked span', async () => {
    const onSpanClick = vi.fn()
    const container = (await render({ spans: sampleSpans, onSpanClick })).host
    const row = container.querySelector('[data-span-id="b"]') as HTMLElement
    row.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(onSpanClick).toHaveBeenCalledTimes(1)
    expect(onSpanClick.mock.calls[0][0].id).toBe('b')
  })

  it('is keyboard-activatable when interactive', async () => {
    const onSpanClick = vi.fn()
    const container = (await render({ spans: sampleSpans, onSpanClick })).host
    const row = container.querySelector('[data-span-id="c"]') as HTMLElement
    expect(row.getAttribute('tabindex')).toBe('0')
    row.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    expect(onSpanClick).toHaveBeenCalledTimes(1)
    expect(onSpanClick.mock.calls[0][0].id).toBe('c')
  })

  it('is keyboard-activatable with Space', async () => {
    const onSpanClick = vi.fn()
    const container = (await render({ spans: sampleSpans, onSpanClick })).host
    const row = container.querySelector('[data-span-id="d"]') as HTMLElement
    row.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }))
    expect(onSpanClick).toHaveBeenCalledTimes(1)
    expect(onSpanClick.mock.calls[0][0].id).toBe('d')
  })

  it('marks every treeitem aria-selected=false when nothing is selected', async () => {
    const container = (await render({ spans: sampleSpans })).host
    const rows = container.querySelectorAll('[data-mol-id="trace-waterfall-row"]')
    expect(rows).toHaveLength(4)
    for (const row of rows) {
      expect(row.getAttribute('aria-selected')).toBe('false')
    }
  })

  it('marks the selectedSpanId row aria-selected=true and the rest false', async () => {
    const container = (await render({ spans: sampleSpans, selectedSpanId: 'b' })).host
    const selected = container.querySelector('[data-span-id="b"]') as HTMLElement
    expect(selected.getAttribute('aria-selected')).toBe('true')
    const other = container.querySelector('[data-span-id="a"]') as HTMLElement
    expect(other.getAttribute('aria-selected')).toBe('false')
  })

  it('restricts the rendered subtree to rootSpanId when provided', async () => {
    const container = (await render({ spans: sampleSpans, rootSpanId: 'c' })).host
    const rows = container.querySelectorAll('[data-mol-id="trace-waterfall-row"]')
    expect(rows).toHaveLength(2)
    const ids = Array.from(rows).map((r) => r.getAttribute('data-span-id'))
    expect(ids).toEqual(['c', 'd'])
  })

  it('renders the empty fallback when there are no spans', async () => {
    const container = (await render({ spans: [] })).host
    const empty = container.querySelector('[data-mol-id="trace-waterfall-empty"]')
    expect(empty).not.toBeNull()
    expect(empty?.textContent).toContain('No spans')
  })

  it('honors a custom emptyState', async () => {
    const container = (await render({ spans: [] }, '<div data-testid="custom-empty">no data</div>'))
      .host
    expect(container.querySelector('[data-testid="custom-empty"]')).not.toBeNull()
    expect(container.querySelector('[data-mol-id="trace-waterfall-empty"]')).toBeNull()
  })
})
