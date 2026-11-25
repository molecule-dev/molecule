<script lang="ts">
  import ConfirmDialog from '../components/ConfirmDialog.svelte'
  import Modal from '../components/Modal.svelte'
  import ResponsiveAppShell from '../components/ResponsiveAppShell.svelte'
  import ResponsiveAppShellContent from '../components/ResponsiveAppShellContent.svelte'
  import ResponsiveAppShellDrawer from '../components/ResponsiveAppShellDrawer.svelte'
  import ResponsiveAppShellTopBar from '../components/ResponsiveAppShellTopBar.svelte'
  import OpenDrawerForSsr from './OpenDrawerForSsr.svelte'

  const { part }: { part: 'modal' | 'confirm' | 'shell' } = $props()
  const close = (): void => {}
</script>

{#if part === 'shell'}
  <ResponsiveAppShell>
    <ResponsiveAppShellTopBar brand="Mobile shell" />
    <OpenDrawerForSsr />
    <ResponsiveAppShellDrawer>Drawer content</ResponsiveAppShellDrawer>
    <ResponsiveAppShellContent>Page content</ResponsiveAppShellContent>
  </ResponsiveAppShell>
{:else}
  <main>
    {#if part === 'modal'}
      <Modal
        open
        title="A server dialog"
        onClose={close}
        centered={false}
        style={{ paddingTop: 8, opacity: 0.5 }}
      >
        Dialog body
      </Modal>
    {:else}
      <ConfirmDialog
        open
        title="Delete?"
        description="Cannot be undone."
        onClose={close}
        onConfirm={close}
      />
    {/if}
  </main>
{/if}
