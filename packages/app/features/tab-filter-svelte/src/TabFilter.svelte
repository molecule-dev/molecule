<!--
  TabFilter: the Svelte counterpart of `@molecule/app-tab-filter-react`'s
  `TabFilter` — a horizontal pill-style tab row used as a segmented filter,
  with inline count badges and horizontal scrolling on overflow. Same props,
  same DOM for the same input. `defaultTab` stays reachable when `tabs` holds
  only the path/query-selected filter, and a duplicate id appears once (using
  the default tab's definition). Each enabled tab calls `onChange` with its own
  id; `disabled` tabs are non-interactive.

  React keys each tab button by the tab's `id`; the keyed `{#each}` moves/keeps
  the rendered buttons per key the same way.
-->
<script lang="ts">
  import { getClassMap } from '@molecule/app-ui'
  import { reactStyle } from '@molecule/app-ui-svelte'

  import type { TabFilterProps, TabFilterTab } from './types.js'

  let {
    tabs,
    defaultTab,
    activeId,
    onChange,
    scrollable = true,
    filled = true,
    className,
  }: TabFilterProps = $props()

  const cm = $derived(getClassMap())

  // The default tab first (its definition wins for a duplicate id), then every
  // other tab in the order given.
  const visibleTabs = $derived<TabFilterTab[]>(
    defaultTab ? [defaultTab, ...tabs.filter((tab) => tab.id !== defaultTab!.id)] : tabs,
  )

  // React's horizontal-scroll inline style while `scrollable` (the default).
  const rootStyle = $derived(scrollable ? { overflowX: 'auto', whiteSpace: 'nowrap' } : undefined)
</script>

<div
  role="tablist"
  class={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), className)}
  use:reactStyle={rootStyle}
>
  {#each visibleTabs as tab (tab.id)}
    <button
      type="button"
      role="tab"
      aria-selected={tab.id === activeId}
      data-state={tab.id === activeId ? 'active' : 'inactive'}
      data-mol-id={`tab-filter-${tab.id}`}
      disabled={tab.disabled}
      onclick={() => onChange(tab.id)}
      class={cm.cn(
        cm.tabsTrigger({
          variant: filled ? 'solid-rounded' : 'soft-rounded',
          size: 'md',
        }),
        tab.id === activeId ? cm.fontWeight('semibold') : cm.fontWeight('medium'),
        cm.touchTargetCompact,
      )}
    >
      <span class={cm.flex({ align: 'center', gap: 'xs' })}>
        {#if typeof tab.icon === 'function'}{@render tab.icon?.()}{:else if tab.icon != null}{tab.icon}{/if}
        <span>
          {#if typeof tab.label === 'function'}{@render tab.label?.()}{:else}{tab.label}{/if}
        </span>
        {#if tab.count !== undefined}
          <span class={cm.cn(cm.textSize('xs'), cm.fontWeight('medium'))}>
            ({tab.count.toLocaleString()})
          </span>
        {/if}
      </span>
    </button>
  {/each}
</div>
