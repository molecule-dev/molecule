<!--
  The Tooltip mock the unit tests substitute for `@molecule/app-ui-svelte`'s
  `Tooltip`: the same markup the React tests' mock renders — the trigger, then
  the content inline under a data-tooltip marker the assertions read.
-->
<script lang="ts">
  import type { Snippet } from 'svelte'

  let { content, children }: { content?: Snippet; children?: Snippet } = $props()
</script>

<span>
  {@render children?.()}
  <span data-tooltip="">{@render content?.()}</span>
</span>
