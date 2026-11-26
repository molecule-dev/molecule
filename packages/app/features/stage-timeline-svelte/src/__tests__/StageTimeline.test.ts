// @vitest-environment jsdom
/**
 * Unit tests for the Svelte `StageTimeline` — a port of
 * `@molecule/app-stage-timeline-react/src/__tests__/StageTimeline.test.tsx`:
 * the same test names and assertions, rendered with a real Svelte mount.
 *
 * @module
 */

import { flushSync, mount, unmount } from 'svelte'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@molecule/app-ui', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getClassMap: () => ({
    cn: (...args: unknown[]) => args.flat().filter(Boolean).join(' '),
    textSize: () => 'text',
    fontWeight: () => 'fw',
  }),
}))

vi.mock('@molecule/app-svelte', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
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

const { default: StageTimeline } = await import('../StageTimeline.svelte')
const { statusOf } = await import('../status.js')

import type { StageTimelineProps, StageTimelineStage } from '../types.js'

const STAGES: StageTimelineStage[] = [
  { id: 'applied', label: 'Applied' },
  { id: 'screen', label: 'Phone Screen' },
  { id: 'onsite', label: 'On-site' },
  { id: 'offer', label: 'Offer' },
]

const instances: ReturnType<typeof mount>[] = []

afterEach(() => {
  for (const instance of instances.splice(0)) void unmount(instance)
  document.body.innerHTML = ''
})

/**
 * Mounts a `StageTimeline` into a fresh container.
 *
 * @param props - The component props.
 * @returns The container holding the rendered DOM.
 */
function render(props: StageTimelineProps): HTMLElement {
  const container = document.createElement('div')
  document.body.appendChild(container)
  instances.push(mount(StageTimeline, { target: container, props }))
  flushSync()
  return container
}

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
  it('renders one item per stage with stable data-stage-id', () => {
    const container = render({ stages: STAGES, currentIndex: 0 })
    expect(container.querySelectorAll('[data-stage-id]')).toHaveLength(4)
    expect(container.querySelector('[data-stage-id="applied"]')).not.toBeNull()
    expect(container.querySelector('[data-stage-id="offer"]')).not.toBeNull()
  })

  it('exposes data-stage-status reflecting completed/current/upcoming', () => {
    const container = render({ stages: STAGES, currentIndex: 2 })
    expect(
      container.querySelector('[data-stage-id="applied"]')?.getAttribute('data-stage-status'),
    ).toBe('completed')
    expect(
      container.querySelector('[data-stage-id="screen"]')?.getAttribute('data-stage-status'),
    ).toBe('completed')
    expect(
      container.querySelector('[data-stage-id="onsite"]')?.getAttribute('data-stage-status'),
    ).toBe('current')
    expect(
      container.querySelector('[data-stage-id="offer"]')?.getAttribute('data-stage-status'),
    ).toBe('upcoming')
  })

  it('marks the current stage with aria-current="step"', () => {
    const container = render({ stages: STAGES, currentIndex: 1 })
    const current = container.querySelector('[data-stage-id="screen"]')
    expect(current?.getAttribute('aria-current')).toBe('step')
    const not = container.querySelector('[data-stage-id="applied"]')
    expect(not?.hasAttribute('aria-current')).toBe(false)
  })

  it('shows a checkmark on completed stages and the index on others', () => {
    const container = render({ stages: STAGES, currentIndex: 2 })
    const dots = [...container.querySelectorAll('[data-mol-id="stage-timeline-dot"]')]
    expect(dots.filter((dot) => dot.textContent === '✓')).toHaveLength(2)
    expect(dots.map((dot) => dot.textContent)).toContain('3')
    expect(dots.map((dot) => dot.textContent)).toContain('4')
  })

  it('forwards click handlers on stages', () => {
    const onClick = vi.fn()
    const stages = [...STAGES]
    stages[1] = { ...stages[1]!, onClick }
    const container = render({ stages, currentIndex: 1 })
    const dot = container.querySelector(
      '[data-stage-id="screen"] [data-mol-id="stage-timeline-dot"]',
    ) as HTMLButtonElement
    dot.click()
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('disables stage dots that have no onClick', () => {
    const container = render({ stages: STAGES, currentIndex: 0 })
    const dot = container.querySelector(
      '[data-stage-id="applied"] [data-mol-id="stage-timeline-dot"]',
    ) as HTMLButtonElement
    expect(dot.disabled).toBe(true)
  })

  it('renders an empty list with no items when stages is empty', () => {
    const container = render({ stages: [], currentIndex: 0 })
    expect(container.querySelectorAll('[data-stage-id]')).toHaveLength(0)
  })

  it('renders a connector rail with a fill-width proportional to currentIndex', () => {
    const container = render({ stages: STAGES, currentIndex: 2 })
    const fill = container.querySelector('[data-mol-id="stage-timeline-rail-fill"]') as HTMLElement
    // 2 / (4-1) = 0.6667 → 66.67%
    expect(fill.style.width.startsWith('66.6')).toBe(true)
  })

  it('clamps the fill bar at 100% when currentIndex exceeds the stage count', () => {
    const container = render({ stages: STAGES, currentIndex: 99 })
    const fill = container.querySelector('[data-mol-id="stage-timeline-rail-fill"]') as HTMLElement
    expect(fill.style.width).toBe('100%')
  })

  it('forwards dataMolId for agent automation', () => {
    const container = render({ dataMolId: 'hire-flow', stages: STAGES, currentIndex: 0 })
    expect(container.querySelector('[data-mol-id="hire-flow"]')).not.toBeNull()
  })

  it('exposes role="list" + role="listitem" for accessibility', () => {
    const container = render({ stages: STAGES, currentIndex: 0 })
    expect(container.querySelector('[role="list"]')).not.toBeNull()
    expect(container.querySelectorAll('[role="listitem"]')).toHaveLength(STAGES.length)
  })
})
