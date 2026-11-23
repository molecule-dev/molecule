<!--
  Test host for the Dropdown trigger-snippet contract: the snippet spreads the
  props the Dropdown passes on its own root element, and the test can switch
  that root between a button and an anchor to prove the attachment follows the
  new element.
-->
<script lang="ts">
  import Dropdown from '../components/Dropdown.svelte'
  import type { DropdownItem, DropdownTriggerProps } from '../types.js'

  let { items }: { items: DropdownItem[] } = $props()

  let useLink = $state(false)

  /**
   * Switches the trigger's root element between a button and an anchor.
   *
   * @param v - Whether the anchor renders.
   */
  export function setUseLink(v: boolean): void {
    useLink = v
  }
</script>

{#snippet trigger(props: DropdownTriggerProps)}
  {#if useLink}
    <a href="#menu" onclick={(e) => e.preventDefault()} {...props}>Menu</a>
  {:else}
    <!-- `data-snippet-props` records that the Dropdown handed the snippet a props object to
         spread (it is `undefined` when a component renders the snippet with no arguments). -->
    <button {...props} data-snippet-props={props ? 'yes' : 'no'}>Menu</button>
  {/if}
{/snippet}

<Dropdown {trigger} {items} />
