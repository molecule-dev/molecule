<!--
  OptimisticToggleButton: a server-backed boolean button that changes its
  label immediately and saves in order, using this package's local port of
  the optimistic-value controller (the same core React's useOptimisticValue
  wraps). The first tap changes the label and pressed state, including while
  a previous save is pending; saves run in order using the latest desired
  boolean; the newest failure rolls back and calls onError.
-->
<script lang="ts">
  import { untrack } from 'svelte'

  import { createOptimisticValue, type OptimisticValueState } from '../optimistic-value.js'
  import type { OptimisticToggleButtonProps } from '../types.js'
  import Button from './Button.svelte'
  import ReactNode from './ReactNode.svelte'

  let {
    value,
    commit,
    activeLabel,
    inactiveLabel,
    onError,
    ...props
  }: OptimisticToggleButtonProps = $props()

  // The controller is created once per mount (React's useState initializer);
  // each call reads the current commit/onError props.
  const controller = createOptimisticValue<boolean>({
    value: untrack(() => value),
    commit: (next) => commit(next),
    onError: (error) => onError?.(error),
  })

  let shown: OptimisticValueState<boolean> = $state(controller.getState())
  let lastReceived = untrack(() => value)

  $effect(() =>
    controller.subscribe((state) => {
      shown = { ...state }
    }),
  )

  // A new server value is taken only while nothing is being saved, so a
  // refetch of older data never flips the button mid-save (React's sync effect).
  $effect(() => {
    if (value === lastReceived) return
    lastReceived = value
    if (!shown.pending) controller.sync(value)
  })
</script>

<Button
  data-mol-id="optimistic-toggle"
  {...props as Record<string, unknown>}
  type="button"
  aria-pressed={shown.value}
  aria-busy={shown.pending}
  onClick={() => controller.update((current) => !current)}
>
  {#if shown.value}<ReactNode node={activeLabel} />{:else}<ReactNode node={inactiveLabel} />{/if}
</Button>
