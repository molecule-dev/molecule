/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written.
 *
 * @module
 */
import { cleanup, render } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'

import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { computeNps, NpsDistribution } from '../index.js'

/**
 * The README example, verbatim.
 *
 * @returns The rendered survey results.
 */
function SurveyResults(): React.JSX.Element {
  const responses = [
    { id: 'r1', score: 10 },
    { id: 'r2', score: 9 },
    { id: 'r3', score: 9 },
    { id: 'r4', score: 7 },
    { id: 'r5', score: 6 },
    { id: 'r6', score: 0 },
    { id: 'r7', score: 8 },
    { id: 'r8', score: 10 },
  ]
  const scores = responses.map((r) => r.score)
  const nps = computeNps(scores) // 4 promoters, 2 passives, 2 detractors → score 25
  return (
    <section>
      <h2>{`Promoters: ${nps.promoters} · Passives: ${nps.passives} · Detractors: ${nps.detractors}`}</h2>
      <NpsDistribution scores={scores} dataMolId="survey-nps-chart" />
    </section>
  )
}

describe('README @example', () => {
  beforeAll(() => {
    setClassMap(classMap)
  })
  afterEach(() => {
    cleanup()
  })

  it('renders the tier summary, 11 score rows and the computed NPS of 25', () => {
    const view = render(<SurveyResults />)
    expect(view.getByText('Promoters: 4 · Passives: 2 · Detractors: 2')).toBeTruthy()
    const chart = view.container.querySelector('[data-mol-id="survey-nps-chart"]')
    expect(chart?.getAttribute('aria-label')).toBe('NPS distribution chart, 8 responses')
    expect(view.getByLabelText('Score 10 (Promoter): 2')).toBeTruthy()
    expect(view.getByLabelText('Score 9 (Promoter): 2')).toBeTruthy()
    expect(view.getByLabelText('Score 6 (Detractor): 1')).toBeTruthy()
    expect(view.getByLabelText('Score 7 (Passive): 1')).toBeTruthy()
    expect(view.getByLabelText('Score 3 (Detractor): 0')).toBeTruthy()
    expect(view.container.querySelector('[data-nps-score-value]')?.textContent).toBe('25')
  })
})
