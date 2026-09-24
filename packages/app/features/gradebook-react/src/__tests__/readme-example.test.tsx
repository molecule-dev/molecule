// @vitest-environment jsdom
/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written.
 *
 * @module
 */
import { cleanup, render } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'

import { createSimpleI18nProvider } from '@molecule/app-i18n'
import { I18nProvider } from '@molecule/app-react'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { GpaCard, type Grade, Gradebook } from '../index.js'

const courses = [
  { id: 'alg', title: 'Algebra II', letter: 'A-', score: 92, credits: 4, postedAt: 'Dec 12' },
  { id: 'bio', title: 'Biology', letter: 'B+', score: 88, credits: 3, postedAt: 'Dec 14' },
  { id: 'art', title: 'Studio Art', letter: 'A', score: 97, credits: 2, postedAt: 'Dec 15' },
]
const points: Record<string, number> = { A: 4, 'A-': 3.7, 'B+': 3.3 }
const totalCredits = courses.reduce((sum, c) => sum + c.credits, 0)

// The components compute NOTHING: weight, contribution and the GPA are yours.
const grades: Grade[] = courses.map((c) => ({
  ...c,
  weight: c.credits / totalCredits,
  contribution: (points[c.letter] ?? 0) * (c.credits / totalCredits),
}))
const gpa = grades.reduce((sum, g) => sum + (g.contribution ?? 0), 0)

/**
 * The README example, verbatim.
 *
 * @returns The rendered grades page.
 */
function GradesPage(): React.JSX.Element {
  return (
    <>
      <GpaCard gpa={gpa} scale="4.0" trend="up" trendLabel="vs. last semester" />
      <Gradebook gpaScale="4.0" grades={grades} />
    </>
  )
}

describe('README @example', () => {
  beforeAll(() => {
    setClassMap(classMap)
  })
  afterEach(() => {
    cleanup()
  })

  it('shows the credit-weighted GPA and one row per course', () => {
    const view = render(
      <I18nProvider provider={createSimpleI18nProvider('en')}>
        <GradesPage />
      </I18nProvider>,
    )
    const q = (id: string): string =>
      view.container.querySelector(`[data-mol-id="${id}"]`)?.textContent ?? ''
    expect(q('gpa-card-value')).toBe('3.63')
    expect(q('gpa-card-out-of')).toBe('out of 4.00')
    expect(q('gpa-card-trend-text')).toBe('Trending up')
    expect(q('gpa-card-trend-label')).toBe('vs. last semester')

    const rows = Array.from(view.container.querySelectorAll('[data-mol-id="gradebook-row"]')).map(
      (row) => Array.from(row.querySelectorAll('td')).map((td) => td.textContent),
    )
    expect(rows).toEqual([
      ['Algebra II', 'A-', '92', '44%', '1.64', 'Dec 12'],
      ['Biology', 'B+', '88', '33%', '1.10', 'Dec 14'],
      ['Studio Art', 'A', '97', '22%', '0.89', 'Dec 15'],
    ])
    expect(view.getByRole('region', { name: 'Gradebook' })).toBeTruthy()
  })
})
