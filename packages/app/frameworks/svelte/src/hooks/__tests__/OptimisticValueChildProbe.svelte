<!--
  The descendant of the owning component: it calls the inherited `set` once the
  `active` prop turns on, the counterpart of React's `Child` layout effect.
-->
<script lang="ts">
  import type { Readable } from 'svelte/store'

  let {
    set,
    active,
  }: {
    set: (next: number) => void
    active: Readable<boolean>
  } = $props()

  $effect(() => {
    if ($active) set(2)
  })
</script>
