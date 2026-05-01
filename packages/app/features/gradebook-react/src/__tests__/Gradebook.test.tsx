// @vitest-environment jsdom

import { fireEvent, render } from '@testing-library/react'
import type { ReactNode } from 'react'
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createSimpleI18nProvider } from '@molecule/app-i18n'
import { I18nProvider } from '@molecule/app-react'
import { setClassMap, type UIClassMap } from '@molecule/app-ui'

import { GpaCard } from '../GpaCard.js'
import { Gradebook } from '../Gradebook.js'
import type { Grade } from '../types.js'
import { computePercentage, defaultGpaMax, formatGpa } from '../utilities.js'

/**
 * Build a UIClassMap stub via Proxy: `cn(...)` joins truthy strings, every
 * other property/method access returns its key as a string token.
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
      const fn = (..._args: unknown[]) => token
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
 * Wrap children in `I18nProvider` so `useTranslation()` works.
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
    const { getByRole } = render(
      <Wrap>
        <Gradebook grades={baseGrades} gpaScale="4.0" />
      </Wrap>,
    )
    const region = getByRole('region')
    expect(region.getAttribute('aria-label')).toBe('Gradebook')
    expect(region.getAttribute('data-mol-id')).toBe('gradebook')
  })

  it('renders one row per grade with title, letter, and weight', () => {
    const { container } = render(
      <Wrap>
        <Gradebook grades={baseGrades} gpaScale="4.0" />
      </Wrap>,
    )
    const rows = container.querySelectorAll('[data-mol-id="gradebook-row"]')
    expect(rows.length).toBe(2)
    expect(rows[0].getAttribute('data-row-id')).toBe('g1')
    expect(rows[0].querySelector('[data-mol-id="gradebook-cell-title"]')?.textContent).toBe(
      'Calculus I',
    )
    expect(rows[0].querySelector('[data-mol-id="gradebook-cell-letter"]')?.textContent).toBe('A-')
    expect(rows[0].querySelector('[data-mol-id="gradebook-cell-weight"]')?.textContent).toBe('25%')
  })

  it('renders score / maxPoints in the numeric column for non-percentage scales', () => {
    const { container } = render(
      <Wrap>
        <Gradebook grades={baseGrades} gpaScale="4.0" />
      </Wrap>,
    )
    const rows = container.querySelectorAll('[data-mol-id="gradebook-row"]')
    expect(rows[0].querySelector('[data-mol-id="gradebook-cell-numeric"]')?.textContent).toBe(
      '92 / 100',
    )
    expect(rows[1].querySelector('[data-mol-id="gradebook-cell-numeric"]')?.textContent).toBe(
      '41 / 50',
    )
  })

  it('renders rounded percentages when gpaScale is percentage', () => {
    const { container } = render(
      <Wrap>
        <Gradebook grades={baseGrades} gpaScale="percentage" />
      </Wrap>,
    )
    const rows = container.querySelectorAll('[data-mol-id="gradebook-row"]')
    expect(rows[0].querySelector('[data-mol-id="gradebook-cell-numeric"]')?.textContent).toBe('92%')
    expect(rows[1].querySelector('[data-mol-id="gradebook-cell-numeric"]')?.textContent).toBe('82%')
  })

  it('renders contribution column using formatGpa for the active scale', () => {
    const { container } = render(
      <Wrap>
        <Gradebook grades={baseGrades} gpaScale="4.0" />
      </Wrap>,
    )
    const rows = container.querySelectorAll('[data-mol-id="gradebook-row"]')
    expect(rows[0].querySelector('[data-mol-id="gradebook-cell-contribution"]')?.textContent).toBe(
      '0.93',
    )
  })

  it('renders em-dash placeholders for missing optional fields', () => {
    const { container } = render(
      <Wrap>
        <Gradebook
          grades={[{ id: 'g3', title: 'Quiz', score: 50, maxPoints: 60 }]}
          gpaScale="4.0"
        />
      </Wrap>,
    )
    expect(container.querySelector('[data-mol-id="gradebook-cell-letter"]')?.textContent).toBe('—')
    expect(container.querySelector('[data-mol-id="gradebook-cell-weight"]')?.textContent).toBe('—')
    expect(
      container.querySelector('[data-mol-id="gradebook-cell-contribution"]')?.textContent,
    ).toBe('—')
  })

  it('renders an empty state when grades is empty', () => {
    const { container } = render(
      <Wrap>
        <Gradebook grades={[]} gpaScale="4.0" />
      </Wrap>,
    )
    expect(container.querySelector('[data-mol-id="gradebook-empty"]')).not.toBeNull()
    expect(container.querySelector('[data-mol-id="gradebook-table"]')).toBeNull()
  })

  it('fires onCellClick with the grade and column id when a cell is clicked', () => {
    const onCellClick = vi.fn()
    const { container } = render(
      <Wrap>
        <Gradebook grades={baseGrades} gpaScale="4.0" onCellClick={onCellClick} />
      </Wrap>,
    )
    fireEvent.click(container.querySelector('[data-mol-id="gradebook-cell-title"]')!)
    expect(onCellClick).toHaveBeenCalledTimes(1)
    expect(onCellClick.mock.calls[0][0].id).toBe('g1')
    expect(onCellClick.mock.calls[0][1]).toBe('title')

    fireEvent.click(
      container.querySelectorAll('[data-mol-id="gradebook-cell-numeric"]')[1] as Element,
    )
    expect(onCellClick).toHaveBeenCalledTimes(2)
    expect(onCellClick.mock.calls[1][0].id).toBe('g2')
    expect(onCellClick.mock.calls[1][1]).toBe('numeric')
  })
})

describe('<GpaCard>', () => {
  it('renders the formatted GPA value and the default ceiling for the scale', () => {
    const { container } = render(
      <Wrap>
        <GpaCard gpa={3.72} scale="4.0" />
      </Wrap>,
    )
    expect(container.querySelector('[data-mol-id="gpa-card-value"]')?.textContent).toBe('3.72')
    expect(container.querySelector('[data-mol-id="gpa-card-out-of"]')?.textContent).toBe(
      'out of 4.00',
    )
  })

  it('honours an explicit max prop', () => {
    const { container } = render(
      <Wrap>
        <GpaCard gpa={4.5} scale="5.0" max={5} />
      </Wrap>,
    )
    expect(container.querySelector('[data-mol-id="gpa-card-out-of"]')?.textContent).toBe(
      'out of 5.00',
    )
  })

  it('renders percentages without decimals', () => {
    const { container } = render(
      <Wrap>
        <GpaCard gpa={87} scale="percentage" />
      </Wrap>,
    )
    expect(container.querySelector('[data-mol-id="gpa-card-value"]')?.textContent).toBe('87%')
    expect(container.querySelector('[data-mol-id="gpa-card-out-of"]')?.textContent).toBe(
      'out of 100%',
    )
  })

  it('renders trend chip when trend is set', () => {
    const { container, rerender } = render(
      <Wrap>
        <GpaCard gpa={3.5} scale="4.0" trend="up" />
      </Wrap>,
    )
    let chip = container.querySelector('[data-mol-id="gpa-card-trend"]')
    expect(chip).not.toBeNull()
    expect(chip?.getAttribute('data-trend')).toBe('up')
    expect(container.querySelector('[data-mol-id="gpa-card-trend-text"]')?.textContent).toBe(
      'Trending up',
    )

    rerender(
      <Wrap>
        <GpaCard gpa={3.5} scale="4.0" trend="down" />
      </Wrap>,
    )
    chip = container.querySelector('[data-mol-id="gpa-card-trend"]')
    expect(chip?.getAttribute('data-trend')).toBe('down')
    expect(container.querySelector('[data-mol-id="gpa-card-trend-text"]')?.textContent).toBe(
      'Trending down',
    )
  })

  it('omits trend chip when trend is not set', () => {
    const { container } = render(
      <Wrap>
        <GpaCard gpa={3.5} scale="4.0" />
      </Wrap>,
    )
    expect(container.querySelector('[data-mol-id="gpa-card-trend"]')).toBeNull()
  })

  it('renders trendLabel beside the trend chip when provided', () => {
    const { container } = render(
      <Wrap>
        <GpaCard gpa={3.5} scale="4.0" trend="flat" trendLabel="vs last semester" />
      </Wrap>,
    )
    expect(container.querySelector('[data-mol-id="gpa-card-trend-label"]')?.textContent).toBe(
      'vs last semester',
    )
  })
})
