<!--
  UserMenuPopover: container for the inline (non-modal) popover account
  menu. Owns the open state and the auto-dismiss behaviour (route change,
  popstate, outside click, Escape) and provides the resolved account
  identity to its sub-components via context.
-->
<script lang="ts">
  import { setContext } from 'svelte'

  import { OverlayLayer } from '@molecule/app-overlay-dom'
  import { useAuth, useLocation, useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'

  import { useGeneratedId } from '../dom.js'
  import type { UserMenuPopoverProps } from '../types.js'
  import { USER_MENU_POPOVER_CONTEXT } from '../user-menu-popover.svelte.js'

  let { children, guestName, className }: UserMenuPopoverProps = $props()

  const cm = $derived(getClassMap())
  const { state: authState } = useAuth()
  const { t } = useTranslation()
  const location = useLocation()
  const panelId = useGeneratedId()

  let open = $state(false)
  let containerEl = $state<HTMLDivElement | null>(null)
  const layer = new OverlayLayer()
  const target = {
    get current() {
      return containerEl
    },
  }
  const close = (): void => {
    open = false
  }

  // Close on route change so the panel never sticks across navigations.
  $effect(() => {
    void $location.pathname
    void $location.search
    void $location.hash
    open = false
  })

  // Also close on a raw popstate — useLocation only fires when a URL part
  // changes, but a same-route SPA navigation still pops.
  $effect(() => {
    const view = containerEl?.ownerDocument.defaultView
    view?.addEventListener('popstate', close)
    return () => view?.removeEventListener('popstate', close)
  })

  // Close on outside click and Escape while the panel is open.
  $effect(() => {
    layer.sync({
      open,
      kind: 'popover',
      surface: target,
      anchor: target,
      dismissKey: true,
      outside: { inside: [target], phase: 'start' },
      onDismiss: close,
    })
  })
  $effect(() => () => layer.release())

  const user = $derived(
    ($authState.user ?? null) as { name?: string | null; email?: string | null } | null,
  )
  // Feeds `displayName` below, so a derived carries it; `t` reads the binding's
  // locale version, so it follows a locale switch without a store read.
  const resolvedGuest = $derived(
    guestName ?? t('userMenuPopover.guest', {}, { defaultValue: 'Account' }),
  )
  const displayName = $derived(user?.name ?? user?.email ?? resolvedGuest)
  const email = $derived(user?.email ?? undefined)

  setContext(USER_MENU_POPOVER_CONTEXT, {
    get open() {
      return open
    },
    setOpen: (next: boolean) => (open = next),
    get displayName() {
      return displayName
    },
    get email() {
      return email
    },
    panelId,
  })
</script>

<div bind:this={containerEl} class={cm.cn(cm.position('relative'), className)}>
  {@render children?.()}
</div>
