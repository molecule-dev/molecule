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

import { KpiCard, KpiCardGrid, KpiCardTrend } from '../index.js'

/**
 * The README example, verbatim.
 *
 * @returns The rendered KPI grid.
 */
function DashboardKpis(): React.JSX.Element {
  const metrics = [
    { id: 'revenue', title: 'Monthly Revenue', value: 48200, previous: 42900, format: 'currency' },
    { id: 'orders', title: 'Orders', value: 1284, previous: 1310, format: 'number' },
    { id: 'customers', title: 'New Customers', value: 312, previous: 312, format: 'number' },
  ] as const
  const usd = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  })
  const num = new Intl.NumberFormat('en-US')
  return (
    <KpiCardGrid columns={3}>
      {metrics.map((m) => (
        <KpiCard
          key={m.id}
          title={m.title}
          value={m.format === 'currency' ? usd.format(m.value) : num.format(m.value)}
          trend={
            <KpiCardTrend delta={Math.round(((m.value - m.previous) / m.previous) * 1000) / 10} />
          }
          subtitle="vs. last month"
          accentSide="top"
          upperLabel
          dataMolId={`kpi-${m.id}`}
        />
      ))}
    </KpiCardGrid>
  )
}

describe('README @example', () => {
  beforeAll(() => {
    setClassMap(classMap)
  })

  it('renders one card per metric with formatted values and trend deltas', () => {
    const html = renderToStaticMarkup(<DashboardKpis />)
    expect(html.match(/data-mol-id="kpi-/g)).toHaveLength(3)
    expect(html).toContain('Monthly Revenue')
    expect(html).toContain('$48,200')
    expect(html).toContain('1,284')
    // revenue up 12.4%, orders down 2%, customers flat
    const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')
    expect(text).toContain('▲ 12.4%')
    expect(text).toContain('▼ 2%')
    expect(text).toContain('– 0%')
    expect(html.match(/vs\. last month/g)).toHaveLength(3)
  })
})
