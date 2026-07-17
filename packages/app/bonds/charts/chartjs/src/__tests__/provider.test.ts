import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { ChartConfig } from '@molecule/app-charts'

// Mock Chart.js: capture the config passed to `new Chart(...)` and expose a
// spy-backed instance so we can assert the ChartConfig → Chart.js mapping and
// the ChartInstance delegation without a real canvas/DOM.
const hoisted = vi.hoisted(() => {
  const captured: { config?: { type: string; data: { labels?: unknown; datasets: unknown[] } } } =
    {}
  class MockChart {
    static register = vi.fn()
    data: { labels?: unknown[]; datasets: { data: unknown[] }[] }
    options: unknown
    update = vi.fn()
    resize = vi.fn()
    destroy = vi.fn()
    toBase64Image = vi.fn(() => 'data:image/png;base64,AAAA')
    show = vi.fn()
    hide = vi.fn()
    isDatasetVisible = vi.fn(() => true)
    constructor(_canvas: unknown, config: { type: string; data: never; options: never }) {
      this.data = config.data
      this.options = config.options
      captured.config = config
    }
  }
  return { MockChart, captured }
})

vi.mock('chart.js', () => ({ Chart: hoisted.MockChart, registerables: ['controllers'] }))

// The node test env has no DOM — provide HTMLCanvasElement so the provider's
// `container instanceof HTMLCanvasElement` fast-path works with a plain stub.
class FakeCanvas {}
;(globalThis as { HTMLCanvasElement?: unknown }).HTMLCanvasElement = FakeCanvas
const canvas = (): HTMLCanvasElement => new FakeCanvas() as unknown as HTMLCanvasElement

const { provider, createProvider } = await import('../provider.js')

const cfg = (type: ChartConfig['type']): ChartConfig => ({
  type,
  labels: ['a', 'b'],
  datasets: [{ label: 'Series', data: [1, 2] }],
})

describe('@molecule/app-charts-chartjs', () => {
  beforeEach(() => {
    hoisted.captured.config = undefined
  })

  it('reports its name and Chart.js-supported types', () => {
    expect(provider.getName()).toBe('chartjs')
    const types = provider.getSupportedTypes()
    expect(types).toEqual(
      expect.arrayContaining([
        'line',
        'bar',
        'pie',
        'doughnut',
        'area',
        'scatter',
        'radar',
        'polar',
      ]),
    )
    // Types Chart.js can't render natively must NOT be claimed as supported.
    expect(types).not.toContain('heatmap')
    expect(types).not.toContain('gauge')
  })

  it('maps a line chart config (labels + datasets) to Chart.js', () => {
    provider.createChart(canvas(), cfg('line'))
    expect(hoisted.captured.config?.type).toBe('line')
    expect(hoisted.captured.config?.data.labels).toEqual(['a', 'b'])
    const ds = hoisted.captured.config?.data.datasets[0] as { label: string; data: unknown }
    expect(ds.label).toBe('Series')
    expect(ds.data).toEqual([1, 2])
  })

  it('renders `area` as a line chart with fill enabled', () => {
    provider.createChart(canvas(), cfg('area'))
    expect(hoisted.captured.config?.type).toBe('line')
    expect((hoisted.captured.config?.data.datasets[0] as { fill: unknown }).fill).toBe(true)
  })

  it('renders `polar` as Chart.js `polarArea`', () => {
    provider.createChart(canvas(), cfg('polar'))
    expect(hoisted.captured.config?.type).toBe('polarArea')
  })

  it('throws an actionable error for a type Chart.js cannot render', () => {
    expect(() => provider.createChart(canvas(), cfg('heatmap'))).toThrow(/not supported/i)
  })

  it('registers Chart.js controllers (so scales/elements exist)', () => {
    provider.createChart(canvas(), cfg('bar'))
    expect(hoisted.MockChart.register).toHaveBeenCalled()
  })

  it('returns a ChartInstance that delegates to the live Chart.js instance', () => {
    const chart = provider.createChart(canvas(), cfg('bar'))
    const inst = chart.getInstance() as InstanceType<typeof hoisted.MockChart>

    chart.destroy()
    expect(inst.destroy).toHaveBeenCalled()

    chart.update({ labels: ['x'] })
    expect(inst.data.labels).toEqual(['x'])
    expect(inst.update).toHaveBeenCalled()

    chart.hideDataset(0)
    expect(inst.hide).toHaveBeenCalledWith(0)

    expect(chart.toBase64Image()).toContain('base64')
  })

  it('createProvider() yields an independent provider with the same contract', () => {
    const p = createProvider()
    expect(p.getName()).toBe('chartjs')
    expect(typeof p.createChart).toBe('function')
  })
})
