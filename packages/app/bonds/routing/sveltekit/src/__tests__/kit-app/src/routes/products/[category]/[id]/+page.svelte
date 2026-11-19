<script lang="ts">
  // `/products/[category]/[id]`: a route with two parameters, the shape a typed params
  // read is built from.
  import { page } from '$app/state'
</script>

<output>{page.params.category}/{page.params.id}</output>
