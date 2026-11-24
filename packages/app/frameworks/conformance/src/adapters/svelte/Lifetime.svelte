<!--
  A lifetime probe (see LifetimeSpec): counted as it is set up and when it is destroyed, with a flag
  a `lifetime` step flips, rendered at the root the spec names.
-->
<script lang="ts">
  import { onDestroy, untrack } from 'svelte'

  import {
    LIFETIME_ON,
    lifetimeCreated,
    lifetimeDisposed,
    lifetimeLabel,
    type LifetimeSpec,
    onLifetimeChange,
  } from '../../ui/index.js'

  let { name, root }: { name: string; root?: LifetimeSpec['root'] } = $props()

  // A probe keeps its name and root for its whole life.
  const fixed = untrack(() => name)
  const shape = untrack(() => root)
  const ordinal = lifetimeCreated(fixed)
  let on = $state(false)
  const off = onLifetimeChange(fixed, () => (on = !on))
  onDestroy(() => {
    off()
    lifetimeDisposed(fixed)
  })
</script>

{#if shape === 'fragment'}{lifetimeLabel(
    ordinal,
  )}{#if on}{LIFETIME_ON}{/if}{:else if shape === 'conditional'}{#if on}{LIFETIME_ON}{/if}{:else}<i
    data-parity-lifetime={fixed}
    data-parity-ordinal={String(ordinal)}
    >{#if on}{LIFETIME_ON}{/if}</i
  >{/if}
