/**
 * The number part of each EXIF notation, without its prefix or unit.
 *
 * `format.ts` joins these digits with the canonical English prefix / unit
 * (`f/`, `s`, `ISO`, `mm`) for callers that want the plain notation. The
 * components instead pass them to `t()` as the `{{value}}` of an
 * `exifPanel.value.*` key, so a locale re-words the unit around the digits
 * (Japanese `{{value}}秒`) while the digits stay this helper's.
 *
 * Internal to the panel — not part of the package's public exports.
 *
 * @module
 */

/**
 * The digits of a quantity rounded to one decimal, a whole number's
 * trailing `.0` dropped.
 *
 * @param value - A validated, positive quantity.
 * @returns Its digit text, e.g. `"2.8"`, `"50"`.
 */
const digits = (value: number): string => {
  const rounded = Math.round(value * 10) / 10
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)
}

/**
 * The guard every quantity shares: a finite number above zero.
 *
 * @param value - The raw EXIF quantity.
 * @returns The number, or `null` when it is missing / invalid.
 */
const positive = (value: number | undefined): number | null => {
  if (value === undefined || value === null) return null
  if (!Number.isFinite(value) || value <= 0) return null
  return value
}

/**
 * The f-number of an aperture as digits, without the `f/`.
 *
 * @param fNumber - The aperture value (e.g. `2.8`, `5.6`, `8`).
 * @returns A digit string like `"2.8"` or `"8"`, or `null` when the input
 *   is missing / invalid.
 */
export function formatApertureNumber(fNumber: number | undefined): string | null {
  const value = positive(fNumber)
  return value === null ? null : digits(value)
}

/**
 * A shutter / exposure time as digits, without the `s`. Sub-second times
 * render as a `1/x` reciprocal with the denominator rounded; longer
 * exposures stay in seconds.
 *
 * @param seconds - Exposure time in seconds.
 * @returns A digit string like `"1/125"`, `"2.5"` or `"30"`, or `null`
 *   when the input is missing / invalid.
 */
export function formatShutterNumber(seconds: number | undefined): string | null {
  const value = positive(seconds)
  if (value === null) return null
  if (value >= 1) return digits(value)
  // Round the reciprocal denominator to nearest integer for sub-second.
  return `1/${Math.round(1 / value)}`
}

/**
 * An ISO sensitivity as digits, without the `ISO` prefix.
 *
 * @param iso - The ISO value (e.g. `100`, `1600`).
 * @returns A digit string like `"1600"`, or `null` when missing.
 */
export function formatIsoNumber(iso: number | undefined): string | null {
  const value = positive(iso)
  return value === null ? null : String(Math.round(value))
}

/**
 * A focal length as digits, without the `mm`.
 *
 * @param mm - Focal length in millimetres.
 * @returns A digit string like `"50"` or `"35.5"`, or `null` when the
 *   input is missing / invalid.
 */
export function formatFocalLengthNumber(mm: number | undefined): string | null {
  const value = positive(mm)
  return value === null ? null : digits(value)
}
