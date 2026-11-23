<!--
  FilterPill: the Svelte counterpart of
  `@molecule/app-faceted-search-react`'s `FilterPill` — an outlined filter pill
  with an optional `expand_more` chevron and a dropdown panel that opens beneath
  it. Same props, same DOM for the same input; the panel content is the default
  snippet and the pill closes on an outside mousedown.
-->
<script lang="ts">
  import { getClassMap } from '@molecule/app-ui'

  import type { FilterPillProps } from './types.js'

  let {
    label,
    active = false,
    children,
    hideChevron = false,
    leadingIcon,
    panelAlign = 'left',
    dataMolId,
  }: FilterPillProps = $props()

  const cm = $derived(getClassMap())

  let open = $state(false)
  let wrapper: HTMLDivElement | undefined = $state()

  // As in React's effect: the listener exists only while the panel is open. The
  // returned function runs when the effect re-runs or the component unmounts.
  $effect(() => {
    if (!open) return
    /**
     * Closes the panel when a mousedown occurs outside the wrapper element.
     * @param event - The document mousedown.
     */
    const onDoc = (event: MouseEvent): void => {
      if (wrapper?.contains(event.target as Node)) return
      open = false
    }
    document.addEventListener('mousedown', onDoc)
    return () => {
      document.removeEventListener('mousedown', onDoc)
    }
  })

  const panelClass = $derived(
    cm.cn(
      cm.sp('mt', 2),
      cm.sp('p', 4),
      cm.facetedSearchPillPanel,
      panelAlign === 'right' ? cm.facetedSearchPillPanelRight : cm.facetedSearchPillPanelLeft,
    ),
  )
</script>

<div bind:this={wrapper} class={cm.cn(cm.position('relative'))}>
  <button
    type="button"
    aria-haspopup="true"
    aria-expanded={open ? 'true' : 'false'}
    data-mol-id={dataMolId}
    onclick={() => (open = !open)}
    data-state={active || open ? 'active' : 'inactive'}
    class={cm.cn(
      cm.tabsTrigger({ variant: 'soft-rounded', size: 'sm' }),
      cm.fontWeight('medium'),
      cm.touchTargetCompact,
    )}
  >
    <!-- Icon-font ligature names are decoration: the pill's own label names the
      filter, so screen readers must not read them out. -->
    <span class={cm.flex({ align: 'center', gap: 'sm' })}>
      {#if leadingIcon}
        <span aria-hidden="true" class={cm.cn(cm.textSize('sm'), cm.iconGlyphFont)}>
          {leadingIcon}
        </span>
      {/if}
      {#if typeof label === 'string'}
        {label}
      {:else if label}
        {@render label?.()}
      {/if}
      {#if !hideChevron}
        <span aria-hidden="true" class={cm.cn(cm.textSize('sm'), cm.iconGlyphFont)}>
          expand_more
        </span>
      {/if}
    </span>
  </button>
  {#if open && children}
    <div class={panelClass}>
      {@render children?.()}
    </div>
  {/if}
</div>
