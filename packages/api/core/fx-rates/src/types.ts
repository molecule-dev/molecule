/**
 * Type definitions for the fx-rates core interface.
 *
 * @module
 */

/**
 * ISO 4217 three-letter currency code (e.g. `'USD'`, `'EUR'`, `'JPY'`).
 *
 * Kept as a plain `string` alias rather than a string-literal union so
 * providers can support whatever set of currencies they expose. Use
 * {@link FxRatesProvider.listSupportedCurrencies} to discover what a given
 * provider supports at runtime.
 */
export type CurrencyCode = string

/**
 * A single FX rate quote: `1 unit of {@link from} = rate units of {@link to}`,
 * as observed at {@link asOf}.
 */
export interface FxRate {
  /**
   * Source currency (ISO 4217).
   */
  from: CurrencyCode

  /**
   * Target currency (ISO 4217).
   */
  to: CurrencyCode

  /**
   * Conversion ratio: `1 unit of {from} = rate units of {to}`.
   */
  rate: number

  /**
   * Timestamp the rate was observed/published.
   */
  asOf: Date
}

/**
 * A daily snapshot of reference rates, all expressed against a common pivot.
 */
export interface FxDailyRates {
  /**
   * The pivot currency the snapshot is quoted against
   * (e.g. `'EUR'` for ECB, `'USD'` for most paid feeds).
   */
  pivot: CurrencyCode

  /**
   * Date of the daily snapshot.
   */
  asOf: Date

  /**
   * Map from currency code to rate: `1 unit of pivot = rates[code] units of code`.
   * The pivot itself is conventionally included with rate `1`.
   */
  rates: Record<CurrencyCode, number>
}

/**
 * Options accepted by all FX-rates provider methods.
 */
export interface FxRatesOptions {
  /**
   * Date the rate should be observed at. Defaults to "latest"
   * if omitted. Implementations that do not support historical
   * lookups MAY throw if a non-latest date is requested.
   */
  asOf?: Date
}

/**
 * Foreign-exchange rates provider interface.
 *
 * All FX-rate providers (ECB, OpenExchange, fixtures, etc.) implement this
 * interface. The interface is deliberately minimal so providers with very
 * different upstream APIs can satisfy it identically.
 */
export interface FxRatesProvider {
  /**
   * Looks up the conversion rate `1 unit of from = rate units of to`.
   *
   * Implementations SHOULD compute cross-rates through their pivot when
   * neither side equals the pivot.
   *
   * @param from - Source currency (ISO 4217).
   * @param to - Target currency (ISO 4217).
   * @param options - Optional asOf date for historical rates.
   * @returns The conversion ratio as a plain number.
   */
  getRate(from: CurrencyCode, to: CurrencyCode, options?: FxRatesOptions): Promise<number>

  /**
   * Returns all reference rates the provider publishes for the given day,
   * normalized against the provider's pivot currency.
   *
   * @param options - Optional asOf date for the daily snapshot.
   * @returns The full daily snapshot.
   */
  getDailyRates(options?: FxRatesOptions): Promise<FxDailyRates>

  /**
   * Converts an integer minor-unit amount (e.g. cents) from one currency
   * to another, returning an integer minor-unit amount in the target.
   *
   * Implementations are expected to handle currencies with non-cent minor
   * units (e.g. JPY has 0 decimals) consistently with the inputs.
   *
   * @param amountMinor - Amount in minor units of {@link from} (e.g. cents).
   * @param from - Source currency (ISO 4217).
   * @param to - Target currency (ISO 4217).
   * @param options - Optional asOf date for historical rates.
   * @returns Converted amount in minor units of {@link to}.
   */
  convert(
    amountMinor: number,
    from: CurrencyCode,
    to: CurrencyCode,
    options?: FxRatesOptions,
  ): Promise<number>

  /**
   * Lists every currency the provider currently supports.
   *
   * @returns Array of ISO 4217 currency codes the provider can quote.
   */
  listSupportedCurrencies(): Promise<CurrencyCode[]>
}
