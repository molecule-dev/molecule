<!--
  Test host for the Modal's focus on unmount: the test unmounts it, removing the Modal as a parent
  that stops rendering a dialog does.
-->
<script lang="ts">
  import Modal from '../components/Modal.svelte'

  let { open }: { open: boolean } = $props()
</script>

<Modal {open} onClose={() => undefined} title="Restore">Body</Modal>
