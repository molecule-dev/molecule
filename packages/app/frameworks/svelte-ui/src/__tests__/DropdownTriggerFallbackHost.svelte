<!--
  Test host for the Dropdown trigger fallback: the snippet takes no props and
  renders one span, so it can never spread the menu-button props — the Dropdown
  must wrap it in React's `role="button"` container.
-->
<script lang="ts">
  import Dropdown from '../components/Dropdown.svelte'
  import type { DropdownItem } from '../types.js'

  let { items }: { items: DropdownItem[] } = $props()
</script>

{#snippet trigger()}
  <span>Menu</span>
{/snippet}

<Dropdown {trigger} {items} />
