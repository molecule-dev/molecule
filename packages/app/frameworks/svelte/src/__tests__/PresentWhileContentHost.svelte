<!--
  Test host: a `PresentWhileContent` inside one `{#if}` with an inline sibling, first or last in
  the branch (the shapes where an element of the branch's range that left the page could make
  Svelte's teardown walk stop early or run past the branch), then a keyed `{#each}` of panels
  that each render only while their row has items.
-->
<script lang="ts">
  import { PresentWhileContent } from '../components/index.js'

  let {
    show = true,
    first = true,
    rows = [],
    panels = [],
  }: {
    show?: boolean
    first?: boolean
    rows?: string[]
    panels?: { id: string; items: string[] }[]
  } = $props()

  /** Changes the props from the test. */
  export function set(next: {
    show?: boolean
    rows?: string[]
    panels?: { id: string; items: string[] }[]
  }): void {
    if (next.show !== undefined) show = next.show
    if (next.rows !== undefined) rows = next.rows
    if (next.panels !== undefined) panels = next.panels
  }
</script>

{#if show}
  {#if !first}<p data-p="before">before</p>{/if}
  <PresentWhileContent data-p="panel" class="panel"
    >{#each rows as row (row)}<span data-row={row}>{row}</span>{/each}</PresentWhileContent
  >
  {#if first}<p data-p="after">after</p>{/if}
{/if}
<section data-p="list">
  {#each panels as panel (panel.id)}
    <PresentWhileContent tag="article" data-panel={panel.id}
      >{#each panel.items as item (item)}{item}{/each}</PresentWhileContent
    >
  {/each}
</section>
<footer data-p="outside">outside</footer>
