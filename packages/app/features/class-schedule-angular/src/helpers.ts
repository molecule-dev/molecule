/**
 * Lane layout and time formatting for the weekly class-schedule grid.
 *
 * Both helpers are plain framework-neutral functions, ported verbatim from
 * `@molecule/app-class-schedule-react` so every framework package exports the
 * same values for the same input.
 *
 * @module
 */

/** Minutes in one hour. */
const MINUTES_PER_HOUR = 60

/**
 * Format a minute-of-day value (0–1440) as `HH:MM` 24-hour clock.
 *
 * @param minutes - Minutes from midnight.
 * @returns Zero-padded `HH:MM` string.
 */
export function formatHourLabel(minutes: number): string {
  const h = Math.floor(minutes / MINUTES_PER_HOUR)
  const m = minutes % MINUTES_PER_HOUR
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/**
 * Lay out events that share a weekday into non-overlapping side-by-side
 * lanes. Each event gets a `lane` index (0…N) and a `lanes` count for the
 * group it belongs to so the caller can compute width/left as
 * `width = (1/lanes) * 100%` / `left = (lane/lanes) * 100%`.
 *
 * @param events - Events occurring on a single weekday.
 * @returns Array of `{ event, lane, lanes }` records, in input order.
 */
export function assignLanes<E extends { start: number; end: number }>(
  events: E[],
): Array<{ event: E; lane: number; lanes: number }> {
  const sorted = events
    .map((event, originalIndex) => ({ event, originalIndex }))
    .sort((a, b) => a.event.start - b.event.start || a.event.end - b.event.end)

  // Greedy lane assignment per overlap group.
  type Assigned = { event: E; lane: number; originalIndex: number }
  const groups: Assigned[][] = []
  let current: Assigned[] = []
  let currentMaxEnd = -Infinity
  for (const { event, originalIndex } of sorted) {
    if (event.start >= currentMaxEnd && current.length > 0) {
      groups.push(current)
      current = []
      currentMaxEnd = -Infinity
    }
    // Find lowest free lane in `current`.
    const taken = new Set(current.filter((a) => a.event.end > event.start).map((a) => a.lane))
    let lane = 0
    while (taken.has(lane)) lane++
    current.push({ event, lane, originalIndex })
    if (event.end > currentMaxEnd) currentMaxEnd = event.end
  }
  if (current.length > 0) groups.push(current)

  const result: Array<{ event: E; lane: number; lanes: number; originalIndex: number }> = []
  for (const group of groups) {
    const lanes = group.reduce((max, a) => Math.max(max, a.lane + 1), 1)
    for (const a of group) result.push({ ...a, lanes })
  }
  result.sort((a, b) => a.originalIndex - b.originalIndex)
  return result.map(({ event, lane, lanes }) => ({ event, lane, lanes }))
}
