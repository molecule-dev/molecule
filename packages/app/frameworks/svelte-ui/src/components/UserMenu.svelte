<!--
  UserMenu: avatar-style trigger that opens the app's settings panel in a
  drawer. The panel content is passed as children and dismisses the drawer
  via usePanelClose(); the drawer closes on route change.
-->
<script lang="ts">
  import { getClassMap } from '@molecule/app-ui'

  import { useI18n, useLocation } from '../framework.js'
  import type { UserMenuProps } from '../types.js'
  import Button from './Button.svelte'
  import Icon from './Icon.svelte'
  import Modal from './Modal.svelte'
  import PanelCloseProvider from './PanelCloseProvider.svelte'

  let {
    children,
    ariaLabelKey = 'userMenu.open',
    ariaLabelDefault = 'Open user menu',
    triggerIcon = 'user',
    triggerIconSize = 20,
    dataMolId = 'user-menu',
    className,
    disabled,
    onClick,
    side = 'right',
  }: UserMenuProps = $props()

  const { t } = useI18n()
  const location = useLocation()
  const cm = $derived(getClassMap())
  let open = $state(false)

  // Close the drawer whenever the route changes (in-app navigation and
  // back/forward both update the location).
  $effect(() => {
    void $location.pathname
    void $location.search
    open = false
  })
</script>

<Button
  variant="ghost"
  size="sm"
  onClick={onClick ?? (() => (open = true))}
  aria-label={$t(ariaLabelKey, {}, { defaultValue: ariaLabelDefault })}
  data-mol-id={dataMolId}
  className={cm.cn(cm.minH(10), cm.minW(10), className)}
  {disabled}
>
  <Icon name={triggerIcon} size={triggerIconSize} />
</Button>
<Modal
  {open}
  onClose={() => (open = false)}
  className={side === 'left' ? cm.cn(cm.drawer, cm.drawerLeft) : cm.drawer}
  aria-label={$t('userMenu.panelLabel', {}, { defaultValue: 'Account menu' })}
>
  <PanelCloseProvider close={() => (open = false)}>{@render children?.()}</PanelCloseProvider>
</Modal>
