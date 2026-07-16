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
   * NOT IMPLEMENTED — currently ignored by the provider (no purging logic
   * consumes it). Reserved for a future retention sweep.
   *
   * @default 365
   */
  retentionDays?: number

  /**
   * NOT IMPLEMENTED — currently ignored by the provider; no automatic
   * purging occurs regardless of this setting.
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
 *
 * NOTE: collectors are read-only — they are invoked by `exportUserData()`
 * only and are NOT invoked during deletion.
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
