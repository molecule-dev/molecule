/**
 * SidebarUserCard component.
 *
 * @module
 */

import {
  type Component,
  createEffect,
  createSignal,
  type JSX,
  on,
  Show,
  splitProps,
} from 'solid-js'

import { useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'

import { toStyleProps } from '../utilities/dom.js'
import { getInitials } from '../utilities/initials.js'
import { createAuthState, createLocation } from '../utilities/services.js'
import { Modal } from './Modal.jsx'
import { PanelCloseProvider } from './PanelClose.jsx'

/** The signed-in user shape this component reads. */
interface AccountUserShape {
  /** Display name shown next to the avatar. */
  name?: string | null
  /** Fallback when no `name` is supplied. */
  email?: string | null
  /** Optional image URL for the avatar. */
  avatarUrl?: string | null
}

/**
 * Props for the {@link SidebarUserCard} component.
 *
 * Extends standard `<button>` attributes so callers can pass extra
 * `data-*`, `aria-*`, `style`, or event handler props onto the trigger
 * button without forking.
 */
export interface SidebarUserCardProps extends Omit<
  JSX.ButtonHTMLAttributes<HTMLButtonElement>,
  'aria-label' | 'onClick' | 'children'
> {
  /**
   * Panel content shown inside the drawer/modal (typically the app's
   * `SettingsPanel`). It can dismiss the drawer by calling
   * `usePanelClose()` — no `onClose` prop-threading required.
   */
  children: JSX.Element
  /**
   * Display name override. When omitted, falls back to
   * `getAuthClient().getState().user?.name`, then `email`, then a guest label.
   */
  name?: string
  /**
   * Secondary line under the name (role, plan, status, etc.). When omitted
   * and the auth user has an email, the email is shown instead.
   */
  secondaryLine?: string
  /** Optional avatar image URL — overrides the auth user's `avatarUrl`. */
  avatarUrl?: string
  /** i18n key for the trigger button's aria-label. Default: `'sidebarUserCard.open'`. */
  ariaLabelKey?: string
  /** Fallback aria-label if the i18n key is missing. Default: `'Open account menu'`. */
  ariaLabelDefault?: string
  /**
   * `data-mol-id` for the trigger button. Defaults to `'sidebar-user-card'`.
   */
  dataMolId?: string
  /** Extra classes on the trigger button. */
  className?: string
}

/**
 * Sidebar-resident user-account card: avatar + name + status line, opens the
 * app's settings drawer on click.
 *
 * Drop-in replacement for `<UserMenu />` when the trigger lives inside a
 * vertical sidebar.
 *
 * @param props - Component props (see {@link SidebarUserCardProps}).
 * @returns The trigger button and its settings drawer.
 */
export const SidebarUserCard: Component<SidebarUserCardProps> = (props) => {
  const [local, rest] = splitProps(props, [
    'children',
    'name',
    'secondaryLine',
    'avatarUrl',
    'ariaLabelKey',
    'ariaLabelDefault',
    'dataMolId',
    'className',
    'style',
  ])

  const cm = getClassMap()
  const { t } = useTranslation()
  const { state } = createAuthState<AccountUserShape>()
  const { location } = createLocation()
  const [open, setOpen] = createSignal(false)

  // Close the drawer whenever the route changes. The router updates its
  // location on both in-app navigation and browser back/forward (popstate), so
  // one subscription covers both — without it the drawer stays mounted over
  // the next page and blocks clicks underneath.
  createEffect(
    on(
      () => [location().pathname, location().search] as const,
      () => setOpen(false),
    ),
  )

  const guestName = (): string => t('sidebarUserCard.guest', {}, { defaultValue: 'Guest' })
  const displayName = (): string =>
    local.name ?? state().user?.name ?? state().user?.email ?? guestName()
  const displaySecondary = (): string | undefined =>
    local.secondaryLine ?? state().user?.email ?? undefined
  const displayAvatarUrl = (): string | undefined =>
    local.avatarUrl ?? state().user?.avatarUrl ?? undefined

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t(
          local.ariaLabelKey ?? 'sidebarUserCard.open',
          {},
          {
            defaultValue: local.ariaLabelDefault ?? 'Open account menu',
          },
        )}
        data-mol-id={local.dataMolId ?? 'sidebar-user-card'}
        class={cm.cn(
          cm.flex({ align: 'center', gap: 'sm' }),
          cm.sp('px', 3),
          cm.sp('py', 3),
          cm.sidebarUserCardTrigger,
          local.className,
        )}
        style={toStyleProps(local.style)}
        {...(rest as JSX.ButtonHTMLAttributes<HTMLButtonElement>)}
      >
        <Show
          when={displayAvatarUrl()}
          fallback={
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
              style={toStyleProps({
                backgroundColor: 'var(--color-primary)',
                color: 'var(--color-on-primary, #ffffff)',
              })}
            >
              {getInitials(displayName())}
            </span>
          }
        >
          <img
            src={displayAvatarUrl()}
            alt=""
            class={cm.cn(cm.w(10), cm.h(10), cm.roundedFull, cm.shrink0, cm.objectCover)}
          />
        </Show>
        <span class={cm.cn(cm.minW(0), cm.flex1)}>
          <span
            class={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              cm.displayBlock,
              cm.textTruncate,
            )}
          >
            {displayName()}
          </span>
          <Show when={displaySecondary()}>
            <span class={cm.cn(cm.textSize('xs'), cm.displayBlock, cm.textTruncate, cm.textMuted)}>
              {displaySecondary()}
            </span>
          </Show>
        </span>
      </button>
      <Modal open={open()} onClose={() => setOpen(false)} className={cm.drawer}>
        <PanelCloseProvider close={() => setOpen(false)}>{local.children}</PanelCloseProvider>
      </Modal>
    </>
  )
}
