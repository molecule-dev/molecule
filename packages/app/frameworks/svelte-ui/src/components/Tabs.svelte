<!--
  Tabs: WAI-ARIA APG automatic-activation tabs. Roving tabindex (only the
  active tab is a tab stop); Left/Right/Home/End move both focus and the
  active tab; disabled tabs are skipped. Controlled by `value`, otherwise
  internal state seeded from defaultValue (or the first item).
-->
<script lang="ts">
  import { untrack } from 'svelte'
  import { SvelteMap } from 'svelte/reactivity'

  import { getClassMap } from '@molecule/app-ui'

  import { useGeneratedId } from '../dom.js'
  import { reactStyle } from '../style.js'
  import type { TabsProps } from '../types.js'
  import ReactNode from './ReactNode.svelte'

  let {
    items,
    value,
    defaultValue,
    onChange,
    variant,
    size,
    fitted,
    className,
    style,
    testId,
  }: TabsProps = $props()

  const cm = $derived(getClassMap())
  let internalValue = $state(untrack(() => defaultValue || items[0]?.value))
  const activeValue = $derived(value !== undefined ? value : internalValue)

  // Per-instance id prefix: bare `tab-${value}` ids collided whenever two
  // Tabs instances on one page shared a tab value.
  const idBase = useGeneratedId()
  // Written only from the trigger action (after mount), read from key handlers.
  const tabEls = new SvelteMap<string, HTMLButtonElement>()
  // Records each trigger element so keyboard navigation can focus it.
  const tabRef = (node: HTMLButtonElement, tabValue: string): { destroy: () => boolean } => {
    tabEls.set(tabValue, node)
    return { destroy: () => tabEls.delete(tabValue) }
  }

  const selectTab = (tabValue: string): void => {
    if (value === undefined) internalValue = tabValue
    onChange?.(tabValue)
  }

  const handleKeyDown = (event: KeyboardEvent): void => {
    const enabled = items.filter((item) => !item.disabled)
    if (enabled.length === 0) return
    const currentIndex = enabled.findIndex((item) => item.value === activeValue)

    let nextIndex: number
    switch (event.key) {
      case 'ArrowRight':
        nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % enabled.length
        break
      case 'ArrowLeft':
        nextIndex = currentIndex === -1 ? 0 : (currentIndex - 1 + enabled.length) % enabled.length
        break
      case 'Home':
        nextIndex = 0
        break
      case 'End':
        nextIndex = enabled.length - 1
        break
      default:
        return
    }
    event.preventDefault()
    const nextValue = enabled[nextIndex]!.value
    selectTab(nextValue)
    tabEls.get(nextValue)?.focus()
  }

  const activeItem = $derived(items.find((item) => item.value === activeValue))

  // The tablist itself is not a tab stop (the roving `tabindex` lives on the
  // tabs, WAI-ARIA APG); the role is referenced through a constant so
  // svelte-check's focusable-role heuristic — which cannot see that — accepts
  // the markup that React's reference renders.
  const tablistRole = 'tablist' as const
</script>

<div class={className} use:reactStyle={style} data-testid={testId}>
  <div
    class={cm.cn(cm.tabsList({ variant, size }), fitted && cm.tabsFitted)}
    role={tablistRole}
    onkeydown={handleKeyDown}
  >
    {#each items as item (item.value)}
      {@const isActive = item.value === activeValue}
      <button
        id={`${idBase}-tab-${item.value}`}
        use:tabRef={item.value}
        type="button"
        role="tab"
        aria-selected={isActive}
        aria-controls={`${idBase}-tabpanel-${item.value}`}
        data-state={isActive ? 'active' : 'inactive'}
        tabindex={isActive ? 0 : -1}
        disabled={item.disabled}
        onclick={() => selectTab(item.value)}
        class={cm.cn(cm.tabsTrigger({ variant, size }), fitted && cm.tabTriggerFitted)}
      >
        {#if item.icon}<span class={cm.tabTriggerIcon}>{@render item.icon()}</span>{/if}
        <ReactNode node={item.label} />
      </button>
    {/each}
  </div>
  {#if activeItem?.content}
    <div
      role="tabpanel"
      id={`${idBase}-tabpanel-${activeValue}`}
      aria-labelledby={`${idBase}-tab-${activeValue}`}
      class={cm.tabsContent({ variant, size })}
    >
      <ReactNode node={activeItem.content} />
    </div>
  {/if}
</div>
