// @vitest-environment jsdom
/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written.
 *
 * @module
 */
import { cleanup, fireEvent, render } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'

import { createSimpleI18nProvider } from '@molecule/app-i18n'
import { I18nProvider } from '@molecule/app-react'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { Heatmap, type HeatmapCell, type HeatmapDay } from '../index.js'

/**
 * The README example, verbatim.
 *
 * @returns The rendered heatmap plus the picked-cell readout.
 */
function ActivityHeatmap(): React.JSX.Element {
  const [picked, setPicked] = useState<HeatmapCell | null>(null)
  const data: HeatmapDay[] = [
    { date: '2025-01-15', value: 3 },
    { date: '2025-02-04', value: 8 },
    { date: '2025-03-21', value: 1 },
  ]
  return (
    <>
      <Heatmap
        data={data}
        range={{ start: new Date(2025, 0, 1), end: new Date(2025, 11, 31) }}
        showWeekdayLabels
        onCellClick={setPicked}
      />
      {picked && <output>{`${picked.date}: ${picked.value}`}</output>}
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

  it('renders a full-year grid, buckets the values and reports the clicked cell', () => {
    const view = render(
      <I18nProvider provider={createSimpleI18nProvider('en')}>
        <ActivityHeatmap />
      </I18nProvider>,
    )
    const cells = view.container.querySelectorAll('rect')
    expect(cells).toHaveLength(365)
    expect(view.getByRole('img', { name: 'Activity heatmap' })).toBeTruthy()
    expect(view.getByText('Jan')).toBeTruthy()
    expect(view.getByText('Mon')).toBeTruthy()

    const busy = view.container.querySelector('[data-mol-id="heatmap-cell-2025-02-04"]')
    const empty = view.container.querySelector('[data-mol-id="heatmap-cell-2025-06-01"]')
    expect(busy?.getAttribute('data-bucket')).toBe('4')
    expect(empty?.getAttribute('data-bucket')).toBe('0')
    expect(view.container.querySelector('output')).toBeNull()

    if (busy) fireEvent.click(busy)
    expect(view.container.querySelector('output')?.textContent).toBe('2025-02-04: 8')
  })
})
