<!--
  A control the app owns: the hook supplies the value and the action, and this
  markup decides how they render (React's `Star`/`Subscription` in the ported
  optimistic-toggle cases).
-->
<script lang="ts">
  import { untrack } from 'svelte'

  import type { MaybeReadable } from '../maybe-readable.js'
  import { useOptimisticToggle, type UseOptimisticToggleOptions } from '../useOptimisticToggle.js'

  let {
    options,
    activeLabel,
    idleLabel,
  }: {
    options: MaybeReadable<UseOptimisticToggleOptions>
    activeLabel: string
    idleLabel: string
  } = $props()

  // The hook follows its own store source; reading the prop once at init is
  // what a component does, not a reactive dependency.
  const { value, pending, toggle } = untrack(() => useOptimisticToggle(options))
</script>

<button
  type="button"
  aria-pressed={$value}
  aria-busy={$pending ? 'true' : 'false'}
  onclick={toggle}
>
  <span data-icon="star"></span>
  {$value ? activeLabel : idleLabel}
</button>
