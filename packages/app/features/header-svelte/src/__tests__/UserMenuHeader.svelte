<!--
  The module @example's composition: `UserMenu` (from @molecule/app-ui-svelte)
  in the header's `userMenu` slot, taking the settings panel as its children.
-->
<script lang="ts">
  import { UserMenu } from '@molecule/app-ui-svelte'

  import AppHeader from '../AppHeader.svelte'
</script>

<AppHeader appName="Bearing">
  {#snippet userMenu()}
    <UserMenu>
      <div data-settings-panel>Settings</div>
    </UserMenu>
  {/snippet}
</AppHeader>
