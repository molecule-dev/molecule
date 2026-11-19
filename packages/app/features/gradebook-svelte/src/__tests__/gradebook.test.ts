// @vitest-environment jsdom
/**
 * Unit tests for `GpaCard` / `Gradebook` — the port of
 * `@molecule/app-gradebook-react/src/__tests__/Gradebook.test.tsx`: the same
 * test names and the same behavioral assertions, rendered with a real Svelte
 * mount (jsdom) and asserted on the markup the components produce.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { createRawSnippet, flushSync, mount, type Snippet, unmount } from 'svelte'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setClassMap, type UIClassMap } from '@molecule/app-ui'

import GpaCard from '../GpaCard.svelte'
import Gradebook from '../Gradebook.svelte'
import type { GpaCardProps, Grade, GradebookProps } from '../types.js'
import { computePercentage, defaultGpaMax, formatGpa } from '../utilities.js'

/**
 * Build a UIClassMap stub via Proxy: `cn(...)` joins truthy strings, every
 * other property/method access returns its key as a string token.
 *
 * @returns A stub UIClassMap suitable for tests.
 */
function buildStubClassMap(): UIClassMap {
  const handler: ProxyHandler<UIClassMap> = {
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
  // The proxy target is empty on purpose: every property is supplied by the
  // get trap above, so the stub carries no state of its own.
  return new Proxy({} as UIClassMap, handler)
}

/** A snippet rendering the given markup, the way a caller fills a node prop. */
const raw = (html: string): Snippet => createRawSnippet(() => ({ render: () => html }))

const instances: ReturnType<typeof mount>[] = []

beforeEach(() => {
  setClassMap(buildStubClassMap())
  setProvider(createSimpleI18nProvider('en'))
})

afterEach(async () => {
  for (const instance of instances.splice(0)) await unmount(instance)
  document.body.innerHTML = ''
})

/**
 * Mounts a {@link Gradebook} into a fresh target and returns that target.
 *
 * @param props - The gradebook props.
 * @returns The element holding the component's DOM.
 */
function renderGradebook(props: GradebookProps): HTMLElement {
  const target = document.createElement('div')
  document.body.appendChild(target)
  instances.push(mount(Gradebook, { target, props }))
  flushSync()
  return target
}

/**
 * Mounts a {@link GpaCard} into a fresh target and returns that target.
 *
 * @param props - The GPA card props.
 * @returns The element holding the component's DOM.
 */
function renderGpaCard(props: GpaCardProps): HTMLElement {
  const target = document.createElement('div')
  document.body.appendChild(target)
  instances.push(mount(GpaCard, { target, props }))
  flushSync()
  return target
}

describe('utilities', () => {
  it('computePercentage normalizes score against maxPoints', () => {
    expect(computePercentage({ id: '1', title: 't', score: 80, maxPoints: 100 })).toBe(80)
    expect(computePercentage({ id: '1', title: 't', score: 45, maxPoints: 50 })).toBe(90)
  })

  it('computePercentage treats missing maxPoints as 100', () => {
    expect(computePercentage({ id: '1', title: 't', score: 73 })).toBe(73)
  })

  it('computePercentage clamps to [0, 100] and handles non-finite input', () => {
    expect(computePercentage({ id: '1', title: 't', score: 9999, maxPoints: 100 })).toBe(100)
    expect(computePercentage({ id: '1', title: 't', score: -5, maxPoints: 100 })).toBe(0)
    expect(computePercentage({ id: '1', title: 't', score: NaN, maxPoints: 100 })).toBe(0)
  })

  it('formatGpa renders 4.0 / 5.0 with two decimals and percentage with %', () => {
    expect(formatGpa(3.72, '4.0')).toBe('3.72')
    expect(formatGpa(4.5, '5.0')).toBe('4.50')
    expect(formatGpa(87, 'percentage')).toBe('87%')
    expect(formatGpa(NaN, '4.0')).toBe('0.00')
    expect(formatGpa(NaN, 'percentage')).toBe('0%')
  })

  it('defaultGpaMax returns the right ceiling per scale', () => {
    expect(defaultGpaMax('4.0')).toBe(4)
    expect(defaultGpaMax('5.0')).toBe(5)
    expect(defaultGpaMax('percentage')).toBe(100)
  })
})

const baseGrades: Grade[] = [
  {
    id: 'g1',
    title: 'Calculus I',
    letter: 'A-',
    score: 92,
    maxPoints: 100,
    weight: 0.25,
    contribution: 0.93,
    postedAt: '2026-04-01',
  },
  {
    id: 'g2',
    title: 'Physics II',
    letter: 'B+',
    score: 41,
    maxPoints: 50,
    weight: 0.25,
    contribution: 0.83,
  },
]

describe('<Gradebook>', () => {
  it('renders a region with the gradebook aria-label', () => {
    const host = renderGradebook({ grades: baseGrades, gpaScale: '4.0' })
    const region = host.querySelector('[role="region"]')
    expect(region?.getAttribute('aria-label')).toBe('Gradebook')
    expect(region?.getAttribute('data-mol-id')).toBe('gradebook')
  })

  it('renders one row per grade with title, letter, and weight', () => {
    const host = renderGradebook({ grades: baseGrades, gpaScale: '4.0' })
    const rows = host.querySelectorAll('[data-mol-id="gradebook-row"]')
    expect(rows.length).toBe(2)
    expect(rows[0].getAttribute('data-row-id')).toBe('g1')
    expect(rows[0].querySelector('[data-mol-id="gradebook-cell-title"]')?.textContent).toBe(
      'Calculus I',
    )
    expect(rows[0].querySelector('[data-mol-id="gradebook-cell-letter"]')?.textContent).toBe('A-')
    expect(rows[0].querySelector('[data-mol-id="gradebook-cell-weight"]')?.textContent).toBe('25%')
  })

  it('renders score / maxPoints in the numeric column for non-percentage scales', () => {
    const host = renderGradebook({ grades: baseGrades, gpaScale: '4.0' })
    const rows = host.querySelectorAll('[data-mol-id="gradebook-row"]')
    expect(rows[0].querySelector('[data-mol-id="gradebook-cell-numeric"]')?.textContent).toBe(
      '92 / 100',
    )
    expect(rows[1].querySelector('[data-mol-id="gradebook-cell-numeric"]')?.textContent).toBe(
      '41 / 50',
    )
  })

  it('renders rounded percentages when gpaScale is percentage', () => {
    const host = renderGradebook({ grades: baseGrades, gpaScale: 'percentage' })
    const rows = host.querySelectorAll('[data-mol-id="gradebook-row"]')
    expect(rows[0].querySelector('[data-mol-id="gradebook-cell-numeric"]')?.textContent).toBe('92%')
    expect(rows[1].querySelector('[data-mol-id="gradebook-cell-numeric"]')?.textContent).toBe('82%')
  })

  it('renders contribution column using formatGpa for the active scale', () => {
    const host = renderGradebook({ grades: baseGrades, gpaScale: '4.0' })
    const rows = host.querySelectorAll('[data-mol-id="gradebook-row"]')
    expect(rows[0].querySelector('[data-mol-id="gradebook-cell-contribution"]')?.textContent).toBe(
      '0.93',
    )
  })

  it('renders em-dash placeholders for missing optional fields', () => {
    const host = renderGradebook({
      grades: [{ id: 'g3', title: 'Quiz', score: 50, maxPoints: 60 }],
      gpaScale: '4.0',
    })
    expect(host.querySelector('[data-mol-id="gradebook-cell-letter"]')?.textContent).toBe('—')
    expect(host.querySelector('[data-mol-id="gradebook-cell-weight"]')?.textContent).toBe('—')
    expect(host.querySelector('[data-mol-id="gradebook-cell-contribution"]')?.textContent).toBe('—')
  })

  it('renders an empty state when grades is empty', () => {
    const host = renderGradebook({ grades: [], gpaScale: '4.0' })
    expect(host.querySelector('[data-mol-id="gradebook-empty"]')).not.toBeNull()
    expect(host.querySelector('[data-mol-id="gradebook-table"]')).toBeNull()
  })

  it('fires onCellClick with the grade and column id when a cell is clicked', () => {
    const onCellClick = vi.fn()
    const host = renderGradebook({ grades: baseGrades, gpaScale: '4.0', onCellClick })
    host
      .querySelector('[data-mol-id="gradebook-cell-title"]')
      ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(onCellClick).toHaveBeenCalledTimes(1)
    expect(onCellClick.mock.calls[0][0].id).toBe('g1')
    expect(onCellClick.mock.calls[0][1]).toBe('title')

    host
      .querySelectorAll('[data-mol-id="gradebook-cell-numeric"]')[1]
      ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(onCellClick).toHaveBeenCalledTimes(2)
    expect(onCellClick.mock.calls[1][0].id).toBe('g2')
    expect(onCellClick.mock.calls[1][1]).toBe('numeric')
  })
})

describe('<GpaCard>', () => {
  it('renders the formatted GPA value and the default ceiling for the scale', () => {
    const host = renderGpaCard({ gpa: 3.72, scale: '4.0' })
    expect(host.querySelector('[data-mol-id="gpa-card-value"]')?.textContent).toBe('3.72')
    expect(host.querySelector('[data-mol-id="gpa-card-out-of"]')?.textContent).toBe('out of 4.00')
  })

  it('honours an explicit max prop', () => {
    const host = renderGpaCard({ gpa: 4.5, scale: '5.0', max: 5 })
    expect(host.querySelector('[data-mol-id="gpa-card-out-of"]')?.textContent).toBe('out of 5.00')
  })

  it('renders percentages without decimals', () => {
    const host = renderGpaCard({ gpa: 87, scale: 'percentage' })
    expect(host.querySelector('[data-mol-id="gpa-card-value"]')?.textContent).toBe('87%')
    expect(host.querySelector('[data-mol-id="gpa-card-out-of"]')?.textContent).toBe('out of 100%')
  })

  it('renders trend chip when trend is set', () => {
    const up = renderGpaCard({ gpa: 3.5, scale: '4.0', trend: 'up' })
    let chip = up.querySelector('[data-mol-id="gpa-card-trend"]')
    expect(chip).not.toBeNull()
    expect(chip?.getAttribute('data-trend')).toBe('up')
    expect(up.querySelector('[data-mol-id="gpa-card-trend-text"]')?.textContent).toBe('Trending up')

    const down = renderGpaCard({ gpa: 3.5, scale: '4.0', trend: 'down' })
    chip = down.querySelector('[data-mol-id="gpa-card-trend"]')
    expect(chip?.getAttribute('data-trend')).toBe('down')
    expect(down.querySelector('[data-mol-id="gpa-card-trend-text"]')?.textContent).toBe(
      'Trending down',
    )
  })

  it('omits trend chip when trend is not set', () => {
    const host = renderGpaCard({ gpa: 3.5, scale: '4.0' })
    expect(host.querySelector('[data-mol-id="gpa-card-trend"]')).toBeNull()
  })

  it('renders trendLabel beside the trend chip when provided', () => {
    const host = renderGpaCard({
      gpa: 3.5,
      scale: '4.0',
      trend: 'flat',
      trendLabel: raw('<em>vs last semester</em>'),
    })
    expect(host.querySelector('[data-mol-id="gpa-card-trend-label"]')?.textContent).toBe(
      'vs last semester',
    )
  })
})
