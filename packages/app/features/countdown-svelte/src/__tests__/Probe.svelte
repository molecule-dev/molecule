<!--
  Test probe: calls `useCountdown` during component init (where Svelte's
  lifecycle hooks work) and renders its state as JSON for inspection.
-->
<script lang="ts">
  import { untrack } from 'svelte'

  import { useCountdown } from '../useCountdown.js'

  let { target }: { target: number } = $props()

  // The probe mounts once per target; reading it untracked is the point.
  const { days, hours, minutes, seconds, msRemaining, expired } = useCountdown(
    untrack(() => target),
  )
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
