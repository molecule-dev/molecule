/**
 * Duration label formatting for the waterfall's axis ticks and row badges.
 *
 * @module
 */

/**
 * Format a duration value (in the same unit as `Span.startTime`) as a
 * short, human-readable string: `< 1` → microseconds, `< 1000` → ms,
 * otherwise seconds with one decimal.
 *
 * @param value - The numeric value to format.
 * @returns A short label string.
 */
export function formatDurationLabel(value: number): string {
  if (!Number.isFinite(value) || value < 0) return '0ms'
  if (value < 1) return `${Math.round(value * 1000)}µs`
  if (value < 1000) return `${Math.round(value * 100) / 100}ms`
  return `${Math.round(value / 100) / 10}s`
}

/**
 * The unit a duration label names: microseconds (`< 1`), milliseconds
 * (`< 1000`) or seconds.
 */
export type DurationUnit = 'us' | 'ms' | 's'

/**
 * The translation function the duration label helpers need — the shape of the
 * `t` a framework binding's `useTranslation()` / `useT()` returns.
 */
export type DurationLabelTranslator = (
  key: string,
  values?: Record<string, string | number>,
  options?: { defaultValue?: string },
) => string

/** A duration split for translation: which unit its label names, and the number. */
export interface DurationParts {
  /** The unit the label names. */
  unit: DurationUnit
  /**
   * The duration rounded to the unit, as an `Intl.NumberFormat` string in
   * `locale` (no grouping, up to two decimals — exactly the digits the
   * English labels carry).
   */
  value: string
}

/** Number options that reproduce the English labels' digits in every locale. */
const DURATION_NUMBER_OPTIONS: Intl.NumberFormatOptions = {
  useGrouping: false,
  maximumFractionDigits: 2,
}

/**
 * Format the number of a duration label in a locale.
 *
 * @param value - The already-rounded duration in its unit.
 * @param locale - The locale to format in.
 * @returns The number as an `Intl.NumberFormat` string.
 */
function formatDurationNumber(value: number, locale: string): string {
  return new Intl.NumberFormat(locale, DURATION_NUMBER_OPTIONS).format(value)
}

/**
 * Split a duration value (in the same unit as `Span.startTime`) for
 * translation: the unit its label names — `< 1` → microseconds, `< 1000` →
 * ms, otherwise seconds — and the number in that unit, formatted in `locale`
 * so it follows a locale switch. Pair the result with
 * {@link translateDuration}, which renders it through `t()`.
 *
 * @param value - The numeric value to split.
 * @param locale - The locale to format the number in.
 * @returns The unit and the formatted number.
 */
export function formatDurationParts(value: number, locale: string): DurationParts {
  if (!Number.isFinite(value) || value < 0)
    return { unit: 'ms', value: formatDurationNumber(0, locale) }
  if (value < 1)
    return { unit: 'us', value: formatDurationNumber(Math.round(value * 1000), locale) }
  if (value < 1000)
    return { unit: 'ms', value: formatDurationNumber(Math.round(value * 100) / 100, locale) }
  return { unit: 's', value: formatDurationNumber(Math.round(value / 100) / 10, locale) }
}

/**
 * A duration label for the axis ticks and the row badges: the unit and the
 * number in the app's active locale go through `t()` as one string, so the
 * label follows a locale switch (and the pseudo-locale check sees it). The
 * keys are `traceWaterfall.duration.us` / `.ms` / `.s` in the
 * `@molecule/app-locales-trace-waterfall` bond.
 *
 * @param value - The numeric value to label.
 * @param locale - The app's active locale.
 * @param t - The translation function.
 * @returns The label in the active locale.
 */
export function translateDuration(
  value: number,
  locale: string,
  t: DurationLabelTranslator,
): string {
  const parts = formatDurationParts(value, locale)
  if (parts.unit === 'us')
    return t('traceWaterfall.duration.us', { value: parts.value }, { defaultValue: '{{value}}µs' })
  if (parts.unit === 'ms')
    return t('traceWaterfall.duration.ms', { value: parts.value }, { defaultValue: '{{value}}ms' })
  return t('traceWaterfall.duration.s', { value: parts.value }, { defaultValue: '{{value}}s' })
}
