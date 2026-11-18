/**
 * Vue live-updating relative time display: the counterpart of
 * `@molecule/app-relative-time-react`'s `RelativeTime`, with the same props
 * (React names) and the same DOM for the same input.
 *
 * @module
 */

import { defineComponent, h, onBeforeUnmount, ref, type VNode, watch } from 'vue'

import { useLocale } from '@molecule/app-vue'

import { formatRelativeTime } from './formatRelativeTime.js'

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
 * @param props - Component props (see {@link RelativeTimeProps}).
 * @returns The relative time component.
 */
export const RelativeTime = defineComponent({
  name: 'RelativeTime',
  props: {
    date: { type: [Date, String, Number], required: true },
    /** Locale override; defaults to the app's active locale (`useLocale()`). */
    locale: String,
    refreshMs: { type: Number, default: 60_000 },
    titleLocale: String,
    className: String,
  },
  setup(props) {
    // Re-renders on a locale switch, so the label changes language at once.
    // An explicit `locale` prop still wins.
    const activeLocale = useLocale()
    // The clock the last tick (or prop change) observed: reading it in the
    // render function is what makes an interval tick re-render the text.
    const clock = ref(Date.now())
    let interval: ReturnType<typeof setInterval> | undefined

    /** Stops the running refresh interval, when one is running. */
    const stop = (): void => {
      if (interval !== undefined) clearInterval(interval)
      interval = undefined
    }

    watch(
      () => props.refreshMs,
      (refreshMs) => {
        stop()
        clock.value = Date.now()
        if (refreshMs <= 0) return
        interval = setInterval(() => {
          clock.value = Date.now()
        }, refreshMs)
      },
      { immediate: true },
    )

    onBeforeUnmount(stop)

    return (): VNode => {
      const { date, locale, titleLocale, className } = props
      const iso =
        date instanceof Date
          ? date.toISOString()
          : typeof date === 'string'
            ? date
            : new Date(date).toISOString()
      const title =
        titleLocale !== undefined
          ? new Intl.DateTimeFormat(titleLocale, { dateStyle: 'full', timeStyle: 'short' }).format(
              new Date(iso),
            )
          : undefined
      return h(
        'time',
        { datetime: iso, title, class: className },
        formatRelativeTime(date, clock.value, locale ?? activeLocale.value),
      )
    }
  },
})
