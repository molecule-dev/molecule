<script lang="ts">
  // `/files/[...rest]`: a rest parameter's declaration.
  import { page } from '$app/state'
</script>

<output>{page.params.rest ?? ''}</output>
