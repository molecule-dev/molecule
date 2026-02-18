/**
 * Simple chart provider implementation for molecule.dev.
 *
 * @module
 */

import { t } from '@molecule/app-i18n'

import type { ChartConfig, ChartInstance, ChartProvider, ChartType, DataPoint } from './types.js'

interface SimpleChartProviderOptions {
  placeholderLabel?: (type: string) => string
  placeholderDescription?: string
}

/**
 * Creates a simple canvas-based chart provider.
 * This is a basic fallback - for production use, prefer dedicated providers.
 * @param options - Custom placeholder labels and descriptions for the fallback renderer.
 * @returns A chart provider that renders basic canvas placeholders.
 */
export const createSimpleChartProvider = (options?: SimpleChartProviderOptions): ChartProvider => {
  return {
    getName: () => 'simple',

    getSupportedTypes: () => ['bar', 'line', 'pie'] as ChartType[],

    createChart: (
      container: HTMLCanvasElement | HTMLElement,
      config: ChartConfig,
    ): ChartInstance => {
      const canvas =
        container instanceof HTMLCanvasElement
          ? container
          : (() => {
              const c = document.createElement('canvas')
              container.appendChild(c)
              return c
            })()

      const ctx = canvas.getContext('2d')
      if (!ctx) {
        throw new Error(
          t('charts.error.noCanvasContext', undefined, {
            defaultValue: 'Could not get canvas 2D context',
          }),
        )
      }

      let currentConfig = { ...config }

      const render = (): void => {
        const { width, height } = canvas
        ctx.clearRect(0, 0, width, height)

        // Very basic rendering - just a placeholder
        ctx.fillStyle = '#333'
        ctx.font = '14px sans-serif'
        ctx.textAlign = 'center'
        const chartLabel =
          options?.placeholderLabel?.(currentConfig.type) ??
          t(
            'charts.placeholder.label',
            { type: currentConfig.type },
            { defaultValue: '{{type}} chart' },
          )
        const chartDesc =
          options?.placeholderDescription ??
          t('charts.placeholder.description', undefined, {
            defaultValue: 'Use a proper chart provider',
          })
        ctx.fillText(chartLabel, width / 2, height / 2)
        ctx.fillText(chartDesc, width / 2, height / 2 + 20)
      }

      render()

      return {
        update: (newConfig?: Partial<ChartConfig>) => {
          if (newConfig) {
            currentConfig = { ...currentConfig, ...newConfig }
          }
          render()
        },
        resize: () => render(),
        destroy: () => {
          ctx.clearRect(0, 0, canvas.width, canvas.height)
        },
        toBase64Image: (type = 'image/png') => canvas.toDataURL(type),
        getInstance: () => ctx,
        showDataset: () => {},
        hideDataset: () => {},
        toggleDataset: () => {},
        getVisibleDatasets: () => currentConfig.datasets.map((_, i) => i),
        setData: (datasetIndex: number, data: (number | DataPoint)[]) => {
          if (currentConfig.datasets[datasetIndex]) {
            currentConfig.datasets[datasetIndex].data = data
            render()
          }
        },
        addDataset: (dataset) => {
          currentConfig.datasets.push(dataset)
          render()
        },
        removeDataset: (index) => {
          currentConfig.datasets.splice(index, 1)
          render()
        },
        addData: () => render(),
        removeData: () => render(),
      }
    },
  }
}
