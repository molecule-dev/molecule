<!--
  UserMenuPopoverPanel: the absolutely-positioned popover card with a
  built-in identity header and a nav wrapping the caller's items. Renders
  nothing while the popover is closed.
-->
<script lang="ts">
  import { getContext } from 'svelte'

  import { useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'

  import type { UserMenuPopoverPanelProps } from '../types.js'
  import {
    USER_MENU_POPOVER_CONTEXT,
    type UserMenuPopoverContextValue,
  } from '../user-menu-popover.svelte.js'

  let {
    children,
    className,
    ariaLabelKey = 'userMenu.panelLabel',
    ariaLabelDefault = 'Account menu',
    dataMolId = 'user-menu-panel',
  }: UserMenuPopoverPanelProps = $props()

  const { t } = useTranslation()
  const cm = $derived(getClassMap())
  const ctx = getContext<UserMenuPopoverContextValue>(USER_MENU_POPOVER_CONTEXT)
  if (!ctx) {
    throw new Error('<UserMenuPopoverPanel> must be rendered inside <UserMenuPopover>')
  }
</script>

{#if ctx.open}
  <div id={ctx.panelId} data-mol-id={dataMolId} class={cm.cn(cm.userMenuPopoverPanel, className)}>
    <header class={cm.cn(cm.sp('pb', 4), cm.userMenuPopoverHeader)}>
      <p class={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>{ctx.displayName}</p>
      {#if ctx.email}<p class={cm.cn(cm.textSize('xs'), cm.textMuted)}>{ctx.email}</p>{/if}
    </header>
    <nav
      class={cm.cn(cm.sp('mt', 4), cm.stack(1))}
      aria-label={t(ariaLabelKey, {}, { defaultValue: ariaLabelDefault })}
    >
      {@render children?.()}
    </nav>
  </div>
{/if}
