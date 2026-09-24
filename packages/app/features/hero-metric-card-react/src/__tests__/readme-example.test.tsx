// @vitest-environment jsdom
/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written. The ClassMap is bonded by `setup.ts`.
 *
 * @module
 */
import { cleanup, fireEvent, render } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router'
import { afterEach, describe, expect, it } from 'vitest'

import { HeroMetricCard, type HeroMetricTrend } from '../index.js'

/**
 * The README example, verbatim.
 *
 * @returns The revenue hero card.
 */
function RevenueHero(): React.JSX.Element {
  const navigate = useNavigate()
  const current = 84320
  const previous = 75020
  const change = ((current - previous) / previous) * 100
  const trend: HeroMetricTrend = {
    direction: change >= 0 ? 'up' : 'down',
    delta: `${change >= 0 ? '+' : ''}${change.toFixed(1)}%`,
  }
  return (
    <HeroMetricCard
      title="Total Revenue"
      value={current.toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
      })}
      unit="USD"
      trend={trend}
      subtitle="vs last month"
      accent="success"
      onClick={() => navigate('/revenue')}
      dataMolId="revenue-hero"
    />
  )
}

describe('README @example', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders the formatted value with an upward trend chip and navigates on click', () => {
    const view = render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<RevenueHero />} />
          <Route path="/revenue" element={<p>revenue page</p>} />
        </Routes>
      </MemoryRouter>,
    )
    expect(view.getByText('Total Revenue')).toBeTruthy()
    expect(view.getByText('$84,320')).toBeTruthy()
    expect(view.getByText('USD')).toBeTruthy()
    expect(view.getByText('+12.4%')).toBeTruthy()
    expect(view.getByRole('img', { name: 'Trending up' }).textContent).toBe('▲')
    expect(view.getByText('vs last month')).toBeTruthy()

    const card = view.container.querySelector('[data-mol-id="revenue-hero"]')
    expect(card).toBeTruthy()
    if (card) fireEvent.click(card)
    expect(view.getByText('revenue page')).toBeTruthy()
  })
})
