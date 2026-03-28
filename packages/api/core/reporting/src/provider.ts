/**
 * Reporting provider bond accessor and convenience functions.
 *
 * Bond packages (e.g. `@molecule/api-reporting-database`) call `setProvider()` during setup.
 * Application code uses the convenience functions which delegate to the bonded provider.
 *
 * @module
 */

import { bond, expectBond, isBonded, require as bondRequire } from '@molecule/api-bond'
import { t } from '@molecule/api-i18n'

import type {
  AggregateQuery,
  AggregateResult,
  ExportFormat,
  ReportProvider,
  ScheduledReport,
  TimeSeriesQuery,
  TimeSeriesResult,
} from './types.js'

const BOND_TYPE = 'reporting'
expectBond(BOND_TYPE)

/**
 * Registers a reporting provider as the active singleton. Called by bond
 * packages during application startup.
 *
 * @param provider - The reporting provider implementation to bond.
 */
export const setProvider = (provider: ReportProvider): void => {
  bond(BOND_TYPE, provider)
}

/**
 * Retrieves the bonded reporting provider, throwing if none is configured.
 *
 * @returns The bonded reporting provider.
 * @throws {Error} If no reporting provider has been bonded.
 */
export const getProvider = (): ReportProvider => {
  try {
    return bondRequire<ReportProvider>(BOND_TYPE)
  } catch {
    throw new Error(
      t('reporting.error.noProvider', undefined, {
        defaultValue: 'Reporting provider not configured. Call setProvider() first.',
      }),
    )
  }
}

/**
 * Checks whether a reporting provider is currently bonded.
 *
 * @returns `true` if a reporting provider is bonded.
 */
export const hasProvider = (): boolean => {
  return isBonded(BOND_TYPE)
}

/**
 * Executes an aggregate query and returns grouped results.
 *
 * @param query - The aggregate query definition.
 * @returns Aggregated rows and total count.
 * @throws {Error} If no reporting provider has been bonded.
 */
export const aggregate = async (query: AggregateQuery): Promise<AggregateResult> => {
  return getProvider().aggregate(query)
}

/**
 * Executes a time-series query and returns bucketed data points.
 *
 * @param query - The time-series query definition.
 * @returns Ordered time-series points.
 * @throws {Error} If no reporting provider has been bonded.
 */
export const timeSeries = async (query: TimeSeriesQuery): Promise<TimeSeriesResult> => {
  return getProvider().timeSeries(query)
}

/**
 * Exports query results in the specified format.
 *
 * @param query - The query to execute and export.
 * @param format - The desired output format.
 * @returns A Buffer containing the exported data.
 * @throws {Error} If no reporting provider has been bonded.
 */
export const exportReport = async (
  query: AggregateQuery | TimeSeriesQuery,
  format: ExportFormat,
): Promise<Buffer> => {
  return getProvider().export(query, format)
}

/**
 * Creates a scheduled report and returns its unique identifier.
 *
 * @param report - The scheduled report configuration.
 * @returns The schedule identifier.
 * @throws {Error} If no reporting provider has been bonded.
 */
export const scheduleReport = async (report: ScheduledReport): Promise<string> => {
  return getProvider().schedule(report)
}

/**
 * Cancels a previously scheduled report.
 *
 * @param scheduleId - The schedule identifier to cancel.
 * @returns A promise that resolves when the schedule has been cancelled.
 * @throws {Error} If no reporting provider has been bonded.
 */
export const cancelSchedule = async (scheduleId: string): Promise<void> => {
  return getProvider().cancelSchedule(scheduleId)
}
