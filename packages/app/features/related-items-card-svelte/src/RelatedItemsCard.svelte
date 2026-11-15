<!--
  RelatedItemsCard: the Svelte counterpart of
  `@molecule/app-related-items-card-react`'s `RelatedItemsCard` — a titled Card
  with header + list + empty state + "View all" link. Same props (React
  names), same DOM for the same input: the header always renders both of its
  inner rows, `items.length === 0` swaps the list for `emptyState`, and the
  rows are mouse-only `<li>` elements when `onItemClick` is supplied (React's
  own JSDoc asks callers to render a real button/link inside `renderItem` when
  keyboard access matters). The "View all" label is the same literal English
  the React package renders; it does not route that label through i18n.
-->
<script lang="ts" generics="T">
  import { getClassMap } from '@molecule/app-ui'
  import { Card } from '@molecule/app-ui-svelte'

  import { rowClick } from './dom.js'
  import type { ReactNodeProp } from './node-prop.js'
  import type { RelatedItemsCardProps } from './types.js'

  let {
    title,
    icon,
    items,
    renderItem,
    onItemClick,
    emptyState,
    viewAllHref,
    headerActions,
    className,
    dataMolId,
  }: RelatedItemsCardProps<T> = $props()

  const cm = $derived(getClassMap())
</script>

{#snippet node(
  value: ReactNodeProp | undefined,
)}{#if typeof value === 'function'}{@render value()}{:else if value !== undefined && value !== ''}{value}{/if}{/snippet}

<Card {className} data-mol-id={dataMolId}>
  <div class={cm.stack(3)}>
    <header class={cm.flex({ justify: 'between', align: 'center', gap: 'sm' })}>
      <div class={cm.flex({ align: 'center', gap: 'sm' })}>
        {@render node(icon)}
        <h3 class={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'))}>{@render node(title)}</h3>
      </div>
      <div class={cm.flex({ align: 'center', gap: 'sm' })}>
        {@render node(headerActions)}
        {#if viewAllHref}
          <a href={viewAllHref} class={cm.cn(cm.textSize('sm'), cm.link)}>View all</a>
        {/if}
      </div>
    </header>
    {#if items.length === 0}
      {@render node(emptyState)}
    {:else}
      <ul class={cm.stack(2)}>
        {#each items as item, i (i)}
          <li
            class={onItemClick ? cm.cursorPointer : undefined}
            use:rowClick={{ onItemClick, item, index: i }}
          >
            {@render renderItem(item, i)}
          </li>
        {/each}
      </ul>
    {/if}
  </div>
</Card>
