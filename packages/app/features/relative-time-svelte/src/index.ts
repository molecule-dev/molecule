/**
 * Svelte relative-time formatting.
 *
 * Exports:
 * - `formatRelativeTime(date, now?, locale?)` — utility using Intl.RelativeTimeFormat.
 * - `RelativeTime` — live-updating component ("5 minutes ago").
 *
 * It is the Svelte counterpart of `@molecule/app-relative-time-react`: the same
 * export names, the same props (React names) and the same DOM for the same
 * input.
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { RelativeTime, formatRelativeTime } from '@molecule/app-relative-time-svelte'
 *
 *   const label = formatRelativeTime('2024-06-01T10:00:00Z', Date.now(), 'en-US')
 * </script>
 *
 * <!-- Component — auto-refreshes every minute -->
 * <RelativeTime date="2024-06-01T10:00:00Z" locale="en-US" titleLocale="en-US" />
 * ```
 *
 * @remarks
 * - Zero molecule wiring required — no ClassMap, no bonds; safe in any Svelte
 *   tree. `RelativeTime` reads the app's active i18n locale through
 *   `useLocale()` (a default English provider serves when none is bonded).
 * - `RelativeTime` props: `date` (Date | ISO string | epoch ms), `locale?`,
 *   `refreshMs?` (default 60000 — pass `0` to disable the per-instance timer,
 *   cheaper in long lists), `titleLocale?` (adds an absolute-date `title`
 *   tooltip, formatted in that locale), `className?`.
 * - `locale` defaults to the app's active i18n locale (`useLocale()`), so the
 *   label follows a locale switch; an explicit `locale` prop still wins.
 * - When `Intl.RelativeTimeFormat` is unavailable, fallback strings
 *   ("just now", "5m ago") are English-only.
 *
 * @module
 */

export * from './components.js'
export * from './formatRelativeTime.js'
export * from './types.js'
