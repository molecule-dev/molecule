<!--
  ShowMore: the Svelte counterpart of `@molecule/app-collapsible-section-react`'s
  `ShowMore` — "Show N more" / "Show less" toggle for long lists. Same DOM for
  the same input.

  A Svelte snippet is opaque (it has no length and gives no access to one
  child), so the list is data: `items` holds one entry per item and the
  `children` snippet renders one entry. React's `children.slice(0, initialCount)`
  is `items.slice(…)` in this component's own `{#each}`: Svelte places every
  node, and no rendered node is detached or moved.
-->
<script lang="ts" generics="T">
  import { useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'

  import type { ShowMoreProps } from './types.js'

  let {
    items = [],
    children,
    initialCount = 3,
    moreKey = 'showMore.more',
    lessKey = 'showMore.less',
    className,
  }: ShowMoreProps<T> = $props()

  const cm = $derived(getClassMap())
  const { t } = useTranslation()

  /** Whether every item shows (React's `expanded`). */
  let expanded = $state(false)

  /** React's `expanded ? children : children.slice(0, initialCount)`. */
  const visible = $derived(expanded ? items : items.slice(0, initialCount))
  /** React's `Math.max(0, children.length - initialCount)`. */
  const remaining = $derived(Math.max(0, items.length - initialCount))
  /** Every `t(…)` runs inside a `$derived`, so a locale switch re-renders the label. */
  const label = $derived(
    expanded
      ? t(lessKey, {}, { defaultValue: 'Show less' })
      : t(moreKey, { remaining }, { defaultValue: `Show ${remaining} more` }),
  )
</script>

<div class={cm.cn(cm.stack(2), className)}>
  {#each visible as item, i (i)}{@render children?.(item, i)}{/each}
  {#if remaining > 0}<button
      type="button"
      onclick={() => (expanded = !expanded)}
      class={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'), cm.link)}>{label}</button
    >{/if}
</div>
