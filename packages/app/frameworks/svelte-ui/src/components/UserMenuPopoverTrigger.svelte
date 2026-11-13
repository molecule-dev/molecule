<!--
  UserMenuPopoverTrigger: initials avatar plus the account name and email,
  styled as a full-width sidebar card. Toggles the popover panel. A
  disclosure button (aria-expanded + aria-controls), not role=menu.
-->
<script lang="ts">
  import { getContext } from 'svelte'

  import { t } from '@molecule/app-i18n'
  import { getClassMap } from '@molecule/app-ui'

  import { reactInitials } from '../initials.js'
  import { reactStyle } from '../style.js'
  import type { UserMenuPopoverTriggerProps } from '../types.js'
  import {
    USER_MENU_POPOVER_CONTEXT,
    type UserMenuPopoverContextValue,
  } from '../user-menu-popover.svelte.js'

  let {
    ariaLabelKey = 'userMenu.open',
    ariaLabelDefault = 'Open user menu',
    dataMolId = 'user-menu',
    className,
  }: UserMenuPopoverTriggerProps = $props()

  const cm = $derived(getClassMap())
  const ctx = getContext<UserMenuPopoverContextValue>(USER_MENU_POPOVER_CONTEXT)
  if (!ctx) {
    throw new Error('<UserMenuPopoverTrigger> must be rendered inside <UserMenuPopover>')
  }
</script>

<button
  type="button"
  onclick={() => ctx.setOpen(!ctx.open)}
  aria-expanded={ctx.open}
  aria-controls={ctx.panelId}
  aria-label={t(ariaLabelKey, {}, { defaultValue: ariaLabelDefault })}
  data-mol-id={dataMolId}
  class={cm.cn(
    cm.flex({ align: 'center', gap: 'sm' }),
    cm.sp('px', 3),
    cm.sp('py', 3),
    cm.userMenuPopoverTrigger,
    className,
  )}
>
  <span
    aria-hidden="true"
    class={cm.cn(
      cm.w(10),
      cm.h(10),
      cm.roundedFull,
      cm.flex({ align: 'center', justify: 'center' }),
      cm.textSize('sm'),
      cm.fontWeight('bold'),
      cm.shrink0,
    )}
    use:reactStyle={{
      backgroundColor: 'var(--color-primary)',
      color: 'var(--color-on-primary, #ffffff)',
    }}
  >
    {reactInitials(ctx.displayName)}
  </span>
  <span class={cm.cn(cm.flex1, cm.minW(0))}>
    <span
      class={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'), cm.displayBlock, cm.textTruncate)}
    >
      {ctx.displayName}
    </span>
    {#if ctx.email}
      <span class={cm.cn(cm.textSize('xs'), cm.displayBlock, cm.textTruncate, cm.textMuted)}>
        {ctx.email}
      </span>
    {/if}
  </span>
</button>
