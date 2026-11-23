<!--
  Test host for the render-time state-adjustment scenarios, the Svelte idiom
  for the React test's owner components:

  - `open` is an optional readable store so a test can mount the Dropdown
    controlled (owner-held open state) or uncontrolled;
  - `width` carries through for the `width="trigger"` case.

  The trigger is the single `<button>Actions</button>` the reference clones.
-->
<script lang="ts">
  import type { Readable } from 'svelte/store'

  import Dropdown from '../components/Dropdown.svelte'
  import type { DropdownItem, DropdownTriggerProps } from '../types.js'

  let {
    open,
    items,
    onOpenChange,
    width,
  }: {
    open?: Readable<boolean>
    items: DropdownItem[]
    onOpenChange?: (open: boolean) => void
    width?: number | 'trigger' | 'auto'
  } = $props()
</script>

{#snippet triggerButton(props: DropdownTriggerProps)}
  <button type="button" {...props}>Actions</button>
{/snippet}

{#if open}
  <Dropdown trigger={triggerButton} {items} open={$open} {onOpenChange} {width} />
{:else}
  <Dropdown trigger={triggerButton} {items} {onOpenChange} {width} />
{/if}
