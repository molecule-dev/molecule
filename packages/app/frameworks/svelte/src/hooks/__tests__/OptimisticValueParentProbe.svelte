<!--
  The owning component of the descendant-layout-effect case: it calls
  `useOptimisticValue` during init and hands `set` down to a child, which calls
  it after the props change (React's `Parent` and `Child`).
-->
<script lang="ts">
  import { untrack } from 'svelte'
  import type { Readable } from 'svelte/store'

  import type { OptimisticValueOptions } from '@molecule/app-state'

  import { useOptimisticValue } from '../useOptimisticValue.js'
  import OptimisticValueChildProbe from './OptimisticValueChildProbe.svelte'

  let {
    options,
    active,
  }: {
    options: Readable<OptimisticValueOptions<number>>
    active: Readable<boolean>
  } = $props()

  const value = untrack(() => useOptimisticValue(options))
</script>

<OptimisticValueChildProbe set={value.set} {active} />
