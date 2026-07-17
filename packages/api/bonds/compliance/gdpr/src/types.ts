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
   * Data collectors for custom data-source integration, one per category.
   * `collect()` feeds `exportUserData()`; the optional `delete()` hook is
   * what makes `deleteUserData()` actually erase that category's data. A
   * category with no delete-capable collector is NOT erased and cannot be
   * reported as deleted.
   */
  dataCollectors?: DataCollector[]
}

/**
 * Bridges the provider to a real data source for one data category.
 *
 * `collect()` is invoked by `exportUserData()`. `delete()`, if implemented,
 * is invoked by `deleteUserData()` to actually erase the user's data for
 * this category — without it, that category is left in place and reported
 * as skipped (never as a false `'completed'`).
 */
export interface DataCollector {
  /** The data category this collector handles. */
  category: DataCategory

  /**
   * Collects data for the given user (used by `exportUserData()`).
   *
   * @param userId - The user whose data to collect.
   * @returns The collected data.
   */
  collect(userId: string): Promise<unknown>

  /**
   * Erases this collector's data for the given user (used by
   * `deleteUserData()`).
   *
   * OPTIONAL so existing collect-only collectors keep compiling — but a
   * collector WITHOUT this hook cannot be erased: `deleteUserData()` will
   * not count its category as deleted and will report a non-`'completed'`
   * status. Implement it to make right-to-erasure real. It should be
   * idempotent; a rejection propagates out of `deleteUserData()` (the call
   * fails loudly rather than claiming success) and the caller may retry.
   *
   * @param userId - The user whose data to erase.
   * @returns Resolves once this category's data has been erased.
   */
  delete?(userId: string): Promise<void>
}
