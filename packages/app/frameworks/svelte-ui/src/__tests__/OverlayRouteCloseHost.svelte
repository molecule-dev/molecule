<!--
  Test host for the overlay close-on-route-change contract: mounts the overlay
  each case exercises, with the same children the React test renders.
-->
<script lang="ts">
  import Dropdown from '../components/Dropdown.svelte'
  import SidebarUserCard from '../components/SidebarUserCard.svelte'
  import UserMenu from '../components/UserMenu.svelte'
  import type { DropdownItem, DropdownTriggerProps } from '../types.js'
  import PanelClosePanel from './PanelClosePanel.svelte'

  let {
    kind,
    items = [],
  }: {
    kind: 'user-menu' | 'sidebar' | 'panel-close' | 'dropdown'
    items?: DropdownItem[]
  } = $props()
</script>

{#snippet dropdownTrigger(props: DropdownTriggerProps)}
  <button type="button" {...props}>Open menu</button>
{/snippet}

{#if kind === 'user-menu'}
  <UserMenu><div data-mol-id="panel-body">panel</div></UserMenu>
{:else if kind === 'sidebar'}
  <SidebarUserCard><div>sidebar-panel</div></SidebarUserCard>
{:else if kind === 'panel-close'}
  <UserMenu><PanelClosePanel /></UserMenu>
{:else}
  <Dropdown trigger={dropdownTrigger} {items} />
{/if}
