<!--
  A parent of the documented detail page that can re-render itself while
  passing UNCHANGED props — Svelte's counterpart of React re-rendering the
  same component with the same props. The parent's own store drives its
  template, so a store update re-renders it (the `{renders}` read) and re-diffs
  the page's props without changing them; the page instance is kept, the way
  React's second `render()` keeps it.
-->
<script lang="ts">
  import type { Readable } from 'svelte/store'

  import PackagePage from './PackagePage.svelte'

  let { name, renders }: { name: string; renders: Readable<number> } = $props()
</script>

<span hidden>{$renders}</span>
<PackagePage {name} />
