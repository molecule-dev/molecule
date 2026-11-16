<!--
  ListingCardActions: the Svelte counterpart of
  `@molecule/app-listing-card-react`'s `ListingCardActions` — the bottom action
  row of a listing card. Same props (React names), same ClassMap tokens, same
  DOM. `layout` picks the horizontal (default) or stacked direction.
-->
<script lang="ts">
  import { getClassMap } from '@molecule/app-ui'

  import type { ListingCardActionsProps } from './types.js'

  let { children, layout = 'horizontal', className }: ListingCardActionsProps = $props()

  const cm = $derived(getClassMap())
  const classes = $derived(
    cm.cn(
      cm.flex({ direction: layout === 'stacked' ? 'col' : 'row', gap: 'sm', align: 'stretch' }),
      cm.sp('p', 3),
      className,
    ),
  )
</script>

<div class={classes}>
  {@render children?.()}
</div>
