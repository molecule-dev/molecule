<!--
  Test helper: a button with whitespace of its own around its content, as a UI kit's Button has.
-->
<script lang="ts">
  import type { Snippet } from 'svelte'

  let { children }: { children?: Snippet } = $props()
</script>

<button type="button"> <span> {@render children?.()} </span> </button>
