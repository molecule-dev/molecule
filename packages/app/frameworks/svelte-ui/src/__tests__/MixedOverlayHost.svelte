<script lang="ts">
  import type { Readable } from 'svelte/store'

  import ConfirmDialog from '../components/ConfirmDialog.svelte'
  import Modal from '../components/Modal.svelte'
  import ResponsiveAppShell from '../components/ResponsiveAppShell.svelte'
  import ResponsiveAppShellDrawer from '../components/ResponsiveAppShellDrawer.svelte'
  import ResponsiveAppShellTopBar from '../components/ResponsiveAppShellTopBar.svelte'
  import DropdownTriggerHost from './DropdownTriggerHost.svelte'
  import type { Scene } from './mixed-overlay-scene.js'

  const { scene }: { scene: Readable<Scene> } = $props()
  const title = $derived(
    $scene.mode === 'pair' ? 'Upper' : $scene.mode === 'action' ? 'Confirm' : 'Actions',
  )
</script>

{#if $scene.shell}
  <ResponsiveAppShell>
    <ResponsiveAppShellTopBar brand="Time tracking" />
    {#if $scene.drawer}
      <ResponsiveAppShellDrawer>
        <a href="#dashboard">Dashboard</a>
      </ResponsiveAppShellDrawer>
    {/if}
  </ResponsiveAppShell>
{/if}

{#if $scene.mode === 'pair'}
  <Modal open title="Lower" onClose={$scene.onLowerClose} />
{/if}
{#if $scene.mode === 'confirm'}
  <ConfirmDialog
    open={$scene.modal}
    title="Actions"
    description="Confirm action"
    onClose={$scene.onClose}
    onConfirm={() => {}}
  />
{:else if $scene.showModal}
  <Modal
    open={$scene.modal}
    {title}
    onClose={$scene.onClose}
    closeOnEscape={$scene.closeOnEscape}
    preventScroll={$scene.preventScroll}
    showCloseButton={$scene.mode !== 'controls'}
  >
    {#if $scene.mode === 'dropdown'}
      <DropdownTriggerHost items={[{ value: 'edit', label: 'Edit' }]} label="Open actions" />
    {:else if $scene.mode === 'controls' && $scene.controls}
      <button type="button">First</button>
      <button type="button">Last</button>
    {:else if $scene.mode === 'action'}
      <button type="button">Second control</button>
    {/if}
  </Modal>
{/if}
<button type="button">Original opener</button>
