/**
 * Render an ISO timestamp as a short relative string: "12m", "3h", "5d".
 *
 * Used by NotificationFeed to keep the timestamp tight enough to fit the
 * top-right corner of a feed row.
 *
 * @param iso ISO 8601 timestamp string
 * @returns short relative string (e.g. "12m", "3h", "5d")
 */
export function fmtRelativeShort(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  if (ms < 0) return '0m'
  const minutes = Math.floor(ms / 60_000)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  return `${days}d`
}
