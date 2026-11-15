/**
 * Types of `@molecule/app-relative-time-angular` — the Angular counterpart of
 * `@molecule/app-relative-time-react`, with the same props and DOM.
 *
 * @module
 */

/** Props accepted by the {@link RelativeTime} component. */
export interface RelativeTimeProps {
  /** ISO string, Date, or epoch ms. */
  date: Date | string | number
  /** Locale override. */
  locale?: string
  /** Auto-refresh interval (ms). Defaults to 60_000 (1 min). Set 0 to disable. */
  refreshMs?: number
  /** When provided, renders the absolute date in a `title` attribute for hover tooltip. */
  titleLocale?: string
  /** Extra classes (applies to the surrounding `<time>` element). */
  className?: string
}
