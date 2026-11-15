import { type Component, createEffect, createSignal, onCleanup } from 'solid-js'

import { formatRelativeTime } from './formatRelativeTime.js'
import type { RelativeTimeProps } from './types.js'

/**
 * Live-updating relative time display ("5 minutes ago"). Re-computes on a
 * timer so the text stays accurate as the user leaves the page open.
 *
 * Pass `refreshMs={0}` for a one-shot render (cheaper in long lists; the
 * parent can provide a single ticker).
 *
 * This is the Solid counterpart of `@molecule/app-relative-time-react`: the
 * same props (React names) and the same DOM for the same input.
 *
 * @param props - Component props (see {@link RelativeTimeProps}).
 * @returns The rendered relative time.
 */
export const RelativeTime: Component<RelativeTimeProps> = (props) => {
  // The clock the last tick (or prop change) observed: the text reads it, so a
  // tick re-computes the text at the current time.
  const [clock, setClock] = createSignal(Date.now())

  createEffect(() => {
    const refreshMs = props.refreshMs ?? 60_000
    setClock(Date.now())
    if (refreshMs <= 0) return
    const id = setInterval(() => setClock(Date.now()), refreshMs)
    onCleanup(() => clearInterval(id))
  })

  /**
   * The `<time>` element's `datetime` value.
   * @returns The ISO string React writes.
   */
  const iso = (): string =>
    props.date instanceof Date
      ? props.date.toISOString()
      : typeof props.date === 'string'
        ? props.date
        : new Date(props.date).toISOString()

  /**
   * The absolute-date tooltip, when a `titleLocale` is given.
   * @returns The formatted date, or undefined for no `title` attribute.
   */
  const title = (): string | undefined =>
    props.titleLocale !== undefined
      ? new Intl.DateTimeFormat(props.titleLocale, {
          dateStyle: 'full',
          timeStyle: 'short',
        }).format(new Date(iso()))
      : undefined

  return (
    <time dateTime={iso()} title={title()} class={props.className}>
      {formatRelativeTime(props.date, clock(), props.locale)}
    </time>
  )
}
