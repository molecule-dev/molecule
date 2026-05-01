/**
 * ECB FX-rates provider configuration types.
 *
 * @module
 */

/**
 * Configuration options for the ECB FX-rates provider.
 *
 * The European Central Bank's daily and 90-day-history reference-rate XML
 * feeds (`https://www.ecb.europa.eu/stats/eurofxref/`) are keyless and free,
 * so every field is optional.
 */
export interface EcbFxRatesConfig {
  /**
   * Base URL override. Defaults to `'https://www.ecb.europa.eu/stats/eurofxref'`.
   */
  baseUrl?: string

  /**
   * Daily-feed XML filename. Defaults to `'eurofxref-daily.xml'`. Used when
   * the caller does not request an `asOf` date or requests a date the daily
   * snapshot already covers.
   */
  dailyPath?: string

  /**
   * Historical 90-day-feed XML filename. Defaults to
   * `'eurofxref-hist-90d.xml'`. Used when the caller requests an `asOf` date
   * older than the latest snapshot.
   */
  historicalPath?: string

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
 * A single daily snapshot of EUR-pivot reference rates parsed from the ECB
 * XML feed. The pivot (`EUR`) itself is included with rate `1`.
 */
export interface EcbDailySnapshot {
  /**
   * The publication date of the snapshot (UTC midnight on the publication day).
   */
  asOf: Date

  /**
   * Map from currency code to rate, where `1 EUR = rates[code] units of code`.
   * Always contains the `EUR` entry with rate `1`.
   */
  rates: Record<string, number>
}
