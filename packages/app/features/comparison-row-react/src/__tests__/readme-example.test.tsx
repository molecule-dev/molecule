/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written.
 *
 * @module
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeAll, describe, expect, it } from 'vitest'

import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { ComparisonRow } from '../index.js'

/**
 * The README example, verbatim.
 *
 * @returns The rendered revenue comparison row.
 */
function RevenueSummary(): React.JSX.Element {
  const report = {
    metric: 'Revenue',
    period: 'vs. last month',
    currentCents: 2480000,
    previousCents: 2130000,
  }
  const money = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  })
  const deltaPct = ((report.currentCents - report.previousCents) / report.previousCents) * 100
  return (
    <ComparisonRow
      label={report.metric}
      current={money.format(report.currentCents / 100)}
      previous={money.format(report.previousCents / 100)}
      deltaPct={deltaPct}
      periodLabel={report.period}
    />
  )
}

describe('README @example', () => {
  beforeAll(() => {
    setClassMap(classMap)
  })

  it('renders label, period, formatted values and a green up-delta chip', () => {
    const html = renderToStaticMarkup(<RevenueSummary />)
    expect(html).toContain('>Revenue</span>')
    expect(html).toContain('>vs. last month</span>')
    expect(html).toContain('>$24,800</span>')
    expect(html).toMatch(/text-decoration:line-through[^>]*>\$21,300<\/span>/)
    expect(html).toMatch(/color:#22c55e[^>]*>▲ 16.4%<\/span>/)
  })
})
