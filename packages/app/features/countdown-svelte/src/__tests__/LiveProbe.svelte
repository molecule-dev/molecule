<!--
  Test probe: calls `useCountdown` during component init and renders its state
  as JSON for inspection, with a store per argument so a test can change them on
  the same mount — the live counterpart of `Probe.svelte`. `nonce` is an
  unrelated store: setting it re-renders the probe without touching the hook's
  arguments, the way React's `rerender()` re-renders with unchanged props.
-->
<script lang="ts">
  import { untrack } from 'svelte'
  import type { Readable } from 'svelte/store'

  import { useCountdown } from '../useCountdown.js'

  let {
    target,
    tick,
    nonce,
    onready,
  }: {
    /** The target the hook follows. */
    target: Readable<number>
    /** The refresh interval the hook follows. */
    tick: Readable<number>
    /** An unrelated store the markup reads, for a re-render on demand. */
    nonce: Readable<number>
    /** Receives the hook's result once, at init. */
    onready?: (countdown: ReturnType<typeof useCountdown>) => void
  } = $props()

  // One countdown for the component's life; the stores carry later changes.
  const countdown = useCountdown(
    untrack(() => target),
    untrack(() => tick),
  )
  const { days, hours, minutes, seconds, msRemaining, expired } = countdown
  const marker = untrack(() => nonce)
  untrack(() => onready?.(countdown))
  const state = $derived(
    JSON.stringify({
      days: $days,
      hours: $hours,
      minutes: $minutes,
      seconds: $seconds,
      msRemaining: $msRemaining,
      expired: $expired,
    }),
  )
</script>

<span data-state>{state}</span>
<span data-render>{$marker}</span>
