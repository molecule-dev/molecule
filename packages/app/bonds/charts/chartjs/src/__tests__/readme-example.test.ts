/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written.
 *
 * @module
 */
import { describe, expect, it, vi } from 'vitest'

// The outside world: Chart.js draws to a real canvas, which the node test env
// lacks — mocked the same way provider.test.ts does (a spy-backed `Chart`).
const hoisted = vi.hoisted(() => {
  const created: Array<{
    type: string
    data: { labels: unknown[]; datasets: Array<{ label?: string; data: unknown[] }> }
    update: ReturnType<typeof vi.fn>
    destroy: ReturnType<typeof vi.fn>
  }> = []
  class MockChart {
    static register = vi.fn()
    type: string
    data: { labels: unknown[]; datasets: Array<{ label?: string; data: unknown[] }> }
    options: unknown
    update = vi.fn()
    destroy = vi.fn()
    constructor(_canvas: unknown, config: { type: string; data: never; options: never }) {
      this.type = config.type
      this.data = config.data
      this.options = config.options
      created.push(this)
    }
  }
  return { MockChart, created }
})

vi.mock('chart.js', () => ({ Chart: hoisted.MockChart, registerables: ['controllers'] }))

// Minimal DOM: `document.createElement('canvas')` + `HTMLCanvasElement`.
class FakeCanvas {}
vi.stubGlobal('HTMLCanvasElement', FakeCanvas)
const appended: unknown[] = []
vi.stubGlobal('document', {
  createElement: () => new FakeCanvas(),
  body: { appendChild: (node: unknown) => appended.push(node) },
})

const { createLineChart, getColor, setProvider } = await import('@molecule/app-charts')
const { provider } = await import('../index.js')

describe('README @example', () => {
  it('bonds Chart.js and renders a real line chart through the core', () => {
    setProvider(provider)

    const canvas = document.createElement('canvas')
    document.body.appendChild(canvas)

    const chart = createLineChart(canvas, {
      labels: ['Jan', 'Feb', 'Mar'],
      datasets: [
        {
          label: 'Revenue',
          data: [12, 19, 8],
          borderColor: getColor(0),
        },
      ],
    })

    const drawn = hoisted.created[0]
    expect(drawn?.type).toBe('line')
    expect(drawn?.data.labels).toEqual(['Jan', 'Feb', 'Mar'])
    expect(drawn?.data.datasets[0]?.label).toBe('Revenue')

    chart.addData('Apr', [15])
    expect(drawn?.data.labels).toEqual(['Jan', 'Feb', 'Mar', 'Apr'])
    expect(drawn?.data.datasets[0]?.data).toEqual([12, 19, 8, 15])
    expect(drawn?.update).toHaveBeenCalledTimes(1)

    chart.destroy()
    expect(drawn?.destroy).toHaveBeenCalledTimes(1)
  })
})
