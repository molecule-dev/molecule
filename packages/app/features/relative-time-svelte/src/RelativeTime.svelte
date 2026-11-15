<script lang="ts">
  import { formatRelativeTime } from './formatRelativeTime.js'
  import type { RelativeTimeProps } from './types.js'

  let { date, locale, refreshMs = 60_000, titleLocale, className }: RelativeTimeProps = $props()

  // The clock the last tick (or prop change) observed: the text reads it, so a
  // tick re-computes the text at the current time.
  let clock = $state(Date.now())

  $effect(() => {
    clock = Date.now()
    if (refreshMs <= 0) return
    const id = setInterval(() => {
      clock = Date.now()
    }, refreshMs)
    return () => clearInterval(id)
  })

  const iso = $derived(
    date instanceof Date
      ? date.toISOString()
      : typeof date === 'string'
        ? date
        : new Date(date).toISOString(),
  )
  const title = $derived(
    titleLocale !== undefined
      ? new Intl.DateTimeFormat(titleLocale, { dateStyle: 'full', timeStyle: 'short' }).format(
          new Date(iso),
        )
      : undefined,
  )
  const text = $derived(formatRelativeTime(date, clock, locale))
</script>

<time datetime={iso} {title} class={className}>{text}</time>
