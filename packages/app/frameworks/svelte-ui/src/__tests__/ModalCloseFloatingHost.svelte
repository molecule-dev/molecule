<!--
  Test host for the Modal close-button placement: renders an open Modal whose
  body is real text (React's `children`) and forwards the title/showCloseButton
  choices each case makes.
-->
<script lang="ts">
  import Modal from '../components/Modal.svelte'

  let {
    open = true,
    title,
    showCloseButton,
  }: { open?: boolean; title?: string; showCloseButton?: boolean } = $props()
</script>

<Modal {open} onClose={() => undefined} {title} {showCloseButton}>body</Modal>
