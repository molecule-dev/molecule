import type React from 'react'
import { useEffect, useState } from 'react'

import { useLocale } from '@molecule/app-react'

import { formatRelativeTime } from './formatRelativeTime.js'

/** Props accepted by the {@link RelativeTime} component. */
export interface RelativeTimeProps {
  /** ISO string, Date, or epoch ms. */
  date: Date | string | number
  /**
   * Locale override. Defaults to the app's active locale (`useLocale()`), so the
   * label follows a locale switch; an explicit `locale` still wins.
   */
  locale?: string
  /** Auto-refresh interval (ms). Defaults to 60_000 (1 min). Set 0 to disable. */
  refreshMs?: number
  /** When provided, renders the absolute date in a `title` attribute for hover tooltip. */
  titleLocale?: string
  /** Extra classes (applies to the surrounding `<time>` element). */
  className?: string
}

/**
 * Live-updating relative time display ("5 minutes ago"). Re-computes on
 * a timer so the text stays accurate as the user leaves the page open.
 *
 * Without a `locale` prop the label formats in the app's active locale
 * (`useLocale()`), so a locale switch re-words it at once; an explicit
 * `locale` still wins.
 *
 * Pass `refreshMs={0}` for a one-shot render (cheaper in long lists). The
 * clock is then taken once at mount and only the component's own interval
 * advances it, so a parent that re-renders the label does not refresh it —
 * give the element a `key` that changes on the parent's tick if every row
 * must share one clock (remount re-takes "now").
 * @param props - Component props (see {@link RelativeTimeProps}).
 */
export function RelativeTime({
  date,
  locale,
  refreshMs = 60_000,
  titleLocale,
  className,
}: RelativeTimeProps): React.JSX.Element {
  // Re-renders on a locale switch, so the label changes language at once.
  const activeLocale = useLocale()
  // "Now" is state, not a render-time `Date.now()`: the interval below advances
  // it, and a render (a locale switch, a parent update) keeps the committed
  // clock. It is taken once per mount and refreshed on the caller's interval.
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (refreshMs <= 0) return
    const id = setInterval(() => setNow(Date.now()), refreshMs)
    return () => clearInterval(id)
  }, [refreshMs])
  const iso =
    date instanceof Date
      ? date.toISOString()
      : typeof date === 'string'
        ? date
        : new Date(date).toISOString()
  const titleFmt =
    titleLocale !== undefined
      ? new Intl.DateTimeFormat(titleLocale, { dateStyle: 'full', timeStyle: 'short' }).format(
          new Date(iso),
        )
      : undefined
  return (
    <time dateTime={iso} title={titleFmt} className={className}>
      {formatRelativeTime(date, now, locale ?? activeLocale)}
    </time>
  )
}
