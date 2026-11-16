<!--
  ListingCard: the Svelte counterpart of `@molecule/app-listing-card-react`'s
  `ListingCard` — the outer Card shell with its children stacked vertically.
  Same props (React names), same ClassMap tokens, same DOM. A supplied
  `onClick` makes the whole card cursor-pointer, exactly as React's
  `cm.cursorPointer` condition does.
-->
<script lang="ts">
  import { getClassMap } from '@molecule/app-ui'
  import { Card } from '@molecule/app-ui-svelte'

  import type { ListingCardProps } from './types.js'

  let { children, onClick, className, dataMolId }: ListingCardProps = $props()

  const cm = $derived(getClassMap())
  const classes = $derived(cm.cn(onClick ? cm.cursorPointer : undefined, className))
</script>

<Card className={classes} data-mol-id={dataMolId} onClick={(event: MouseEvent) => onClick?.(event)}>
  <div class={cm.stack(0)}>
    {@render children?.()}
  </div>
</Card>
