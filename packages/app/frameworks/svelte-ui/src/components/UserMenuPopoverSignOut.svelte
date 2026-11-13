<!--
  UserMenuPopoverSignOut: the sign-out nav item — closes the popover and
  calls auth.logout(); a logout failure does not crash the panel.
-->
<script lang="ts">
  import { getContext } from 'svelte'

  import { t } from '@molecule/app-i18n'
  import { getClassMap } from '@molecule/app-ui'

  import { useAuth } from '../framework.js'
  import type { UserMenuPopoverSignOutProps } from '../types.js'
  import {
    USER_MENU_POPOVER_CONTEXT,
    type UserMenuPopoverContextValue,
  } from '../user-menu-popover.svelte.js'

  let {
    labelKey = 'userMenu.signOut',
    labelDefault = 'Sign out',
    dataMolId = 'user-menu-sign-out',
    className,
  }: UserMenuPopoverSignOutProps = $props()

  const cm = $derived(getClassMap())
  const { client } = useAuth()
  const ctx = getContext<UserMenuPopoverContextValue>(USER_MENU_POPOVER_CONTEXT)
  if (!ctx) {
    throw new Error('<UserMenuPopoverSignOut> must be rendered inside <UserMenuPopover>')
  }
</script>

<button
  type="button"
  data-mol-id={dataMolId}
  onclick={async () => {
    ctx.setOpen(false)
    try {
      await client.logout?.()
    } catch (_error) {
      // A logout failure should not crash the panel — the user is already
      // treated as signed-out from the UI perspective.
    }
  }}
  class={cm.cn(
    cm.sp('px', 3),
    cm.sp('py', 2),
    cm.textSize('sm'),
    cm.fontWeight('semibold'),
    cm.displayBlock,
    cm.w('full'),
    cm.textError,
    cm.userMenuPopoverSignOut,
    className,
  )}
>
  {t(labelKey, {}, { defaultValue: labelDefault })}
</button>
