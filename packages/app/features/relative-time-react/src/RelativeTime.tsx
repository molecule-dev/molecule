import type React from 'react'
import { useEffect, useState } from 'react'

import { formatRelativeTime } from './formatRelativeTime.js'

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

/**
 * Live-updating relative time display ("5 minutes ago"). Re-computes on
 * a timer so the text stays accurate as the user leaves the page open.
 *
 * Pass `refreshMs={0}` for a one-shot render (cheaper in long lists;
 * the parent can provide a single ticker).
 * @param props - Component props (see {@link RelativeTimeProps}).
 */
export function RelativeTime({
  date,
  locale,
  refreshMs = 60_000,
  titleLocale,
  className,
}: RelativeTimeProps): React.JSX.Element {
  const [, setTick] = useState(0)
  useEffect(() => {
    if (refreshMs <= 0) return
    const id = setInterval(() => setTick((x) => x + 1), refreshMs)
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
      {formatRelativeTime(date, Date.now(), locale)}
    </time>
  )
}
