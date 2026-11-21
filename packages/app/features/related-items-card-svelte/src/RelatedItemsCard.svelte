<!--
  RelatedItemsCard: the Svelte counterpart of
  `@molecule/app-related-items-card-react`'s `RelatedItemsCard` — a titled Card
  with header + list + empty state + "View all" link. Same props (React
  names), same DOM for the same input: the header always renders both of its
  inner rows, `items.length === 0` swaps the list for `emptyState`, and a
  clickable row (`onItemClick`) keeps its `<li>` and wraps the row content in
  an inner `role="button"` div the way React does — focusable, with Enter and
  Space running the same handler the click does. The "View all" label is the
  same literal English the React package renders; it does not route that label
  through i18n.
-->
<script lang="ts" generics="T">
  import { getClassMap } from '@molecule/app-ui'
  import { Card } from '@molecule/app-ui-svelte'

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
          <li>
            {#if onItemClick}
              <!-- Keyboard activation for a clickable row — the same call the
                mouse click makes. The row control is a `role="button"` div (an
                `<li>` may not carry button semantics), so it activates Enter
                and Space itself. -->
              <div
                role="button"
                tabindex="0"
                class={cm.cursorPointer}
                onclick={() => onItemClick?.(item, i)}
                onkeydown={(event) => {
                  if (event.key !== 'Enter' && event.key !== ' ') return
                  event.preventDefault()
                  onItemClick?.(item, i)
                }}
              >
                {@render renderItem(item, i)}
              </div>
            {:else}
              {@render renderItem(item, i)}
            {/if}
          </li>
        {/each}
      </ul>
    {/if}
  </div>
</Card>
