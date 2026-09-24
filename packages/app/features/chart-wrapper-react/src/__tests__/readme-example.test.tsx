// @vitest-environment jsdom
/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written: real Tailwind ClassMap, the real
 * `@molecule/app-charts` core and `@molecule/app-charts-chartjs` provider.
 * Only Chart.js itself (it needs a real canvas 2D context the test DOM lacks)
 * is replaced by a spy.
 *
 * @module
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { type JSX, useEffect, useRef, useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { type ChartInstance, createBarChart, setProvider } from '@molecule/app-charts'
import { provider as chartjsProvider } from '@molecule/app-charts-chartjs'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { ChartCard, ChartLegend } from '../index.js'

const hoisted = vi.hoisted(() => {
  const created: Array<{
    type: string
    data: { labels: unknown[]; datasets: Array<{ label?: string; data: unknown[] }> }
    options: { plugins?: { legend?: { display?: boolean } } }
    visible: boolean[]
    destroy: ReturnType<typeof vi.fn>
  }> = []
  /** Spy stand-in for Chart.js's `Chart`. */
  class MockChart {
    static register = vi.fn()
    type: string
    data: { labels: unknown[]; datasets: Array<{ label?: string; data: unknown[] }> }
    options: { plugins?: { legend?: { display?: boolean } } }
    visible: boolean[]
    update = vi.fn()
    destroy = vi.fn()
    /**
     * Records what the provider asked Chart.js to draw.
     *
     * @param _canvas - Target canvas.
     * @param config - Chart.js configuration.
     * @param config.type - Chart.js chart type.
     * @param config.data - Chart.js data.
     * @param config.options - Chart.js options.
     */
    constructor(_canvas: unknown, config: { type: string; data: never; options: never }) {
      this.type = config.type
      this.data = config.data
      this.options = config.options
      this.visible = this.data.datasets.map(() => true)
      created.push(this)
    }
    /**
     * Whether a dataset is visible.
     *
     * @param i - Dataset index.
     * @returns Visibility.
     */
    isDatasetVisible(i: number): boolean {
      return this.visible[i] ?? false
    }
    /**
     * Hides a dataset.
     *
     * @param i - Dataset index.
     */
    hide(i: number): void {
      this.visible[i] = false
    }
    /**
     * Shows a dataset.
     *
     * @param i - Dataset index.
     */
    show(i: number): void {
      this.visible[i] = true
    }
  }
  return { MockChart, created }
})

vi.mock('chart.js', () => ({ Chart: hoisted.MockChart, registerables: ['controllers'] }))

setClassMap(classMap)
setProvider(chartjsProvider)

const months = ['Jan', 'Feb', 'Mar']
const series = [
  { id: 'revenue', label: 'Revenue', color: '#4f46e5', data: [4200, 5800, 5100] },
  { id: 'expenses', label: 'Expenses', color: '#e11d48', data: [3100, 3400, 3900] },
]

/**
 * The README example, verbatim.
 *
 * @returns The chart card.
 */
function RevenueCard(): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const chartRef = useRef<ChartInstance | null>(null)
  const [hidden, setHidden] = useState<string[]>([])

  useEffect(() => {
    if (!canvasRef.current) return
    const chart = createBarChart(canvasRef.current, {
      labels: months,
      datasets: series.map((s) => ({ label: s.label, data: s.data, backgroundColor: s.color })),
      legend: { display: false },
    })
    chartRef.current = chart
    return () => chart.destroy()
  }, [])

  const toggle = (id: string): void => {
    chartRef.current?.toggleDataset(series.findIndex((s) => s.id === id))
    setHidden((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]))
  }

  return (
    <ChartCard
      title="Monthly revenue"
      description="Q1 2026"
      footer={
        <ChartLegend
          items={series.map((s) => ({
            id: s.id,
            label: s.label,
            color: s.color,
            hidden: hidden.includes(s.id),
          }))}
          onToggle={toggle}
        />
      }
    >
      <canvas ref={canvasRef} height={240} />
    </ChartCard>
  )
}

describe('README @example', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders the card chrome, draws the bar chart and toggles a series from the legend', () => {
    const { unmount } = render(<RevenueCard />)

    expect(screen.getByRole('heading', { name: 'Monthly revenue' })).toBeTruthy()
    expect(screen.getByText('Q1 2026')).toBeTruthy()

    expect(hoisted.created).toHaveLength(1)
    const drawn = hoisted.created[0]
    expect(drawn?.type).toBe('bar')
    expect(drawn?.data.labels).toEqual(months)
    expect(drawn?.data.datasets.map((d) => d.label)).toEqual(['Revenue', 'Expenses'])
    expect(drawn?.options.plugins?.legend?.display).toBe(false)

    const expenses = screen.getByRole('button', { name: 'Expenses' })
    expect(expenses.getAttribute('aria-pressed')).toBe('true')
    fireEvent.click(expenses)
    expect(drawn?.visible).toEqual([true, false])
    expect(screen.getByRole('button', { name: 'Expenses' }).getAttribute('aria-pressed')).toBe(
      'false',
    )

    unmount()
    expect(drawn?.destroy).toHaveBeenCalledTimes(1)
  })
})
