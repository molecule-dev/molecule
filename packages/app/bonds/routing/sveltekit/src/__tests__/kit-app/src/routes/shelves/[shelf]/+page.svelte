<script lang="ts">
  // `/shelves/[shelf]`: a parameterised route, the declaration that mounts the page.
  import { page } from '$app/state'
</script>

<h1>{page.params.shelf}: all</h1>
