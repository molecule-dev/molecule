/**
 * Configuration for the default date range picker provider.
 *
 * @module
 */

/**
 * Provider-specific configuration options.
 *
 * There is intentionally no `locale` field: this default provider is a pure
 * value store of `Date` objects and produces no formatted/labelled output, so a
 * locale knob would be inert. Format displayed dates in your rendering layer via
 * `@molecule/app-i18n`.
 */
export interface DefaultDateRangeConfig {
  /**
   * Provider-wide default for single-date mode. When `true`, every picker that
   * does not pass its own `options.singleDate` collapses a selection to a
   * single-day range (`startDate === endDate`). Defaults to `false`.
   */
  singleDate?: boolean
}
