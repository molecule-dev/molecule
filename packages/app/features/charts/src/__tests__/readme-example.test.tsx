/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written: the core routes the call through the
 * real `@molecule/app-charts-chartjs` provider. Only Chart.js itself (which
 * needs a real canvas 2D context the test DOM lacks) is replaced by a spy.
 *
 * @module
 */
import { act, type JSX, useEffect, useRef } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, expect, it, vi } from 'vitest'

const hoisted = vi.hoisted(() => {
  const created: Array<{
    canvas: unknown
    type: string
    data: { labels: unknown[]; datasets: Array<{ label?: string; data: unknown[] }> }
    destroy: ReturnType<typeof vi.fn>
  }> = []
  /** Spy stand-in for Chart.js's `Chart`. */
  class MockChart {
    static register = vi.fn()
    canvas: unknown
    type: string
    data: { labels: unknown[]; datasets: Array<{ label?: string; data: unknown[] }> }
    update = vi.fn()
    destroy = vi.fn()
    /**
     * Records what the provider asked Chart.js to draw.
     *
     * @param canvas - Target canvas.
     * @param config - Chart.js configuration.
     * @param config.type - Chart.js chart type.
     * @param config.data - Chart.js data.
     */
    constructor(canvas: unknown, config: { type: string; data: never }) {
      this.canvas = canvas
      this.type = config.type
      this.data = config.data
      created.push(this)
    }
  }
  return { MockChart, created }
})

vi.mock('chart.js', () => ({ Chart: hoisted.MockChart, registerables: ['controllers'] }))

const { createLineChart, getColor, setProvider } = await import('../index.js')
const { provider } = await import('@molecule/app-charts-chartjs')

setProvider(provider)

const revenue = { labels: ['Jan', 'Feb', 'Mar', 'Apr'], values: [4200, 5800, 5100, 7300] }

/**
 * The README example, verbatim.
 *
 * @returns The chart canvas.
 */
function RevenueChart(): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    if (!canvasRef.current) return
    const chart = createLineChart(canvasRef.current, {
      labels: revenue.labels,
      datasets: [{ label: 'Revenue', data: revenue.values, borderColor: getColor(0) }],
    })
    return () => chart.destroy()
  }, [])
  return <canvas ref={canvasRef} width={600} height={300} />
}

describe('README @example', () => {
  it('draws a Chart.js line chart on the mounted canvas and destroys it on unmount', async () => {
    ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)
    await act(async () => {
      root.render(<RevenueChart />)
    })

    expect(hoisted.created).toHaveLength(1)
    const drawn = hoisted.created[0]
    expect(drawn?.canvas).toBe(container.querySelector('canvas'))
    expect(drawn?.type).toBe('line')
    expect(drawn?.data.labels).toEqual(['Jan', 'Feb', 'Mar', 'Apr'])
    expect(drawn?.data.datasets[0]?.label).toBe('Revenue')
    expect(drawn?.data.datasets[0]?.data).toEqual([4200, 5800, 5100, 7300])

    await act(async () => root.unmount())
    expect(drawn?.destroy).toHaveBeenCalledTimes(1)
    container.remove()
  })
})
