<!--
  PageShell: an authenticated page wrapper with sidebar, top bar and main
  content.
-->
<script lang="ts">
  import { t } from '@molecule/app-i18n'
  import { getClassMap } from '@molecule/app-ui'

  import { reactStyle } from '../style.js'
  import type { PageShellProps } from '../types.js'

  let {
    children,
    sidebar,
    topbar,
    sidebarCollapsed,
    onSidebarToggle,
    className,
    style,
    testId,
    automationId,
  }: PageShellProps = $props()

  const cm = $derived(getClassMap())
</script>

<div
  class={cm.cn(cm.pageShell, className)}
  use:reactStyle={style}
  data-testid={testId}
  data-mol-id={automationId}
>
  {#if sidebar}
    <aside class={cm.cn(cm.pageShellSidebar, sidebarCollapsed && cm.pageShellSidebarCollapsed)}>
      {#if onSidebarToggle}
        <button
          type="button"
          class={cm.pageShellSidebarToggle}
          onclick={onSidebarToggle}
          aria-label={sidebarCollapsed
            ? t('ui.pageShell.expandSidebar', undefined, { defaultValue: 'Expand sidebar' })
            : t('ui.pageShell.collapseSidebar', undefined, { defaultValue: 'Collapse sidebar' })}
        >
          {sidebarCollapsed ? '▶' : '◀'}
        </button>
      {/if}{@render sidebar()}
    </aside>
  {/if}
  <div class={cm.flex1}>
    {#if topbar}<header class={cm.pageShellTopbar}>{@render topbar()}</header>{/if}
    <main class={cm.pageShellContent}>{@render children?.()}</main>
  </div>
</div>
