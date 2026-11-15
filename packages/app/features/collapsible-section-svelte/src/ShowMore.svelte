<!--
  ShowMore: the Svelte counterpart of `@molecule/app-collapsible-section-react`'s
  `ShowMore` — "Show N more" / "Show less" toggle for long lists. Same props,
  same DOM for the same input; the items are the `children` snippet.

  A Svelte snippet is opaque: it has no length, so the truncation React does
  with `children.slice(0, initialCount)` is applied to the DOM. The nodes the
  snippet rendered are measured once, then the ones past `initialCount` are
  detached while collapsed and put back, in order, when expanded.
-->
<script lang="ts">
  import { useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'

  import { itemNodes, truncateNodes } from './truncate.js'
  import type { ShowMoreProps } from './types.js'

  let {
    children,
    initialCount = 3,
    moreKey = 'showMore.more',
    lessKey = 'showMore.less',
    className,
  }: ShowMoreProps = $props()

  const cm = $derived(getClassMap())
  const { t } = useTranslation()

  /** Whether every item shows (React's `expanded`). */
  let expanded = $state(false)
  /** The list's root element. */
  let root = $state<HTMLDivElement | null>(null)
  /** The toggle button, while React renders one. */
  let anchor = $state<HTMLButtonElement | null>(null)
  /** How many items the children snippet rendered (-1 until measured). */
  let count = $state(-1)
  /** The item nodes, in document order (captured once — snippets are stable). */
  let items: (Element | Text)[] = []

  /** React's `Math.max(0, children.length - initialCount)`. */
  const remaining = $derived(count < 0 ? 0 : Math.max(0, count - initialCount))
  /** Every `t(…)` runs inside a `$derived`, so a locale switch re-renders the label. */
  const label = $derived(
    expanded
      ? t(lessKey, {}, { defaultValue: 'Show less' })
      : t(moreKey, { remaining }, { defaultValue: `Show ${remaining} more` }),
  )

  // Measure the items the snippet rendered, then keep React's slice in the DOM.
  // The effect runs after every DOM update; hiding or restoring nodes does not
  // change any state it reads, so it settles in one pass.
  $effect(() => {
    if (!root) return
    if (count < 0) {
      items = itemNodes(root)
      count = items.length
      return
    }
    truncateNodes(root, items, expanded ? items.length : initialCount, anchor)
  })
</script>

<div class={cm.cn(cm.stack(2), className)} bind:this={root}>
  {#if children}{@render children()}{/if}
  {#if remaining > 0}<button
      bind:this={anchor}
      type="button"
      onclick={() => (expanded = !expanded)}
      class={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'), cm.link)}>{label}</button
    >{/if}
</div>
