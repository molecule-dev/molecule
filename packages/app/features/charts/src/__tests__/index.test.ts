// @vitest-environment happy-dom
/**
 * Comprehensive tests for `@molecule/app-charts` module.
 *
 * Tests all exported functions, types, and the ChartProvider interface.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  type AnimationConfig,
  type AxisConfig,
  type ChartConfig,
  type ChartInstance,
  type ChartProvider,
  // Type exports (compile-time check)
  type ChartType,
  // Utilities
  colorPalettes,
  createAreaChart,
  createBarChart,
  createChart,
  createDoughnutChart,
  createLineChart,
  createPieChart,
  createRadarChart,
  createScatterChart,
  // Chart
  createSimpleChartProvider,
  type DataPoint,
  type Dataset,
  type FontConfig,
  generateColors,
  getColor,
  getProvider,
  type LegendConfig,
  // Provider management
  setProvider,
  type TooltipConfig,
} from '../index.js'

/**
 * Creates a mock 2D rendering context with all required methods.
 */
const createMockContext2D = (): Record<
  string,
  ReturnType<typeof vi.fn> | string | number | HTMLCanvasElement
> => ({
  clearRect: vi.fn(),
  fillRect: vi.fn(),
  fillText: vi.fn(),
  strokeRect: vi.fn(),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  stroke: vi.fn(),
  arc: vi.fn(),
  fill: vi.fn(),
  closePath: vi.fn(),
  save: vi.fn(),
  restore: vi.fn(),
  translate: vi.fn(),
  rotate: vi.fn(),
  scale: vi.fn(),
  setTransform: vi.fn(),
  resetTransform: vi.fn(),
  measureText: vi.fn(() => ({ width: 50 })),
  createLinearGradient: vi.fn(() => ({
    addColorStop: vi.fn(),
  })),
  createRadialGradient: vi.fn(() => ({
    addColorStop: vi.fn(),
  })),
  fillStyle: '',
  strokeStyle: '',
  lineWidth: 1,
  font: '14px sans-serif',
  textAlign: 'left' as CanvasTextAlign,
  textBaseline: 'top' as CanvasTextBaseline,
  globalAlpha: 1,
  globalCompositeOperation: 'source-over' as GlobalCompositeOperation,
  canvas: {} as HTMLCanvasElement,
})

/**
 * Creates a real canvas element with mocked 2D context methods.
 * Uses the DOM environment (happy-dom) to create actual HTMLCanvasElement instances.
 */
const createMockCanvas = (): HTMLCanvasElement => {
  const canvas = document.createElement('canvas')
  canvas.width = 800
  canvas.height = 600

  // Create mock context
  const mockContext = createMockContext2D()
  mockContext.canvas = canvas

  // Override getContext to return our mock
  const originalGetContext = canvas.getContext.bind(canvas)
  canvas.getContext = vi.fn((contextId: string) => {
    if (contextId === '2d') {
      return mockContext as unknown as CanvasRenderingContext2D
    }
    return originalGetContext(contextId)
  }) as typeof canvas.getContext

  // Mock toDataURL to return consistent test data
  canvas.toDataURL = vi.fn(() => 'data:image/png;base64,mockdata')

  return canvas
}

describe('@molecule/app-charts', () => {
  describe('Module Exports', () => {
    describe('Provider Management Functions', () => {
      it('should export setProvider function', () => {
        expect(typeof setProvider).toBe('function')
      })

      it('should export getProvider function', () => {
        expect(typeof getProvider).toBe('function')
      })

      it('should export createChart function', () => {
        expect(typeof createChart).toBe('function')
      })

      it('should export createLineChart function', () => {
        expect(typeof createLineChart).toBe('function')
      })

      it('should export createBarChart function', () => {
        expect(typeof createBarChart).toBe('function')
      })

      it('should export createPieChart function', () => {
        expect(typeof createPieChart).toBe('function')
      })

      it('should export createDoughnutChart function', () => {
        expect(typeof createDoughnutChart).toBe('function')
      })

      it('should export createAreaChart function', () => {
        expect(typeof createAreaChart).toBe('function')
      })

      it('should export createScatterChart function', () => {
        expect(typeof createScatterChart).toBe('function')
      })

      it('should export createRadarChart function', () => {
        expect(typeof createRadarChart).toBe('function')
      })
    })

    describe('Utility Functions', () => {
      it('should export colorPalettes object', () => {
        expect(typeof colorPalettes).toBe('object')
        expect(colorPalettes).toBeDefined()
      })

      it('should export getColor function', () => {
        expect(typeof getColor).toBe('function')
      })

      it('should export generateColors function', () => {
        expect(typeof generateColors).toBe('function')
      })
    })

    describe('Chart Provider Functions', () => {
      it('should export createSimpleChartProvider function', () => {
        expect(typeof createSimpleChartProvider).toBe('function')
      })
    })
  })

  describe('Color Utilities', () => {
    describe('colorPalettes', () => {
      it('should contain default palette', () => {
        expect(colorPalettes.default).toBeDefined()
        expect(Array.isArray(colorPalettes.default)).toBe(true)
        expect(colorPalettes.default.length).toBeGreaterThan(0)
      })

      it('should contain pastel palette', () => {
        expect(colorPalettes.pastel).toBeDefined()
        expect(Array.isArray(colorPalettes.pastel)).toBe(true)
        expect(colorPalettes.pastel.length).toBeGreaterThan(0)
      })

      it('should contain vivid palette', () => {
        expect(colorPalettes.vivid).toBeDefined()
        expect(Array.isArray(colorPalettes.vivid)).toBe(true)
        expect(colorPalettes.vivid.length).toBeGreaterThan(0)
      })

      it('should contain cool palette', () => {
        expect(colorPalettes.cool).toBeDefined()
        expect(Array.isArray(colorPalettes.cool)).toBe(true)
        expect(colorPalettes.cool.length).toBeGreaterThan(0)
      })

      it('should contain warm palette', () => {
        expect(colorPalettes.warm).toBeDefined()
        expect(Array.isArray(colorPalettes.warm)).toBe(true)
        expect(colorPalettes.warm.length).toBeGreaterThan(0)
      })

      it('should contain monochrome palette', () => {
        expect(colorPalettes.monochrome).toBeDefined()
        expect(Array.isArray(colorPalettes.monochrome)).toBe(true)
        expect(colorPalettes.monochrome.length).toBeGreaterThan(0)
      })

      it('should have valid hex color format in all palettes', () => {
        const hexColorRegex = /^#[0-9a-fA-F]{6}$/
        Object.values(colorPalettes).forEach((palette) => {
          palette.forEach((color) => {
            expect(color).toMatch(hexColorRegex)
          })
        })
      })
    })

    describe('getColor', () => {
      it('should return first color for index 0', () => {
        const color = getColor(0)
        expect(color).toBe(colorPalettes.default[0])
      })

      it('should return correct color for valid index', () => {
        const color = getColor(3)
        expect(color).toBe(colorPalettes.default[3])
      })

      it('should wrap around when index exceeds palette length', () => {
        const paletteLength = colorPalettes.default.length
        const color = getColor(paletteLength)
        expect(color).toBe(colorPalettes.default[0])
      })

      it('should work with pastel palette', () => {
        const color = getColor(0, 'pastel')
        expect(color).toBe(colorPalettes.pastel[0])
      })

      it('should work with vivid palette', () => {
        const color = getColor(2, 'vivid')
        expect(color).toBe(colorPalettes.vivid[2])
      })

      it('should work with cool palette', () => {
        const color = getColor(1, 'cool')
        expect(color).toBe(colorPalettes.cool[1])
      })

      it('should work with warm palette', () => {
        const color = getColor(0, 'warm')
        expect(color).toBe(colorPalettes.warm[0])
      })

      it('should work with monochrome palette', () => {
        const color = getColor(4, 'monochrome')
        expect(color).toBe(colorPalettes.monochrome[4])
      })
    })

    describe('generateColors', () => {
      it('should generate correct number of colors', () => {
        const colors = generateColors(5)
        expect(colors).toHaveLength(5)
      })

      it('should generate empty array for count 0', () => {
        const colors = generateColors(0)
        expect(colors).toHaveLength(0)
      })

      it('should use default palette when not specified', () => {
        const colors = generateColors(3)
        expect(colors[0]).toBe(colorPalettes.default[0])
        expect(colors[1]).toBe(colorPalettes.default[1])
        expect(colors[2]).toBe(colorPalettes.default[2])
      })

      it('should use specified palette', () => {
        const colors = generateColors(3, 'pastel')
        expect(colors[0]).toBe(colorPalettes.pastel[0])
        expect(colors[1]).toBe(colorPalettes.pastel[1])
        expect(colors[2]).toBe(colorPalettes.pastel[2])
      })

      it('should wrap colors when count exceeds palette length', () => {
        const paletteLength = colorPalettes.warm.length
        const colors = generateColors(paletteLength + 2, 'warm')
        expect(colors).toHaveLength(paletteLength + 2)
        expect(colors[paletteLength]).toBe(colorPalettes.warm[0])
        expect(colors[paletteLength + 1]).toBe(colorPalettes.warm[1])
      })

      it('should return all valid hex colors', () => {
        const hexColorRegex = /^#[0-9a-fA-F]{6}$/
        const colors = generateColors(20)
        colors.forEach((color) => {
          expect(color).toMatch(hexColorRegex)
        })
      })
    })
  })

  describe('Simple Chart Provider', () => {
    let provider: ChartProvider

    beforeEach(() => {
      provider = createSimpleChartProvider()
    })

    describe('Provider Interface', () => {
      it('should return provider name', () => {
        expect(provider.getName()).toBe('simple')
      })

      it('should return supported chart types', () => {
        const supportedTypes = provider.getSupportedTypes()
        expect(Array.isArray(supportedTypes)).toBe(true)
        expect(supportedTypes).toContain('bar')
        expect(supportedTypes).toContain('line')
        expect(supportedTypes).toContain('pie')
      })

      it('should have createChart method', () => {
        expect(typeof provider.createChart).toBe('function')
      })
    })

    describe('Chart Creation', () => {
      it('should create chart from canvas element', () => {
        const canvas = createMockCanvas()
        const config: ChartConfig = {
          type: 'bar',
          datasets: [{ label: 'Test', data: [1, 2, 3] }],
        }

        const chart = provider.createChart(canvas, config)

        expect(chart).toBeDefined()
        expect(typeof chart.update).toBe('function')
        expect(typeof chart.destroy).toBe('function')
      })

      it('should throw error when canvas context unavailable', () => {
        // Create a real canvas element but mock getContext to return null
        const badCanvas = document.createElement('canvas')
        badCanvas.getContext = vi.fn(() => null) as typeof badCanvas.getContext

        const config: ChartConfig = {
          type: 'line',
          datasets: [],
        }

        expect(() => provider.createChart(badCanvas, config)).toThrow(
          'Could not get canvas 2D context',
        )
      })
    })

    describe('Chart Instance Methods', () => {
      let chart: ChartInstance
      let canvas: HTMLCanvasElement
      const baseConfig: ChartConfig = {
        type: 'bar',
        datasets: [
          { label: 'Dataset 1', data: [1, 2, 3] },
          { label: 'Dataset 2', data: [4, 5, 6] },
        ],
        labels: ['A', 'B', 'C'],
      }

      beforeEach(() => {
        canvas = createMockCanvas()
        chart = provider.createChart(canvas, baseConfig)
      })

      describe('update', () => {
        it('should update chart without config', () => {
          expect(() => chart.update()).not.toThrow()
        })

        it('should update chart with new config', () => {
          expect(() =>
            chart.update({
              title: { display: true, text: 'Updated Title' },
            }),
          ).not.toThrow()
        })

        it('should update chart type', () => {
          expect(() => chart.update({ type: 'line' })).not.toThrow()
        })
      })

      describe('resize', () => {
        it('should resize chart without error', () => {
          expect(() => chart.resize()).not.toThrow()
        })
      })

      describe('destroy', () => {
        it('should destroy chart without error', () => {
          expect(() => chart.destroy()).not.toThrow()
        })
      })

      describe('toBase64Image', () => {
        it('should return base64 image string', () => {
          const image = chart.toBase64Image()
          expect(typeof image).toBe('string')
          expect(image).toContain('data:image/')
        })

        it('should accept custom image type', () => {
          const image = chart.toBase64Image('image/jpeg')
          expect(typeof image).toBe('string')
        })
      })

      describe('getInstance', () => {
        it('should return underlying instance', () => {
          const instance = chart.getInstance()
          expect(instance).toBeDefined()
        })
      })

      describe('Dataset Visibility', () => {
        it('should show dataset', () => {
          expect(() => chart.showDataset(0)).not.toThrow()
        })

        it('should hide dataset', () => {
          expect(() => chart.hideDataset(0)).not.toThrow()
        })

        it('should toggle dataset', () => {
          expect(() => chart.toggleDataset(0)).not.toThrow()
        })

        it('should get visible datasets', () => {
          const visible = chart.getVisibleDatasets()
          expect(Array.isArray(visible)).toBe(true)
          expect(visible).toEqual([0, 1])
        })
      })

      describe('Data Manipulation', () => {
        it('should set data for a dataset', () => {
          expect(() => chart.setData(0, [10, 20, 30])).not.toThrow()
        })

        it('should set data with DataPoint objects', () => {
          const dataPoints: DataPoint[] = [
            { x: 1, y: 10 },
            { x: 2, y: 20 },
            { x: 3, y: 30 },
          ]
          expect(() => chart.setData(0, dataPoints)).not.toThrow()
        })

        it('should handle setting data for non-existent dataset index', () => {
          expect(() => chart.setData(99, [1, 2, 3])).not.toThrow()
        })

        it('should add dataset', () => {
          const newDataset: Dataset = {
            label: 'New Dataset',
            data: [7, 8, 9],
            backgroundColor: '#ff0000',
          }
          expect(() => chart.addDataset(newDataset)).not.toThrow()
        })

        it('should remove dataset', () => {
          expect(() => chart.removeDataset(0)).not.toThrow()
        })

        it('should add data point', () => {
          expect(() => chart.addData('D', [4, 7])).not.toThrow()
        })

        it('should remove data point', () => {
          expect(() => chart.removeData()).not.toThrow()
        })

        it('should remove data at specific index', () => {
          expect(() => chart.removeData(1)).not.toThrow()
        })
      })
    })
  })

  describe('Provider Management', () => {
    beforeEach(() => {
      // Reset provider
      setProvider(null as unknown as ChartProvider)
    })

    describe('setProvider / getProvider', () => {
      it('should return default simple provider when none set', () => {
        const provider = getProvider()
        expect(provider).toBeDefined()
        expect(provider.getName()).toBe('simple')
      })

      it('should return custom provider after setting it', () => {
        const mockProvider: ChartProvider = {
          createChart: vi.fn(),
          getName: () => 'mock',
          getSupportedTypes: () => ['line', 'bar'],
        }

        setProvider(mockProvider)
        const provider = getProvider()

        expect(provider).toBe(mockProvider)
        expect(provider.getName()).toBe('mock')
      })

      it('should allow overwriting the provider', () => {
        const mockProvider1: ChartProvider = {
          createChart: vi.fn(),
          getName: () => 'mock1',
          getSupportedTypes: () => ['line'],
        }

        const mockProvider2: ChartProvider = {
          createChart: vi.fn(),
          getName: () => 'mock2',
          getSupportedTypes: () => ['bar'],
        }

        setProvider(mockProvider1)
        expect(getProvider().getName()).toBe('mock1')

        setProvider(mockProvider2)
        expect(getProvider().getName()).toBe('mock2')
      })
    })

    describe('createChart', () => {
      it('should use current provider to create chart', () => {
        const mockChartInstance: ChartInstance = {
          update: vi.fn(),
          resize: vi.fn(),
          destroy: vi.fn(),
          toBase64Image: vi.fn(() => 'base64'),
          getInstance: vi.fn(),
          showDataset: vi.fn(),
          hideDataset: vi.fn(),
          toggleDataset: vi.fn(),
          getVisibleDatasets: vi.fn(() => [0]),
          setData: vi.fn(),
          addDataset: vi.fn(),
          removeDataset: vi.fn(),
          addData: vi.fn(),
          removeData: vi.fn(),
        }

        const mockProvider: ChartProvider = {
          createChart: vi.fn(() => mockChartInstance),
          getName: () => 'mock',
          getSupportedTypes: () => ['line', 'bar'],
        }

        setProvider(mockProvider)

        const canvas = createMockCanvas()
        const config: ChartConfig = {
          type: 'line',
          datasets: [{ label: 'Test', data: [1, 2, 3] }],
        }

        const chart = createChart(canvas, config)

        expect(mockProvider.createChart).toHaveBeenCalledWith(canvas, config)
        expect(chart).toBe(mockChartInstance)
      })
    })
  })

  describe('Chart Type Shorthand Functions', () => {
    let mockProvider: ChartProvider
    let mockChartInstance: ChartInstance

    beforeEach(() => {
      mockChartInstance = {
        update: vi.fn(),
        resize: vi.fn(),
        destroy: vi.fn(),
        toBase64Image: vi.fn(() => 'base64'),
        getInstance: vi.fn(),
        showDataset: vi.fn(),
        hideDataset: vi.fn(),
        toggleDataset: vi.fn(),
        getVisibleDatasets: vi.fn(() => [0]),
        setData: vi.fn(),
        addDataset: vi.fn(),
        removeDataset: vi.fn(),
        addData: vi.fn(),
        removeData: vi.fn(),
      }

      mockProvider = {
        createChart: vi.fn(() => mockChartInstance),
        getName: () => 'mock',
        getSupportedTypes: () => ['line', 'bar', 'pie', 'doughnut', 'area', 'scatter', 'radar'],
      }

      setProvider(mockProvider)
    })

    const baseConfig: Omit<ChartConfig, 'type'> = {
      datasets: [{ label: 'Test', data: [1, 2, 3] }],
      labels: ['A', 'B', 'C'],
    }

    it('should create line chart with correct type', () => {
      const canvas = createMockCanvas()
      createLineChart(canvas, baseConfig)

      expect(mockProvider.createChart).toHaveBeenCalledWith(canvas, {
        ...baseConfig,
        type: 'line',
      })
    })

    it('should create bar chart with correct type', () => {
      const canvas = createMockCanvas()
      createBarChart(canvas, baseConfig)

      expect(mockProvider.createChart).toHaveBeenCalledWith(canvas, {
        ...baseConfig,
        type: 'bar',
      })
    })

    it('should create pie chart with correct type', () => {
      const canvas = createMockCanvas()
      createPieChart(canvas, baseConfig)

      expect(mockProvider.createChart).toHaveBeenCalledWith(canvas, {
        ...baseConfig,
        type: 'pie',
      })
    })

    it('should create doughnut chart with correct type', () => {
      const canvas = createMockCanvas()
      createDoughnutChart(canvas, baseConfig)

      expect(mockProvider.createChart).toHaveBeenCalledWith(canvas, {
        ...baseConfig,
        type: 'doughnut',
      })
    })

    it('should create area chart with correct type', () => {
      const canvas = createMockCanvas()
      createAreaChart(canvas, baseConfig)

      expect(mockProvider.createChart).toHaveBeenCalledWith(canvas, {
        ...baseConfig,
        type: 'area',
      })
    })

    it('should create scatter chart with correct type', () => {
      const canvas = createMockCanvas()
      createScatterChart(canvas, baseConfig)

      expect(mockProvider.createChart).toHaveBeenCalledWith(canvas, {
        ...baseConfig,
        type: 'scatter',
      })
    })

    it('should create radar chart with correct type', () => {
      const canvas = createMockCanvas()
      createRadarChart(canvas, baseConfig)

      expect(mockProvider.createChart).toHaveBeenCalledWith(canvas, {
        ...baseConfig,
        type: 'radar',
      })
    })
  })

  describe('Chart Configuration', () => {
    let provider: ChartProvider

    beforeEach(() => {
      provider = createSimpleChartProvider()
    })

    describe('Dataset Configuration', () => {
      it('should accept dataset with all options', () => {
        const canvas = createMockCanvas()
        const config: ChartConfig = {
          type: 'line',
          datasets: [
            {
              label: 'Complete Dataset',
              data: [1, 2, 3],
              backgroundColor: '#ff0000',
              borderColor: '#0000ff',
              borderWidth: 2,
              fill: true,
              tension: 0.4,
              pointRadius: 5,
              pointStyle: 'circle',
              hidden: false,
              stack: 'stack1',
              yAxisID: 'y1',
              xAxisID: 'x1',
              order: 1,
            },
          ],
        }

        expect(() => provider.createChart(canvas, config)).not.toThrow()
      })

      it('should accept dataset with array colors', () => {
        const canvas = createMockCanvas()
        const config: ChartConfig = {
          type: 'bar',
          datasets: [
            {
              label: 'Multi-color Dataset',
              data: [1, 2, 3],
              backgroundColor: ['#ff0000', '#00ff00', '#0000ff'],
              borderColor: ['#aa0000', '#00aa00', '#0000aa'],
            },
          ],
        }

        expect(() => provider.createChart(canvas, config)).not.toThrow()
      })

      it('should accept dataset with DataPoint data', () => {
        const canvas = createMockCanvas()
        const config: ChartConfig = {
          type: 'scatter',
          datasets: [
            {
              label: 'Scatter Dataset',
              data: [
                { x: 1, y: 10, label: 'Point 1' },
                { x: 2, y: 20, r: 5 },
                { x: 3, y: 30, color: '#ff0000', meta: { id: 1 } },
              ],
            },
          ],
        }

        expect(() => provider.createChart(canvas, config)).not.toThrow()
      })
    })

    describe('Axis Configuration', () => {
      it('should accept x-axis configuration', () => {
        const canvas = createMockCanvas()
        const config: ChartConfig = {
          type: 'line',
          datasets: [{ label: 'Test', data: [1, 2, 3] }],
          xAxis: {
            type: 'category',
            title: { display: true, text: 'X Axis', color: '#333' },
            display: true,
            grid: { display: true, color: '#eee', lineWidth: 1 },
            ticks: { display: true, color: '#666' },
            position: 'bottom',
          },
        }

        expect(() => provider.createChart(canvas, config)).not.toThrow()
      })

      it('should accept y-axis configuration', () => {
        const canvas = createMockCanvas()
        const config: ChartConfig = {
          type: 'bar',
          datasets: [{ label: 'Test', data: [1, 2, 3] }],
          yAxis: {
            type: 'linear',
            min: 0,
            max: 100,
            beginAtZero: true,
            stacked: true,
            position: 'left',
          },
        }

        expect(() => provider.createChart(canvas, config)).not.toThrow()
      })

      it('should accept time axis configuration', () => {
        const canvas = createMockCanvas()
        const config: ChartConfig = {
          type: 'line',
          datasets: [{ label: 'Test', data: [1, 2, 3] }],
          xAxis: {
            type: 'time',
            time: {
              unit: 'day',
              displayFormats: { day: 'MMM d' },
              tooltipFormat: 'MMM d, yyyy',
            },
          },
        }

        expect(() => provider.createChart(canvas, config)).not.toThrow()
      })

      it('should accept multiple axes', () => {
        const canvas = createMockCanvas()
        const config: ChartConfig = {
          type: 'line',
          datasets: [
            { label: 'Dataset 1', data: [1, 2, 3], yAxisID: 'y1' },
            { label: 'Dataset 2', data: [100, 200, 300], yAxisID: 'y2' },
          ],
          axes: {
            y1: { type: 'linear', position: 'left' },
            y2: { type: 'linear', position: 'right' },
          },
        }

        expect(() => provider.createChart(canvas, config)).not.toThrow()
      })
    })

    describe('Legend Configuration', () => {
      it('should accept legend configuration', () => {
        const canvas = createMockCanvas()
        const config: ChartConfig = {
          type: 'pie',
          datasets: [{ label: 'Test', data: [1, 2, 3] }],
          legend: {
            display: true,
            position: 'right',
            align: 'center',
            labels: {
              color: '#333',
              font: { family: 'Arial', size: 12, weight: 'bold' },
              padding: 10,
              usePointStyle: true,
              boxWidth: 20,
              boxHeight: 20,
            },
          },
        }

        expect(() => provider.createChart(canvas, config)).not.toThrow()
      })

      it('should accept legend click handler', () => {
        const canvas = createMockCanvas()
        const onClick = vi.fn()
        const config: ChartConfig = {
          type: 'bar',
          datasets: [{ label: 'Test', data: [1, 2, 3] }],
          legend: {
            display: true,
            onClick,
          },
        }

        expect(() => provider.createChart(canvas, config)).not.toThrow()
      })
    })

    describe('Tooltip Configuration', () => {
      it('should accept tooltip configuration', () => {
        const canvas = createMockCanvas()
        const config: ChartConfig = {
          type: 'line',
          datasets: [{ label: 'Test', data: [1, 2, 3] }],
          tooltip: {
            enabled: true,
            mode: 'index',
            intersect: false,
            position: 'average',
            backgroundColor: 'rgba(0,0,0,0.8)',
            titleColor: '#fff',
            bodyColor: '#fff',
            borderColor: '#333',
            borderWidth: 1,
            padding: 10,
          },
        }

        expect(() => provider.createChart(canvas, config)).not.toThrow()
      })

      it('should accept tooltip callbacks', () => {
        const canvas = createMockCanvas()
        const config: ChartConfig = {
          type: 'bar',
          datasets: [{ label: 'Test', data: [1, 2, 3] }],
          tooltip: {
            enabled: true,
            callbacks: {
              title: () => 'Custom Title',
              label: () => 'Custom Label',
              footer: () => 'Custom Footer',
            },
          },
        }

        expect(() => provider.createChart(canvas, config)).not.toThrow()
      })
    })

    describe('Animation Configuration', () => {
      it('should accept animation configuration', () => {
        const canvas = createMockCanvas()
        const config: ChartConfig = {
          type: 'line',
          datasets: [{ label: 'Test', data: [1, 2, 3] }],
          animation: {
            duration: 1000,
            easing: 'easeOutCubic',
            delay: 100,
            loop: false,
            disabled: false,
          },
        }

        expect(() => provider.createChart(canvas, config)).not.toThrow()
      })

      it('should accept disabled animation', () => {
        const canvas = createMockCanvas()
        const config: ChartConfig = {
          type: 'bar',
          datasets: [{ label: 'Test', data: [1, 2, 3] }],
          animation: {
            disabled: true,
          },
        }

        expect(() => provider.createChart(canvas, config)).not.toThrow()
      })
    })

    describe('Title Configuration', () => {
      it('should accept title configuration', () => {
        const canvas = createMockCanvas()
        const config: ChartConfig = {
          type: 'line',
          datasets: [{ label: 'Test', data: [1, 2, 3] }],
          title: {
            display: true,
            text: 'Chart Title',
            color: '#333',
            font: { family: 'Arial', size: 16, weight: 'bold' },
            padding: 20,
            position: 'top',
          },
        }

        expect(() => provider.createChart(canvas, config)).not.toThrow()
      })
    })

    describe('Responsive Configuration', () => {
      it('should accept responsive settings', () => {
        const canvas = createMockCanvas()
        const config: ChartConfig = {
          type: 'line',
          datasets: [{ label: 'Test', data: [1, 2, 3] }],
          responsive: true,
          maintainAspectRatio: true,
          aspectRatio: 2,
        }

        expect(() => provider.createChart(canvas, config)).not.toThrow()
      })

      it('should accept padding configuration', () => {
        const canvas = createMockCanvas()
        const config: ChartConfig = {
          type: 'bar',
          datasets: [{ label: 'Test', data: [1, 2, 3] }],
          padding: { top: 10, right: 20, bottom: 30, left: 40 },
        }

        expect(() => provider.createChart(canvas, config)).not.toThrow()
      })
    })

    describe('Event Handlers', () => {
      it('should accept onClick handler', () => {
        const canvas = createMockCanvas()
        const onClick = vi.fn()
        const config: ChartConfig = {
          type: 'bar',
          datasets: [{ label: 'Test', data: [1, 2, 3] }],
          onClick,
        }

        expect(() => provider.createChart(canvas, config)).not.toThrow()
      })

      it('should accept onHover handler', () => {
        const canvas = createMockCanvas()
        const onHover = vi.fn()
        const config: ChartConfig = {
          type: 'line',
          datasets: [{ label: 'Test', data: [1, 2, 3] }],
          onHover,
        }

        expect(() => provider.createChart(canvas, config)).not.toThrow()
      })
    })
  })

  describe('Chart Types', () => {
    let provider: ChartProvider

    beforeEach(() => {
      provider = createSimpleChartProvider()
    })

    const chartTypes: ChartType[] = [
      'line',
      'bar',
      'pie',
      'doughnut',
      'area',
      'scatter',
      'bubble',
      'radar',
      'polar',
      'heatmap',
      'treemap',
      'funnel',
      'gauge',
      'candlestick',
    ]

    chartTypes.forEach((chartType) => {
      it(`should accept ${chartType} chart type`, () => {
        const canvas = createMockCanvas()
        const config: ChartConfig = {
          type: chartType,
          datasets: [{ label: 'Test', data: [1, 2, 3] }],
        }

        expect(() => provider.createChart(canvas, config)).not.toThrow()
      })
    })
  })

  describe('Custom Provider Implementation', () => {
    it('should work with a fully custom provider', () => {
      const customStore: ChartConfig[] = []

      const customProvider: ChartProvider = {
        getName: () => 'custom',
        getSupportedTypes: () => ['line', 'bar', 'pie'],
        createChart: (container, config) => {
          customStore.push(config)
          return {
            update: vi.fn((newConfig) => {
              if (newConfig) {
                Object.assign(customStore[customStore.length - 1], newConfig)
              }
            }),
            resize: vi.fn(),
            destroy: vi.fn(() => {
              customStore.pop()
            }),
            toBase64Image: vi.fn(() => 'custom-image'),
            getInstance: vi.fn(() => ({ custom: true })),
            showDataset: vi.fn(),
            hideDataset: vi.fn(),
            toggleDataset: vi.fn(),
            getVisibleDatasets: vi.fn(() => [0]),
            setData: vi.fn(),
            addDataset: vi.fn(),
            removeDataset: vi.fn(),
            addData: vi.fn(),
            removeData: vi.fn(),
          }
        },
      }

      setProvider(customProvider)

      const canvas = createMockCanvas()
      const config: ChartConfig = {
        type: 'line',
        datasets: [{ label: 'Test', data: [1, 2, 3] }],
      }

      const chart = createChart(canvas, config)

      expect(getProvider().getName()).toBe('custom')
      expect(chart.toBase64Image()).toBe('custom-image')
      expect(chart.getInstance()).toEqual({ custom: true })
    })

    it('should support optional registerPlugin method', () => {
      const registeredPlugins: unknown[] = []

      const customProvider: ChartProvider = {
        getName: () => 'plugin-support',
        getSupportedTypes: () => ['line'],
        createChart: vi.fn(() => ({
          update: vi.fn(),
          resize: vi.fn(),
          destroy: vi.fn(),
          toBase64Image: vi.fn(() => ''),
          getInstance: vi.fn(),
          showDataset: vi.fn(),
          hideDataset: vi.fn(),
          toggleDataset: vi.fn(),
          getVisibleDatasets: vi.fn(() => []),
          setData: vi.fn(),
          addDataset: vi.fn(),
          removeDataset: vi.fn(),
          addData: vi.fn(),
          removeData: vi.fn(),
        })),
        registerPlugin: (plugin) => {
          registeredPlugins.push(plugin)
        },
      }

      setProvider(customProvider)

      const plugin = { id: 'test-plugin' }
      getProvider().registerPlugin?.(plugin)

      expect(registeredPlugins).toContain(plugin)
    })

    it('should support optional setDefaults method', () => {
      let storedDefaults: Partial<ChartConfig> = {}

      const customProvider: ChartProvider = {
        getName: () => 'defaults-support',
        getSupportedTypes: () => ['bar'],
        createChart: vi.fn(() => ({
          update: vi.fn(),
          resize: vi.fn(),
          destroy: vi.fn(),
          toBase64Image: vi.fn(() => ''),
          getInstance: vi.fn(),
          showDataset: vi.fn(),
          hideDataset: vi.fn(),
          toggleDataset: vi.fn(),
          getVisibleDatasets: vi.fn(() => []),
          setData: vi.fn(),
          addDataset: vi.fn(),
          removeDataset: vi.fn(),
          addData: vi.fn(),
          removeData: vi.fn(),
        })),
        setDefaults: (defaults) => {
          storedDefaults = defaults
        },
      }

      setProvider(customProvider)

      const defaults: Partial<ChartConfig> = {
        responsive: true,
        animation: { duration: 500 },
      }

      getProvider().setDefaults?.(defaults)

      expect(storedDefaults).toEqual(defaults)
    })
  })

  describe('Type Safety', () => {
    it('should enforce ChartType values', () => {
      const validType: ChartType = 'line'
      expect(validType).toBe('line')
    })

    it('should support DataPoint interface', () => {
      const dataPoint: DataPoint = {
        x: 1,
        y: 100,
        r: 10,
        label: 'Point A',
        color: '#ff0000',
        meta: { category: 'test' },
      }

      expect(dataPoint.x).toBe(1)
      expect(dataPoint.y).toBe(100)
      expect(dataPoint.r).toBe(10)
      expect(dataPoint.label).toBe('Point A')
      expect(dataPoint.color).toBe('#ff0000')
      expect(dataPoint.meta?.category).toBe('test')
    })

    it('should support Dataset interface', () => {
      const dataset: Dataset = {
        label: 'Sales',
        data: [1, 2, 3],
        backgroundColor: '#4e79a7',
        borderColor: '#4e79a7',
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointStyle: 'circle',
        hidden: false,
        stack: 'stack1',
        yAxisID: 'y',
        xAxisID: 'x',
        order: 1,
      }

      expect(dataset.label).toBe('Sales')
      expect(dataset.data).toEqual([1, 2, 3])
    })

    it('should support FontConfig interface', () => {
      const font: FontConfig = {
        family: 'Arial',
        size: 14,
        weight: 'bold',
        style: 'italic',
      }

      expect(font.family).toBe('Arial')
      expect(font.size).toBe(14)
      expect(font.weight).toBe('bold')
      expect(font.style).toBe('italic')
    })

    it('should support AxisConfig interface', () => {
      const axis: AxisConfig = {
        type: 'linear',
        title: { display: true, text: 'Value' },
        min: 0,
        max: 100,
        beginAtZero: true,
        display: true,
        grid: { display: true, color: '#eee' },
        ticks: { display: true, stepSize: 10 },
        stacked: false,
        position: 'left',
      }

      expect(axis.type).toBe('linear')
      expect(axis.min).toBe(0)
    })

    it('should support LegendConfig interface', () => {
      const legend: LegendConfig = {
        display: true,
        position: 'right',
        align: 'center',
        labels: { color: '#333', padding: 10 },
      }

      expect(legend.display).toBe(true)
      expect(legend.position).toBe('right')
    })

    it('should support TooltipConfig interface', () => {
      const tooltip: TooltipConfig = {
        enabled: true,
        mode: 'index',
        intersect: false,
        position: 'average',
        backgroundColor: 'rgba(0,0,0,0.8)',
      }

      expect(tooltip.enabled).toBe(true)
      expect(tooltip.mode).toBe('index')
    })

    it('should support AnimationConfig interface', () => {
      const animation: AnimationConfig = {
        duration: 1000,
        easing: 'easeOutCubic',
        delay: 100,
        loop: false,
        disabled: false,
      }

      expect(animation.duration).toBe(1000)
      expect(animation.easing).toBe('easeOutCubic')
    })
  })

  describe('Edge Cases', () => {
    let provider: ChartProvider

    beforeEach(() => {
      provider = createSimpleChartProvider()
    })

    it('should handle empty datasets array', () => {
      const canvas = createMockCanvas()
      const config: ChartConfig = {
        type: 'line',
        datasets: [],
      }

      expect(() => provider.createChart(canvas, config)).not.toThrow()
    })

    it('should handle dataset with empty data array', () => {
      const canvas = createMockCanvas()
      const config: ChartConfig = {
        type: 'bar',
        datasets: [{ label: 'Empty', data: [] }],
      }

      expect(() => provider.createChart(canvas, config)).not.toThrow()
    })

    it('should handle very large data values', () => {
      const canvas = createMockCanvas()
      const config: ChartConfig = {
        type: 'line',
        datasets: [
          {
            label: 'Large Values',
            data: [Number.MAX_SAFE_INTEGER, Number.MIN_SAFE_INTEGER, 0],
          },
        ],
      }

      expect(() => provider.createChart(canvas, config)).not.toThrow()
    })

    it('should handle negative values', () => {
      const canvas = createMockCanvas()
      const config: ChartConfig = {
        type: 'bar',
        datasets: [{ label: 'Negative', data: [-100, -50, 0, 50, 100] }],
      }

      expect(() => provider.createChart(canvas, config)).not.toThrow()
    })

    it('should handle decimal values', () => {
      const canvas = createMockCanvas()
      const config: ChartConfig = {
        type: 'line',
        datasets: [{ label: 'Decimal', data: [0.1, 0.25, 0.5, 0.75, 1.0] }],
      }

      expect(() => provider.createChart(canvas, config)).not.toThrow()
    })

    it('should handle Date values in DataPoint', () => {
      const canvas = createMockCanvas()
      const config: ChartConfig = {
        type: 'line',
        datasets: [
          {
            label: 'Time Series',
            data: [
              { x: new Date('2024-01-01'), y: 10 },
              { x: new Date('2024-02-01'), y: 20 },
              { x: new Date('2024-03-01'), y: 30 },
            ],
          },
        ],
      }

      expect(() => provider.createChart(canvas, config)).not.toThrow()
    })

    it('should handle mixed number and DataPoint data', () => {
      const canvas = createMockCanvas()
      const config: ChartConfig = {
        type: 'scatter',
        datasets: [
          {
            label: 'Mixed',
            data: [10, { x: 2, y: 20 }, 30, { x: 4, y: 40, label: 'Special' }],
          },
        ],
      }

      expect(() => provider.createChart(canvas, config)).not.toThrow()
    })

    it('should handle special characters in labels', () => {
      const canvas = createMockCanvas()
      const config: ChartConfig = {
        type: 'bar',
        datasets: [{ label: 'Test <script>alert("xss")</script>', data: [1, 2] }],
        labels: ['Label & Special', 'Label "Quoted"'],
      }

      expect(() => provider.createChart(canvas, config)).not.toThrow()
    })

    it('should handle unicode in labels', () => {
      const canvas = createMockCanvas()
      const config: ChartConfig = {
        type: 'pie',
        datasets: [{ label: 'Sales Data', data: [30, 40, 30] }],
        labels: ['North America', 'Europa', 'Asia Pacific'],
      }

      expect(() => provider.createChart(canvas, config)).not.toThrow()
    })

    it('should handle many datasets', () => {
      const canvas = createMockCanvas()
      const datasets: Dataset[] = Array.from({ length: 50 }, (_, i) => ({
        label: `Dataset ${i}`,
        data: [i, i * 2, i * 3],
      }))

      const config: ChartConfig = {
        type: 'line',
        datasets,
      }

      expect(() => provider.createChart(canvas, config)).not.toThrow()
    })

    it('should handle many data points', () => {
      const canvas = createMockCanvas()
      const data = Array.from({ length: 1000 }, (_, i) => i)

      const config: ChartConfig = {
        type: 'line',
        datasets: [{ label: 'Large Dataset', data }],
      }

      expect(() => provider.createChart(canvas, config)).not.toThrow()
    })
  })

  describe('Chart Instance Lifecycle', () => {
    let provider: ChartProvider

    beforeEach(() => {
      provider = createSimpleChartProvider()
    })

    it('should support full lifecycle: create -> update -> destroy', () => {
      const canvas = createMockCanvas()
      const config: ChartConfig = {
        type: 'bar',
        datasets: [{ label: 'Test', data: [1, 2, 3] }],
      }

      // Create
      const chart = provider.createChart(canvas, config)
      expect(chart).toBeDefined()

      // Update multiple times
      chart.update({ title: { display: true, text: 'Updated' } })
      chart.update()
      chart.setData(0, [4, 5, 6])
      chart.addDataset({ label: 'New', data: [7, 8, 9] })
      chart.removeDataset(1)

      // Resize
      chart.resize()

      // Export
      const image = chart.toBase64Image()
      expect(image).toBeDefined()

      // Destroy
      chart.destroy()
    })

    it('should handle operations after destroy gracefully', () => {
      const canvas = createMockCanvas()
      const config: ChartConfig = {
        type: 'line',
        datasets: [{ label: 'Test', data: [1, 2, 3] }],
      }

      const chart = provider.createChart(canvas, config)
      chart.destroy()

      // These should not throw even after destroy
      // (behavior depends on implementation, but should be graceful)
      expect(() => chart.resize()).not.toThrow()
      expect(() => chart.update()).not.toThrow()
    })
  })
})
