<script lang="ts">
  // `/shelves/[shelf]/filter/[view]`: one filtered view of a shelf's records.
  import { page } from '$app/state'
</script>

<h1>{page.params.shelf}: {page.params.view}</h1>
