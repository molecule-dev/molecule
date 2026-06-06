/**
 * React relative-time formatting.
 *
 * Exports:
 * - `formatRelativeTime(date, now?, locale?)` — utility using Intl.RelativeTimeFormat.
 * - `<RelativeTime>` — live-updating component ("5 minutes ago").
 *
 * @example
 * ```tsx
 * import { RelativeTime, formatRelativeTime } from '@molecule/app-relative-time-react'
 *
 * // Component — auto-refreshes every minute
 * <RelativeTime date="2024-06-01T10:00:00Z" titleLocale="en-US" />
 *
 * // Utility — one-shot formatting
 * const label = formatRelativeTime('2024-06-01T10:00:00Z', Date.now(), 'en-US')
 * // → "5 minutes ago"
 * ```
 *
 * @module
 */

export * from './formatRelativeTime.js'
export * from './RelativeTime.js'
