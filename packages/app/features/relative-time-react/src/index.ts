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
 * @remarks
 * - Zero molecule wiring required — no ClassMap, no i18n provider, no bonds;
 *   safe in any React tree.
 * - `<RelativeTime>` props: `date` (Date | ISO string | epoch ms), `locale?`,
 *   `refreshMs?` (default 60000 — pass `0` to disable the per-instance timer,
 *   cheaper in long lists), `titleLocale?` (adds an absolute-date `title`
 *   tooltip), `className?`.
 * - `locale` defaults to the runtime's locale, NOT your app's i18n locale —
 *   pass the active locale explicitly for consistent localized output.
 * - When `Intl.RelativeTimeFormat` is unavailable, fallback strings
 *   ("just now", "5m ago") are English-only.
 *
 * @module
 */

export * from './formatRelativeTime.js'
export * from './RelativeTime.js'
