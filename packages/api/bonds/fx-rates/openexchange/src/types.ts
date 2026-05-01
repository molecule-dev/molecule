/**
 * OpenExchangeRates FX-rates provider configuration types.
 *
 * @module
 */

import type { CurrencyCode } from '@molecule/api-fx-rates'

/**
 * Configuration options for the OpenExchangeRates FX-rates provider.
 *
 * The OpenExchangeRates API requires an `app_id` for every request. The
 * default singleton reads it from `OPENEXCHANGE_APP_ID`. Free-tier accounts
 * are locked to `base='USD'`; paid plans may override it.
 */
export interface OpenExchangeFxRatesConfig {
  /**
   * OpenExchangeRates app ID. Required at request time. If omitted, the
   * provider falls back to `process.env['OPENEXCHANGE_APP_ID']`.
   */
  appId?: string

  /**
   * Pivot currency to request from the upstream. Free-tier accounts MUST
   * leave this as the default `'USD'`; paid plans may set any currency
   * that the upstream supports. Defaults to `'USD'`.
   */
  base?: CurrencyCode

  /**
   * Base URL override. Defaults to `'https://openexchangerates.org/api'`.
   */
  baseUrl?: string

  /**
   * Request timeout in milliseconds. Defaults to `10000`.
   */
  timeout?: number

  /**
   * TTL for the in-memory cache of parsed snapshots, in milliseconds.
   * Defaults to `3_600_000` (1 hour). Set to `0` to disable internal caching.
   *
   * If the `'cache'` bond is registered, snapshots are also written through
   * to it with the equivalent TTL in seconds.
   */
  cacheTtlMs?: number
}

/**
 * A single dated snapshot of pivot rates parsed from `latest.json` or
 * `historical/YYYY-MM-DD.json`. The pivot itself is included with rate `1`.
 */
export interface OpenExchangeSnapshot {
  /**
   * The publication time of the snapshot (UTC).
   */
  asOf: Date

  /**
   * Pivot currency the snapshot is quoted against (e.g. `'USD'`).
   */
  base: CurrencyCode

  /**
   * Map from currency code to rate, where `1 base = rates[code] units of code`.
   * Always contains the `base` entry with rate `1`.
   */
  rates: Record<CurrencyCode, number>
}
