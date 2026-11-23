<!--
  Countdown: the Svelte counterpart of `@molecule/app-countdown-react`'s
  `Countdown` — the same props (React names) and the same DOM for the same
  input, with `render` and `expired` as snippets.
-->
<script lang="ts">
  import { untrack } from 'svelte'

  import { getClassMap } from '@molecule/app-ui'

  import { computeState, formatDisplay, targetMs, tickCountdown } from './state.js'
  import type { CountdownProps, CountdownState } from './types.js'

  let { target, format = 'compact', render, expired, className }: CountdownProps = $props()

  const cm = $derived(getClassMap())
  // The effect below recomputes this on the same flush; the initial read must
  // not subscribe, so the state is computed from the mount-time target.
  let state = $state<CountdownState>(computeState(targetMs(untrack(() => target)), Date.now()))

  // React's effect: re-read the target and restart the interval whenever it changes.
  $effect(() => {
    const ts = targetMs(target)
    return tickCountdown(ts, 1_000, (next) => {
      state = next
    })
  })

  const display = $derived(
    formatDisplay(format, state.days, state.hours, state.minutes, state.seconds),
  )
</script>

{#if state.expired && expired}
  {@render expired?.()}
{:else if render}
  <span class={className}>{@render render?.(state)}</span>
{:else}
  <span class={cm.cn(className)}>{display}</span>
{/if}
