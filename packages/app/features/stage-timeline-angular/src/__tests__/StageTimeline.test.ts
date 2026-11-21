// @vitest-environment jsdom
/**
 * Unit tests of `StageTimeline` — the port of
 * `@molecule/app-stage-timeline-react`'s own suite. The React suite renders the
 * component with mocked UI dependencies and asserts the markup; this port
 * mounts the same mocked tree through Angular's real renderer (the same
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
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@molecule/app-ui', () => ({
  getClassMap: () => ({
    cn: (...args: unknown[]) => args.flat().filter(Boolean).join(' '),
    textSize: () => 'text',
    fontWeight: () => 'fw',
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

import type { StageTimelineStage } from '../types.js'

const { StageTimeline, statusOf } = await import('../stage-timeline.component.js')

const STAGES: StageTimelineStage[] = [
  { id: 'applied', label: 'Applied' },
  { id: 'screen', label: 'Phone Screen' },
  { id: 'onsite', label: 'On-site' },
  { id: 'offer', label: 'Offer' },
]

/** A mounted spec host: its DOM, a props setter, and a teardown. */
interface Mounted {
  /** The host element whose children the component template produced. */
  readonly host: HTMLElement
  /** Merges props over the current ones and flushes change detection. */
  setProps(next: Record<string, unknown>): Promise<void>
  /** Destroys the app and removes the host. */
  destroy(): Promise<void>
}

/**
 * Mounts the component through a JIT host template, written exactly the way
 * an Angular app would write it.
 *
 * @param props - The props object the template reads as `p['name']`.
 * @returns The mounted host.
 */
async function mount(props: Record<string, unknown>): Promise<Mounted> {
  const Host = Component({
    selector: 'mol-spec-host',
    standalone: true,
    imports: [StageTimeline as Type<unknown>],
    changeDetection: ChangeDetectionStrategy.Default,
    // prettier-ignore
    template: `<div mol-stage-timeline [stages]="p['stages']" [currentIndex]="p['currentIndex']" [dataMolId]="p['dataMolId']" [className]="p['className']"></div>`,
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
}

/** The component element (`div[mol-stage-timeline]`), which is React's root. */
const rootEl = (host: HTMLElement): HTMLElement => {
  const el = host.querySelector('[mol-stage-timeline]')
  if (!el) throw new Error('no StageTimeline host rendered')
  return el as HTMLElement
}

const mounted: Mounted[] = []

const render = async (props: Record<string, unknown> = {}): Promise<Mounted> => {
  const m = await mount(props)
  mounted.push(m)
  return m
}

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
})

describe('statusOf', () => {
  it('marks indices below current as completed', () => {
    expect(statusOf(0, 2)).toBe('completed')
    expect(statusOf(1, 2)).toBe('completed')
  })
  it('marks the current index as current', () => {
    expect(statusOf(2, 2)).toBe('current')
  })
  it('marks indices above current as upcoming', () => {
    expect(statusOf(3, 2)).toBe('upcoming')
  })
  it('renders nothing-completed for currentIndex=-1', () => {
    expect(statusOf(0, -1)).toBe('upcoming')
    expect(statusOf(2, -1)).toBe('upcoming')
  })
  it('renders all-completed for currentIndex >= length', () => {
    expect(statusOf(0, 4)).toBe('completed')
    expect(statusOf(3, 4)).toBe('completed')
  })
})

describe('<StageTimeline>', () => {
  it('renders one item per stage with stable data-stage-id', async () => {
    const m = await render({ stages: STAGES, currentIndex: 0 })
    expect(m.host.querySelectorAll('[data-stage-id]')).toHaveLength(4)
    expect(m.host.querySelector('[data-stage-id="applied"]')).not.toBeNull()
    expect(m.host.querySelector('[data-stage-id="offer"]')).not.toBeNull()
  })

  it('exposes data-stage-status reflecting completed/current/upcoming', async () => {
    const m = await render({ stages: STAGES, currentIndex: 2 })
    expect(
      m.host.querySelector('[data-stage-id="applied"]')?.getAttribute('data-stage-status'),
    ).toBe('completed')
    expect(
      m.host.querySelector('[data-stage-id="screen"]')?.getAttribute('data-stage-status'),
    ).toBe('completed')
    expect(
      m.host.querySelector('[data-stage-id="onsite"]')?.getAttribute('data-stage-status'),
    ).toBe('current')
    expect(m.host.querySelector('[data-stage-id="offer"]')?.getAttribute('data-stage-status')).toBe(
      'upcoming',
    )
  })

  it('marks the current stage with aria-current="step"', async () => {
    const m = await render({ stages: STAGES, currentIndex: 1 })
    const current = m.host.querySelector('[data-stage-id="screen"]')
    expect(current?.getAttribute('aria-current')).toBe('step')
    const not = m.host.querySelector('[data-stage-id="applied"]')
    expect(not?.hasAttribute('aria-current')).toBe(false)
  })

  it('shows a checkmark on completed stages and the index on others', async () => {
    const m = await render({ stages: STAGES, currentIndex: 2 })
    const dots = [...m.host.querySelectorAll('[data-mol-id="stage-timeline-dot"]')]
    expect(dots.filter((dot) => dot.textContent === '✓')).toHaveLength(2)
    expect(dots.map((dot) => dot.textContent)).toContain('3')
    expect(dots.map((dot) => dot.textContent)).toContain('4')
  })

  it('forwards click handlers on stages', async () => {
    const onClick = vi.fn()
    const stages = [...STAGES]
    stages[1] = { ...stages[1]!, onClick }
    const m = await render({ stages, currentIndex: 1 })
    const dot = m.host.querySelector(
      '[data-stage-id="screen"] [data-mol-id="stage-timeline-dot"]',
    ) as HTMLButtonElement
    dot.click()
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('disables stage dots that have no onClick', async () => {
    const m = await render({ stages: STAGES, currentIndex: 0 })
    const dot = m.host.querySelector(
      '[data-stage-id="applied"] [data-mol-id="stage-timeline-dot"]',
    ) as HTMLButtonElement
    expect(dot.disabled).toBe(true)
  })

  it('renders an empty list with no items when stages is empty', async () => {
    const m = await render({ stages: [], currentIndex: 0 })
    expect(m.host.querySelectorAll('[data-stage-id]')).toHaveLength(0)
  })

  it('renders a connector rail with a fill-width proportional to currentIndex', async () => {
    const m = await render({ stages: STAGES, currentIndex: 2 })
    const fill = m.host.querySelector('[data-mol-id="stage-timeline-rail-fill"]') as HTMLElement
    // 2 / (4-1) = 0.6667 → 66.67%
    expect(fill.style.width.startsWith('66.6')).toBe(true)
  })

  it('clamps the fill bar at 100% when currentIndex exceeds the stage count', async () => {
    const m = await render({ stages: STAGES, currentIndex: 99 })
    const fill = m.host.querySelector('[data-mol-id="stage-timeline-rail-fill"]') as HTMLElement
    expect(fill.style.width).toBe('100%')
  })

  it('forwards dataMolId for agent automation', async () => {
    const m = await render({ dataMolId: 'hire-flow', stages: STAGES, currentIndex: 0 })
    expect(rootEl(m.host).getAttribute('data-mol-id')).toBe('hire-flow')
  })

  it('exposes role="list" + role="listitem" for accessibility', async () => {
    const m = await render({ stages: STAGES, currentIndex: 0 })
    expect(rootEl(m.host).getAttribute('role')).toBe('list')
    expect(m.host.querySelectorAll('[role="listitem"]')).toHaveLength(STAGES.length)
  })
})
