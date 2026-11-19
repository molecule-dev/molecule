<script lang="ts">
  // `/search/[[query]]`: an ordinary page with an optional trailing parameter —
  // the declaration a link with or without `query` is built from.
  import { page } from '$app/state'
</script>

<output>{page.params.query ?? ''}</output>
