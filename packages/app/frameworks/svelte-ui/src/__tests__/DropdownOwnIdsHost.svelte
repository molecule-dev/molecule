<!--
  Test host for the Dropdown trigger-snippet contract: the trigger is a single
  element carrying its own ids, the case React's `cloneElement` path clones.
-->
<script lang="ts">
  import Dropdown from '../components/Dropdown.svelte'
  import type { DropdownItem, DropdownTriggerProps } from '../types.js'

  let { items }: { items: DropdownItem[] } = $props()
</script>

{#snippet trigger(props: DropdownTriggerProps)}
  <button data-testid="own-trigger" data-mol-id="own-auto" {...props}>Menu</button>
{/snippet}

<Dropdown {trigger} {items} />
