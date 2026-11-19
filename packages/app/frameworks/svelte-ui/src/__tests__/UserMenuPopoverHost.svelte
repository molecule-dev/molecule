<!--
  Test host for the `UserMenuPopover` family: composes the container with a
  trigger, a panel and the nav children each scenario needs, the way the React
  test renders its JSX tree.
-->
<script lang="ts">
  import UserMenuPopover from '../components/UserMenuPopover.svelte'
  import UserMenuPopoverPanel from '../components/UserMenuPopoverPanel.svelte'
  import UserMenuPopoverSignOut from '../components/UserMenuPopoverSignOut.svelte'
  import UserMenuPopoverTrigger from '../components/UserMenuPopoverTrigger.svelte'
  import UserMenuPopoverClosingLink from './UserMenuPopoverClosingLink.svelte'

  let {
    guestName,
    withSignOut = false,
    withClosingLink = false,
  }: {
    guestName?: string
    withSignOut?: boolean
    withClosingLink?: boolean
  } = $props()
</script>

<UserMenuPopover {guestName}>
  <UserMenuPopoverTrigger />
  <UserMenuPopoverPanel>
    <a href="/settings">Settings</a>
    {#if withSignOut}<UserMenuPopoverSignOut />{/if}
    {#if withClosingLink}<UserMenuPopoverClosingLink />{/if}
  </UserMenuPopoverPanel>
</UserMenuPopover>
