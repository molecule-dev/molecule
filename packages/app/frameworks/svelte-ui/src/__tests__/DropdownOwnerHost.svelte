<!--
  Test host for the Dropdown `onOpenChange` contract. The owner's open state
  lives in a readable store the test passes in (Svelte's idiom for the React
  test's `useState` in `Owner`); omitting it mounts the uncontrolled dropdown.
-->
<script lang="ts">
  import type { Readable } from 'svelte/store'

  import Dropdown from '../components/Dropdown.svelte'
  import type { DropdownItem, DropdownTriggerProps } from '../types.js'

  let {
    open,
    items,
    onOpenChange,
  }: {
    open?: Readable<boolean>
    items: DropdownItem[]
    onOpenChange: (open: boolean) => void
  } = $props()
</script>

{#snippet triggerButton(props: DropdownTriggerProps)}
  <button type="button" {...props}>Options</button>
{/snippet}

{#if open}
  <Dropdown trigger={triggerButton} {items} open={$open} {onOpenChange} />
{:else}
  <Dropdown trigger={triggerButton} {items} {onOpenChange} />
{/if}
