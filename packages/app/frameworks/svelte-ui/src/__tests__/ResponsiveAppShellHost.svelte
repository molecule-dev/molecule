<!--
  Test host for the `ResponsiveAppShell` family — the Svelte form of the React
  reference's `Shell` element tree. `mobileOnlyTopBar`, `sidebarWidth`,
  `withDrawer` and `minimal` mirror the compositions the React test renders:
  the full shell, the mobile-only top bar, the geometry-only shell (sidebar +
  content) and a shell composed without a Drawer.
-->
<script lang="ts">
  import ResponsiveAppShell from '../components/ResponsiveAppShell.svelte'
  import ResponsiveAppShellContent from '../components/ResponsiveAppShellContent.svelte'
  import ResponsiveAppShellDrawer from '../components/ResponsiveAppShellDrawer.svelte'
  import ResponsiveAppShellSidebar from '../components/ResponsiveAppShellSidebar.svelte'
  import ResponsiveAppShellTopBar from '../components/ResponsiveAppShellTopBar.svelte'
  import type { ShellSidebarWidth } from '../shell-context.js'

  let {
    mobileOnlyTopBar = false,
    sidebarWidth,
    withDrawer = true,
    minimal = false,
  }: {
    mobileOnlyTopBar?: boolean
    sidebarWidth?: ShellSidebarWidth
    withDrawer?: boolean
    minimal?: boolean
  } = $props()
</script>

{#snippet navLinks()}
  <a href="/dashboard">Dashboard</a>
  <a href="/projects">Projects</a>
  <a href="/reports">Reports</a>
{/snippet}

{#snippet brandNode()}
  <span>Timetrack</span>
{/snippet}

{#snippet pageBody()}
  <p>Page body</p>
{/snippet}

<ResponsiveAppShell {sidebarWidth}>
  {#if minimal}
    <ResponsiveAppShellSidebar>{@render navLinks()}</ResponsiveAppShellSidebar>
    <ResponsiveAppShellContent>{@render pageBody()}</ResponsiveAppShellContent>
  {:else}
    <ResponsiveAppShellTopBar brand={brandNode} mobileOnly={mobileOnlyTopBar} />
    <ResponsiveAppShellSidebar>{@render navLinks()}</ResponsiveAppShellSidebar>
    {#if withDrawer}
      <ResponsiveAppShellDrawer>{@render navLinks()}</ResponsiveAppShellDrawer>
    {/if}
    <ResponsiveAppShellContent>{@render pageBody()}</ResponsiveAppShellContent>
  {/if}
</ResponsiveAppShell>
