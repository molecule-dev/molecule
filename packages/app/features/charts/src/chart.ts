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
 * Warn-once guard. The placeholder provider draws a "no chart provider bonded"
 * notice for real — the first time it renders we log an actionable warning so
 * the missing real provider is visible instead of a silent fake chart. Module
 * scoped so a screen full of charts logs one line, not one per canvas.
 */
let hasWarnedNoRealChartProvider = false

/**
 * Creates the built-in **placeholder** chart provider. It does NOT draw real
 * charts: every `createChart` paints a "placeholder — no chart provider bonded"
 * notice onto the canvas and logs a one-time, actionable `console.warn`, rather
 * than silently pretending to render. No real chart provider ships with the
 * fleet — to draw actual charts, implement the {@link ChartProvider} interface
 * around a real library (Chart.js / Recharts / D3) and wire it with
 * `bond('charts', provider)` (or `setProvider(provider)`) at startup, before any
 * `create*Chart` call.
 * @param options - Optional overrides for the placeholder label/description text.
 * @returns A placeholder chart provider — renders a non-functional notice, not a chart.
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

      // This provider does not draw real charts. Make the omission loud instead
      // of silently painting a fake-looking chart: warn once, actionably.
      if (!hasWarnedNoRealChartProvider) {
        hasWarnedNoRealChartProvider = true
        console.warn(
          '[@molecule/app-charts] No chart provider bonded — rendering a non-functional ' +
            'placeholder, not a real chart. No chart provider ships with the fleet: implement ' +
            'the ChartProvider interface (e.g. around Chart.js, Recharts, or D3) and wire it ' +
            "with bond('charts', provider) (or setProvider(provider)) at startup, before any " +
            'create*Chart call.',
        )
      }

      let currentConfig = { ...config }

      const render = (): void => {
        const { width, height } = canvas
        ctx.clearRect(0, 0, width, height)

        // Not a chart — a placeholder notice. The text explicitly names itself a
        // placeholder so it can't be mistaken for a rendered chart.
        ctx.fillStyle = '#333'
        ctx.font = '14px sans-serif'
        ctx.textAlign = 'center'
        const chartLabel =
          options?.placeholderLabel?.(currentConfig.type) ??
          t(
            'charts.placeholder.label',
            { type: currentConfig.type },
            { defaultValue: '{{type}} chart — placeholder' },
          )
        const chartDesc =
          options?.placeholderDescription ??
          t('charts.placeholder.description', undefined, {
            defaultValue: 'No chart provider bonded',
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
