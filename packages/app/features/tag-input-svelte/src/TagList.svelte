<!--
  TagList: the Svelte counterpart of `@molecule/app-tag-input-react`'s
  `TagList` — the saved record's tags on a detail or preview screen, without
  an editor or remove controls. Same props (React names), same ClassMap
  tokens, same DOM for the same input. One list item per value, duplicates
  included, in order; `renderTag` is a snippet called with the tag and its
  index, and without it each tag renders as a `TagChip`. List attributes
  such as id and aria-label go on the list itself.
-->
<script lang="ts">
  import { getClassMap } from '@molecule/app-ui'

  import TagChip from './TagChip.svelte'
  import type { TagListProps } from './types.js'

  let {
    value,
    className,
    class: listClassName,
    itemClassName,
    renderTag,
    ...listProps
  }: TagListProps = $props()

  const cm = $derived(getClassMap())

  const listClass = $derived(
    cm.cn(cm.flex({ align: 'center', gap: 'xs', wrap: 'wrap' }), className, listClassName),
  )
</script>

<ul {...listProps} class={listClass}>
  {#each value as tag, index (`${tag}-${index}`)}
    <li class={itemClassName}>
      {#if renderTag}
        {@render renderTag?.(tag, index)}
      {:else}
        <TagChip>{tag}</TagChip>
      {/if}
    </li>
  {/each}
</ul>
