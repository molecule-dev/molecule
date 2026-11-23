<!--
  Test host for the Dropdown's placement among keyed siblings: one branch whose
  only content is a Dropdown (an `{#if}` the test closes), and a keyed list of
  Dropdowns the test inserts into, swaps and empties. Each trigger spreads the
  menu-button props on its own element, so the Dropdown renders no wrapper of
  its own between the block and the button.
-->
<script lang="ts">
  import { untrack } from 'svelte'

  import Dropdown from '../components/Dropdown.svelte'
  import type { DropdownItem, DropdownTriggerProps } from '../types.js'

  let { show = true, rows = ['r1'] }: { show?: boolean; rows?: string[] } = $props()

  let branchOpen = $state(untrack(() => show))
  let rowIds = $state<string[]>([...untrack(() => rows)])

  /** The one-item menu every Dropdown in this host renders. */
  const items: DropdownItem[] = [{ label: 'One', value: 'one' }]

  /**
   * Opens or closes the `{#if}` branch.
   *
   * @param v - Whether the branch renders.
   */
  export function setShow(v: boolean): void {
    branchOpen = v
  }

  /**
   * Replaces the keyed rows (an insert, a swap, empty, a refill).
   *
   * @param v - The row ids, in render order.
   */
  export function setRows(v: string[]): void {
    rowIds = [...v]
  }
</script>

<section data-p="branch">
  {#if branchOpen}<Dropdown {items}
      >{#snippet trigger(props: DropdownTriggerProps)}<button {...props} data-p="trigger"
          >Menu</button
        >{/snippet}</Dropdown
    >{/if}
</section>
<section data-p="rows">
  {#each rowIds as r (r)}<Dropdown {items}
      >{#snippet trigger(props: DropdownTriggerProps)}<button {...props} data-p={r}>{r}</button
        >{/snippet}</Dropdown
    >{/each}
</section>
