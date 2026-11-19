<!--
  Test host for the real-dependency provider integration test: the stateful
  Modal flows React's harnesses express with `useState`. `lifecycle` opens
  with the dialog already up and closes it on Escape; `focus` starts closed
  behind an "Open" trigger; `stack` keeps an outer dialog open while the inner
  one closes itself; `centered` re-renders the same dialog top-anchored.
-->
<script lang="ts">
  import { untrack } from 'svelte'

  import Modal from '../components/Modal.svelte'

  let { mode = 'lifecycle' }: { mode?: 'lifecycle' | 'focus' | 'stack' | 'centered' } = $props()

  // Seeded once from `mode` (the one-shot read `untrack` documents), the way
  // React's `useState` seeds from a prop.
  let open = $state(untrack(() => mode !== 'focus'))
  let innerOpen = $state(true)
  let centered = $state(true)
</script>

{#if mode === 'lifecycle'}
  <Modal {open} onClose={() => (open = false)} title="Confirm">Body content</Modal>
{:else if mode === 'focus'}
  <div>
    <button type="button" data-open onclick={() => (open = true)}>Open</button>
    <Modal {open} onClose={() => (open = false)} title="Confirm">
      <button type="button">First</button>
      <button type="button">Second</button>
    </Modal>
  </div>
{:else if mode === 'centered'}
  <button type="button" data-toggle onclick={() => (centered = false)}>toggle</button>
  <Modal {open} onClose={() => {}} title="A" {centered}>body</Modal>
{:else}
  <div>
    <Modal open onClose={() => {}} title="Outer">outer</Modal>
    {#if innerOpen}
      <Modal open onClose={() => (innerOpen = false)} title="Inner">inner</Modal>
    {/if}
  </div>
{/if}
