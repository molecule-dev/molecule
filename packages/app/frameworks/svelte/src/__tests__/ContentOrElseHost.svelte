<!--
  Test host: a `ContentOrElse` inside one `{#if}` with an inline sibling before or after it (the
  shapes where an element of the branch's range that left the page could make Svelte's teardown
  walk stop early or run past the branch), then a keyed `{#each}` of feeds, each its rows' content
  or, while it has none, an `<aside>`. Content and `otherwise` each hold a counter.
-->
<script lang="ts">
  import { ContentOrElse } from '../components/index.js'
  import Counter from './ContentOrElseCounter.svelte'

  let {
    show = true,
    first = true,
    rows = [],
    feeds = [],
    counts = {},
  }: {
    show?: boolean
    first?: boolean
    rows?: string[]
    feeds?: { id: string; rows: string[] }[]
    counts?: Record<string, [number, number]>
  } = $props()

  /** Changes the props from the test. */
  export function set(next: {
    show?: boolean
    rows?: string[]
    feeds?: { id: string; rows: string[] }[]
  }): void {
    if (next.show !== undefined) show = next.show
    if (next.rows !== undefined) rows = next.rows
    if (next.feeds !== undefined) feeds = next.feeds
  }
</script>

{#if show}
  {#if !first}<p data-p="before">before</p>{/if}
  <ContentOrElse
    >{#if rows.length > 0}<Counter name="content" {counts} />{/if}{#each rows as row (row)}<span
        data-row={row}>{row}</span
      >{/each}{#snippet otherwise()}<div data-p="otherwise">
        <Counter name="otherwise" {counts} />
      </div>{/snippet}</ContentOrElse
  >
  {#if first}<p data-p="after">after</p>{/if}
{/if}
<section data-p="list">
  {#each feeds as feed (feed.id)}
    <ContentOrElse
      >{#each feed.rows as row (row)}<span data-row={row}>{row}</span
        >{/each}{#snippet otherwise()}<aside data-feed={feed.id}></aside>{/snippet}</ContentOrElse
    >
  {/each}
</section>
<footer data-p="outside">outside</footer>
