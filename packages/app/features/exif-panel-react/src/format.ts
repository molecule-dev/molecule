/**
 * Pure string-formatting helpers for EXIF values.
 *
 * Kept separate from the React component so they can be unit-tested
 * without a DOM and reused by callers that want the formatted strings
 * for non-rendering purposes (alt text, share captions, etc.).
 *
 * @module
 */

/**
 * Format an aperture f-number as `f/N` with one decimal place dropped
 * when whole.
 *
 * @param fNumber - The aperture value (e.g. `2.8`, `5.6`, `8`).
 * @returns A display string like `"f/2.8"` or `"f/8"`, or `null` when
 *   the input is missing / invalid.
 */
export function formatAperture(fNumber: number | undefined): string | null {
  if (fNumber === undefined || fNumber === null) return null
  if (!Number.isFinite(fNumber) || fNumber <= 0) return null
  // Drop trailing ".0" for whole stops; otherwise keep one decimal.
  const rounded = Math.round(fNumber * 10) / 10
  const text = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)
  return `f/${text}`
}

/**
 * Format a shutter / exposure time in seconds as a human-readable
 * string. Sub-second times are rendered as a `1/x s` reciprocal with
 * the denominator rounded; longer exposures stay in seconds.
 *
 * @param seconds - Exposure time in seconds.
 * @returns A display string like `"1/125 s"` or `"2 s"`, or `null` when
 *   the input is missing / invalid.
 */
export function formatShutter(seconds: number | undefined): string | null {
  if (seconds === undefined || seconds === null) return null
  if (!Number.isFinite(seconds) || seconds <= 0) return null
  if (seconds >= 1) {
    const rounded = Math.round(seconds * 10) / 10
    const text = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)
    return `${text} s`
  }
  // Round the reciprocal denominator to nearest integer for sub-second.
  const denom = Math.round(1 / seconds)
  return `1/${denom} s`
}

/**
 * Format an ISO sensitivity as `ISO N`.
 *
 * @param iso - The ISO value (e.g. `100`, `1600`).
 * @returns A display string like `"ISO 1600"`, or `null` when missing.
 */
export function formatIso(iso: number | undefined): string | null {
  if (iso === undefined || iso === null) return null
  if (!Number.isFinite(iso) || iso <= 0) return null
  return `ISO ${Math.round(iso)}`
}

/**
 * Format a focal length value as `N mm`.
 *
 * @param mm - Focal length in millimetres.
 * @returns A display string like `"50 mm"`, or `null` when missing.
 */
export function formatFocalLength(mm: number | undefined): string | null {
  if (mm === undefined || mm === null) return null
  if (!Number.isFinite(mm) || mm <= 0) return null
  const rounded = Math.round(mm * 10) / 10
  const text = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)
  return `${text} mm`
}

/**
 * Format a single GPS coordinate (latitude or longitude) as
 * deg/min/sec with a hemisphere suffix.
 *
 * @param value - Signed decimal degrees.
 * @param axis - Which axis the value represents — picks `N`/`S` vs `E`/`W`.
 * @returns A string like `"37° 25' 19.07" N"`, or `null` when missing.
 */
export function formatDms(
  value: number | undefined,
  axis: 'lat' | 'lon',
): string | null {
  if (value === undefined || value === null) return null
  if (!Number.isFinite(value)) return null
  const positiveLabel = axis === 'lat' ? 'N' : 'E'
  const negativeLabel = axis === 'lat' ? 'S' : 'W'
  const hemisphere = value >= 0 ? positiveLabel : negativeLabel
  const abs = Math.abs(value)
  const deg = Math.floor(abs)
  const minutesFloat = (abs - deg) * 60
  const min = Math.floor(minutesFloat)
  const seconds = (minutesFloat - min) * 60
  const secText = (Math.round(seconds * 100) / 100).toFixed(2)
  return `${deg}° ${min}' ${secText}" ${hemisphere}`
}

/**
 * Format a GPS coordinate pair as a single deg/min/sec string.
 *
 * @param latitude - Latitude in signed decimal degrees.
 * @param longitude - Longitude in signed decimal degrees.
 * @returns A combined string like `"37° 25' 19.07" N, 122° 5' 4.16" W"`,
 *   or `null` if either value is missing.
 */
export function formatGps(
  latitude: number | undefined,
  longitude: number | undefined,
): string | null {
  const lat = formatDms(latitude, 'lat')
  const lon = formatDms(longitude, 'lon')
  if (!lat || !lon) return null
  return `${lat}, ${lon}`
}

/**
 * Build an OpenStreetMap link URL for a GPS coordinate pair.
 *
 * @param latitude - Latitude in signed decimal degrees.
 * @param longitude - Longitude in signed decimal degrees.
 * @returns An `https://www.openstreetmap.org/?...` URL, or `null` when
 *   either input is missing.
 */
export function buildMapLink(
  latitude: number | undefined,
  longitude: number | undefined,
): string | null {
  if (latitude === undefined || longitude === undefined) return null
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null
  const lat = latitude.toFixed(6)
  const lon = longitude.toFixed(6)
  return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=15/${lat}/${lon}`
}

/**
 * Format an EXIF capture timestamp. Accepts `Date`, ISO string, or
 * epoch milliseconds and renders via `toLocaleString` so the result
 * respects the host environment's locale and timezone.
 *
 * @param value - The timestamp value pulled from EXIF.
 * @returns A locale-formatted date/time string, or `null` when missing
 *   or unparseable.
 */
export function formatTimestamp(
  value: Date | string | number | undefined,
): string | null {
  if (value === undefined || value === null) return null
  let date: Date
  if (value instanceof Date) {
    date = value
  } else if (typeof value === 'number') {
    date = new Date(value)
  } else {
    date = new Date(value)
  }
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleString()
}

/**
 * Compose camera make + model into a single `"Make Model"` string,
 * collapsing duplication when the model already starts with the make
 * (Sony often does this).
 *
 * @param make - Camera manufacturer.
 * @param model - Camera model.
 * @returns The combined label, or `null` when both inputs are missing.
 */
export function formatCamera(
  make: string | undefined,
  model: string | undefined,
): string | null {
  const m = make?.trim()
  const md = model?.trim()
  if (!m && !md) return null
  if (!md) return m ?? null
  if (!m) return md
  // Avoid "Sony Sony a7 III" when model already starts with make.
  if (md.toLowerCase().startsWith(m.toLowerCase())) return md
  return `${m} ${md}`
}
