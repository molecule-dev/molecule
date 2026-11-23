<!--
  DetailPageLayout: the Svelte counterpart of `@molecule/app-detail-page-layout-react`'s
  `DetailPageLayout` — two- or three-row detail-page scaffold: breadcrumb +
  top bar + [main column + optional sidebar on either side]. Same props, same
  DOM for the same input; all regions are snippet slots.
-->
<script lang="ts">
  import { getClassMap } from '@molecule/app-ui'

  import { reactStyle } from './style.js'
  import type { DetailPageLayoutProps } from './types.js'

  const SIDEBAR_WIDTH = { sm: 64, md: 80, lg: 96 } as const

  let {
    breadcrumb,
    topBar,
    main,
    sidebar,
    sidebarPosition = 'right',
    sidebarWidth = 'md',
    className,
    dataMolId,
  }: DetailPageLayoutProps = $props()

  const cm = $derived(getClassMap())
  const sidebarStyle = $derived({
    flexBasis: `${SIDEBAR_WIDTH[sidebarWidth] * 4}px`,
    flexShrink: 0,
  })
</script>

<div class={cm.cn(cm.stack(4), className)} data-mol-id={dataMolId}>
  {#if breadcrumb}{@render breadcrumb?.()}{/if}
  {#if topBar}{@render topBar?.()}{/if}
  <div
    class={cm.cn(
      cm.flex({ align: 'start', gap: 'lg', direction: sidebarPosition === 'left' ? 'row' : 'row' }),
    )}
  >
    {#if sidebar && sidebarPosition === 'left'}
      <aside use:reactStyle={sidebarStyle}>{@render sidebar?.()}</aside>
    {/if}
    <main class={cm.flex1}>
      <div class={cm.stack(4)}>{@render main?.()}</div>
    </main>
    {#if sidebar && sidebarPosition === 'right'}
      <aside use:reactStyle={sidebarStyle}>{@render sidebar?.()}</aside>
    {/if}
  </div>
</div>
