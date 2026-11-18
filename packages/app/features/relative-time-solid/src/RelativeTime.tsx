import { type Component, createEffect, createSignal, onCleanup } from 'solid-js'

import { useLocale } from '@molecule/app-solid'

import { formatRelativeTime } from './formatRelativeTime.js'
import type { RelativeTimeProps } from './types.js'

/**
 * Live-updating relative time display ("5 minutes ago"). Re-computes on a
 * timer so the text stays accurate as the user leaves the page open.
 *
 * Without a `locale` prop the label formats in the app's active locale
 * (`useLocale()`), so a locale switch re-words it at once; an explicit
 * `locale` still wins.
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
  // Re-renders on a locale switch, so the label changes language at once.
  // An explicit `locale` prop still wins.
  const activeLocale = useLocale()
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
      {formatRelativeTime(props.date, clock(), props.locale ?? activeLocale())}
    </time>
  )
}
