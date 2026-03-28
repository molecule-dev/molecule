/**
 * GDPR compliance provider configuration and types.
 *
 * @module
 */

import type { DataCategory, LegalBasis } from '@molecule/api-compliance'

/**
 * Configuration for the GDPR compliance provider.
 */
export interface GdprConfig {
  /**
   * Data retention period in days. Data older than this is eligible for
   * automatic purging when `autoPurge` is enabled.
   *
   * @default 365
   */
  retentionDays?: number

  /**
   * Whether to automatically purge data that exceeds the retention period
   * during deletion requests.
   *
   * @default false
   */
  autoPurge?: boolean

  /**
   * Data categories managed by this provider. Defaults to all categories.
   */
  categories?: DataCategory[]

  /**
   * Categories that must be retained for legal obligations regardless
   * of deletion requests. These categories are excluded from deletion
   * unless `retainLegalObligations` is explicitly set to `false`.
   *
   * @default ['billing']
   */
  legalObligationCategories?: DataCategory[]

  /**
   * Default legal basis for data processing when none is specified.
   *
   * @default 'consent'
   */
  defaultLegalBasis?: LegalBasis

  /**
   * Callback invoked when user data is collected, for custom data
   * source integration. Providers can register data collectors that
   * are called during data export.
   */
  dataCollectors?: DataCollector[]
}

/**
 * A function that collects user data for a specific category.
 */
export interface DataCollector {
  /** The data category this collector handles. */
  category: DataCategory

  /**
   * Collects data for the given user.
   *
   * @param userId - The user whose data to collect.
   * @returns The collected data.
   */
  collect(userId: string): Promise<unknown>
}
