<!--
  SidebarUserCard: sidebar-resident user-account card (avatar + name +
  status line) that opens the app's settings drawer on click. Reads
  name/email/avatarUrl from the auth client unless overridden; the panel
  content dismisses the drawer via usePanelClose(); closes on route change.
-->
<script lang="ts">
  import { getClassMap } from '@molecule/app-ui'

  import { reactAttrs, withoutEvents } from '../attrs.js'
  import { spreadEvents } from '../dom.js'
  import { useAuth, useI18n, useLocation } from '../framework.js'
  import { reactInitials } from '../initials.js'
  import { reactStyle } from '../style.js'
  import type { SidebarUserCardProps } from '../types.js'
  import Modal from './Modal.svelte'
  import PanelCloseProvider from './PanelCloseProvider.svelte'

  let {
    children,
    name,
    secondaryLine,
    avatarUrl,
    ariaLabelKey = 'sidebarUserCard.open',
    ariaLabelDefault = 'Open account menu',
    dataMolId = 'sidebar-user-card',
    className,
    ...rest
  }: SidebarUserCardProps = $props()

  const { state: authState } = useAuth()
  const { t } = useI18n()
  const location = useLocation()
  const cm = $derived(getClassMap())
  let open = $state(false)

  // Close the drawer whenever the route changes.
  $effect(() => {
    void $location.pathname
    void $location.search
    open = false
  })

  const user = $derived(
    ($authState.user ?? null) as {
      name?: string | null
      email?: string | null
      avatarUrl?: string | null
    } | null,
  )
  const guestName = $derived($t('sidebarUserCard.guest', {}, { defaultValue: 'Guest' }))
  const displayName = $derived(name ?? user?.name ?? user?.email ?? guestName)
  const displaySecondary = $derived(secondaryLine ?? user?.email ?? undefined)
  const displayAvatarUrl = $derived(avatarUrl ?? user?.avatarUrl ?? undefined)
</script>

<button
  type="button"
  onclick={() => (open = true)}
  aria-label={$t(ariaLabelKey, {}, { defaultValue: ariaLabelDefault })}
  data-mol-id={dataMolId}
  class={cm.cn(
    cm.flex({ align: 'center', gap: 'sm' }),
    cm.sp('px', 3),
    cm.sp('py', 3),
    cm.sidebarUserCardTrigger,
    className,
  )}
  {...reactAttrs(withoutEvents(rest))}
  use:spreadEvents={rest}
>
  {#if displayAvatarUrl}
    <img
      src={displayAvatarUrl}
      alt=""
      class={cm.cn(cm.w(10), cm.h(10), cm.roundedFull, cm.shrink0, cm.objectCover)}
    />
  {:else}
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
      {reactInitials(displayName)}
    </span>
  {/if}
  <span class={cm.cn(cm.minW(0), cm.flex1)}>
    <span
      class={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'), cm.displayBlock, cm.textTruncate)}
    >
      {displayName}
    </span>
    {#if displaySecondary}
      <span class={cm.cn(cm.textSize('xs'), cm.displayBlock, cm.textTruncate, cm.textMuted)}>
        {displaySecondary}
      </span>
    {/if}
  </span>
</button>
<Modal {open} onClose={() => (open = false)} className={cm.drawer}>
  <PanelCloseProvider close={() => (open = false)}>{@render children?.()}</PanelCloseProvider>
</Modal>
