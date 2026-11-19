<script lang="ts">
  // `/shelves/new`: the draft page a new shelf opens, the static sibling of
  // `/shelves/[shelf]` (kit mounts the static segment first, as React Router does).
  import ShelfForm from '../../../lib/ShelfForm.svelte'
</script>

<ShelfForm />
