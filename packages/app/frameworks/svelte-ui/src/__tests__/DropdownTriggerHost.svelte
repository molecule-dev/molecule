<!--
  Test host for the Dropdown trigger-snippet contract: a single `<button>` that
  spreads the menu-button props the Dropdown passes, the case React's
  `cloneElement` path clones. `label`, `width` and `disabled` are forwarded so
  the tests can keep mounting one component.
-->
<script lang="ts">
  import Dropdown from '../components/Dropdown.svelte'
  import type { DropdownItem, DropdownTriggerProps } from '../types.js'

  let {
    items,
    label = 'Actions',
    width,
    disabled,
    onOpenChange,
  }: {
    items: DropdownItem[]
    label?: string
    width?: number | 'trigger' | 'auto'
    disabled?: boolean
    onOpenChange?: (open: boolean) => void
  } = $props()
</script>

{#snippet trigger(props: DropdownTriggerProps)}
  <button type="button" {...props}>{label}</button>
{/snippet}

<Dropdown {trigger} {items} {width} {disabled} {onOpenChange} />
