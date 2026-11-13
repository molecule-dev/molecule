<!--
  Accordion: expandable items with single/multiple expansion, controlled or
  internal state, collapsible guard and per-item header/content nodes. Item
  content stays in the DOM and is hidden with display:none, exactly like the
  React component.
-->
<script lang="ts">
  import { untrack } from 'svelte'

  import { getClassMap } from '@molecule/app-ui'

  import { useGeneratedId } from '../dom.js'
  import { reactStyle } from '../style.js'
  import type { AccordionProps } from '../types.js'
  import IconGlyph from './IconGlyph.svelte'
  import ReactNode from './ReactNode.svelte'

  let {
    items,
    value,
    defaultValue,
    onChange,
    multiple = false,
    collapsible = true,
    className,
    style,
    testId,
  }: AccordionProps = $props()

  const cm = $derived(getClassMap())

  const normalizeValue = (v: string | string[] | undefined): string[] => {
    if (v === undefined) return []
    return Array.isArray(v) ? v : [v]
  }

  let internalExpanded = $state(normalizeValue(untrack(() => defaultValue)))
  const expandedItems = $derived(value !== undefined ? normalizeValue(value) : internalExpanded)

  const toggleItem = (itemValue: string): void => {
    let newExpanded: string[]
    if (expandedItems.includes(itemValue)) {
      // Collapsing
      if (!collapsible && expandedItems.length === 1) return
      newExpanded = expandedItems.filter((v) => v !== itemValue)
    } else if (multiple) {
      newExpanded = [...expandedItems, itemValue]
    } else {
      newExpanded = [itemValue]
    }
    if (value === undefined) internalExpanded = newExpanded
    onChange?.((multiple ? newExpanded : newExpanded[0] || '') as string & string[])
  }

  // Per-item ids that stay with an item across re-renders (React's per-item useId): one
  // generated base per instance, so two accordions on a page never share an id, plus the item's
  // value. An id may hold any character but whitespace, which encodeURIComponent never leaves.
  const idBase = useGeneratedId()
  const idsFor = (itemValue: string): { contentId: string; triggerId: string } => {
    const item = encodeURIComponent(itemValue)
    return { contentId: `${idBase}-${item}-content`, triggerId: `${idBase}-${item}-trigger` }
  }
</script>

<div class={cm.cn(cm.accordionRoot, className)} use:reactStyle={style} data-testid={testId}>
  {#each items as item (item.value)}
    {@const ids = idsFor(item.value)}
    {@const isExpanded = expandedItems.includes(item.value)}
    <div class={cm.accordionItem} data-state={isExpanded ? 'open' : 'closed'}>
      <button
        id={ids.triggerId}
        type="button"
        class={cm.cn(cm.accordion({ variant: 'default' }), cm.accordionTriggerBase)}
        onclick={() => !item.disabled && toggleItem(item.value)}
        aria-expanded={isExpanded}
        aria-controls={ids.contentId}
        data-state={isExpanded ? 'open' : 'closed'}
        disabled={item.disabled}
      >
        <ReactNode node={item.header} />
        <IconGlyph name="chevron-down" className={cm.accordionChevron} />
      </button>
      <div
        id={ids.contentId}
        role="region"
        aria-labelledby={ids.triggerId}
        data-state={isExpanded ? 'open' : 'closed'}
        class={cm.accordionContent}
        use:reactStyle={{ display: isExpanded ? 'block' : 'none' }}
      >
        <div class={cm.accordionContentInner}><ReactNode node={item.content} /></div>
      </div>
    </div>
  {/each}
</div>
