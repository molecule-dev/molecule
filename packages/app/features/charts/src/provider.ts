/**
 * Chart provider management for molecule.dev.
 *
 * @module
 */

import { bond, get as bondGet, isBonded } from '@molecule/app-bond'

import { createSimpleChartProvider } from './chart.js'
import type { ChartConfig, ChartInstance, ChartProvider } from './types.js'

const BOND_TYPE = 'charts'

/**
 * Sets the chart provider.
 * @param provider - The chart provider implementation to bond.
 */
export const setProvider = (provider: ChartProvider): void => {
  bond(BOND_TYPE, provider)
}

/**
 * Gets the current chart provider. Falls back to a simple built-in provider if none has been bonded.
 * @returns The active chart provider instance.
 */
export const getProvider = (): ChartProvider => {
  if (!isBonded(BOND_TYPE)) {
    bond(BOND_TYPE, createSimpleChartProvider())
  }
  return bondGet<ChartProvider>(BOND_TYPE)!
}

/**
 * Checks if a chart provider has been bonded.
 * @returns Whether a chart provider is currently registered.
 */
export const hasProvider = (): boolean => {
  return isBonded(BOND_TYPE)
}

/**
 * Creates a chart using the active provider.
 * @param container - The DOM element to render the chart into.
 * @param config - The chart configuration including type, data, and options.
 * @returns The created chart instance with update and destroy methods.
 */
export const createChart = (
  container: HTMLCanvasElement | HTMLElement,
  config: ChartConfig,
): ChartInstance => {
  return getProvider().createChart(container, config)
}

/**
 * Creates a line chart (shorthand that sets type to 'line').
 * @param container - The DOM element to render the chart into.
 * @param config - The chart configuration (type is set automatically).
 * @returns The created line chart instance.
 */
export const createLineChart = (
  container: HTMLCanvasElement | HTMLElement,
  config: Omit<ChartConfig, 'type'>,
): ChartInstance => createChart(container, { ...config, type: 'line' })

/**
 * Creates a bar chart (shorthand that sets type to 'bar').
 * @param container - The DOM element to render the chart into.
 * @param config - The chart configuration (type is set automatically).
 * @returns The created bar chart instance.
 */
export const createBarChart = (
  container: HTMLCanvasElement | HTMLElement,
  config: Omit<ChartConfig, 'type'>,
): ChartInstance => createChart(container, { ...config, type: 'bar' })

/**
 * Creates a pie chart (shorthand that sets type to 'pie').
 * @param container - The DOM element to render the chart into.
 * @param config - The chart configuration (type is set automatically).
 * @returns The created pie chart instance.
 */
export const createPieChart = (
  container: HTMLCanvasElement | HTMLElement,
  config: Omit<ChartConfig, 'type'>,
): ChartInstance => createChart(container, { ...config, type: 'pie' })

/**
 * Creates a doughnut chart (shorthand that sets type to 'doughnut').
 * @param container - The DOM element to render the chart into.
 * @param config - The chart configuration (type is set automatically).
 * @returns The created doughnut chart instance.
 */
export const createDoughnutChart = (
  container: HTMLCanvasElement | HTMLElement,
  config: Omit<ChartConfig, 'type'>,
): ChartInstance => createChart(container, { ...config, type: 'doughnut' })

/**
 * Creates an area chart (shorthand that sets type to 'area').
 * @param container - The DOM element to render the chart into.
 * @param config - The chart configuration (type is set automatically).
 * @returns The created area chart instance.
 */
export const createAreaChart = (
  container: HTMLCanvasElement | HTMLElement,
  config: Omit<ChartConfig, 'type'>,
): ChartInstance => createChart(container, { ...config, type: 'area' })

/**
 * Creates a scatter chart (shorthand that sets type to 'scatter').
 * @param container - The DOM element to render the chart into.
 * @param config - The chart configuration (type is set automatically).
 * @returns The created scatter chart instance.
 */
export const createScatterChart = (
  container: HTMLCanvasElement | HTMLElement,
  config: Omit<ChartConfig, 'type'>,
): ChartInstance => createChart(container, { ...config, type: 'scatter' })

/**
 * Creates a radar chart (shorthand that sets type to 'radar').
 * @param container - The DOM element to render the chart into.
 * @param config - The chart configuration (type is set automatically).
 * @returns The created radar chart instance.
 */
export const createRadarChart = (
  container: HTMLCanvasElement | HTMLElement,
  config: Omit<ChartConfig, 'type'>,
): ChartInstance => createChart(container, { ...config, type: 'radar' })
