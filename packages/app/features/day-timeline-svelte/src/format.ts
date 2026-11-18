/**
 * Hour formatting for the day timeline — ported from
 * `@molecule/app-day-timeline-react`'s `formatHour`.
 *
 * @module
 */

/**
 * Format a fractional 24h hour as `H AM/PM` (e.g. `9.5` → `9:30 AM`).
 *
 * @param hour - Fractional 24h hour value.
 * @returns A short clock-style label.
 */
export function formatHour(hour: number): string {
  const hh = Math.floor(hour)
  const mm = Math.round((hour - hh) * 60)
  const period = hh >= 12 ? 'PM' : 'AM'
  const display = ((hh + 11) % 12) + 1
  return mm === 0 ? `${display} ${period}` : `${display}:${String(mm).padStart(2, '0')} ${period}`
}
