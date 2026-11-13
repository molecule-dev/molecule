/**
 * UserMenuPopover — an inline (non-modal) popover account menu.
 *
 * Unlike `UserMenu` / `SidebarUserCard` (which open their panel in a
 * `<Modal>` drawer), this family renders the panel inline as an
 * absolutely-positioned popover. It auto-dismisses on route change, raw
 * `popstate`, outside click, and `Escape` — so an SPA navigation never
 * leaves the menu hovering over the next page.
 *
 * @module
 */

import {
  type Accessor,
  type Component,
  createContext,
  createEffect,
  createSignal,
  createUniqueId,
  type JSX,
  on,
  onCleanup,
  Show,
  splitProps,
  useContext,
} from 'solid-js'

import { useAuth, useLocation, useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'

import { getInitials } from '../utilities/initials.js'

/** The signed-in user shape this family reads. */
interface AccountUser {
  /** Display name. */
  name?: string | null
  /** Account email. */
  email?: string | null
}

/** What the root provides to its sub-components. */
interface UserMenuPopoverContextValue {
  /** Whether the popover panel is currently open. */
  open: Accessor<boolean>
  /** Set the open state. */
  setOpen: (open: boolean) => void
  /** Resolved display name (auth user's name/email, or the guest label). */
  displayName: Accessor<string>
  /** Resolved account email, when the auth user has one. */
  email: Accessor<string | undefined>
  /**
   * Shared id linking the trigger's `aria-controls` to the panel's `id` —
   * this is a disclosure (a plain toggled region), not a `role="menu"`.
   */
  panelId: string
}

const UserMenuPopoverContext = createContext<UserMenuPopoverContextValue | null>(null)

/**
 * Returns the nearest `UserMenuPopoverContext` value, throwing if not inside a
 * `UserMenuPopover`.
 *
 * @param component - The calling sub-component's name, for the error message.
 * @returns The popover context.
 */
function usePopoverContext(component: string): UserMenuPopoverContextValue {
  const ctx = useContext(UserMenuPopoverContext)
  if (!ctx) {
    throw new Error(`<${component}> must be rendered inside <UserMenuPopover>`)
  }
  return ctx
}

/**
 * Props for {@link UserMenuPopover}.
 */
export interface UserMenuPopoverProps {
  /**
   * The trigger and panel — typically `<UserMenuPopoverTrigger />` and
   * `<UserMenuPopoverPanel>`.
   */
  children: JSX.Element
  /**
   * Label shown when there is no authenticated user. Defaults to the
   * `userMenuPopover.guest` translation (English fallback `"Account"`).
   */
  guestName?: string
  /** Extra className composed onto the relative-positioned container. */
  className?: string
}

/**
 * Container for the inline popover account menu. Owns the open state and the
 * auto-dismiss behaviour (route change, `popstate`, outside click, `Escape`),
 * and provides the resolved account identity to its sub-components.
 *
 * @param props - The popover children, optional guest label, and className.
 * @returns The relative-positioned popover container.
 */
export const UserMenuPopover: Component<UserMenuPopoverProps> = (props) => {
  const [local] = splitProps(props, ['children', 'guestName', 'className'])
  const cm = getClassMap()
  const { t } = useTranslation()
  const { user } = useAuth<AccountUser>()
  const location = useLocation()
  const [open, setOpen] = createSignal(false)
  const panelId = createUniqueId()
  let containerRef: HTMLDivElement | undefined

  // Close on route change so the panel never sticks across navigations.
  createEffect(
    on(
      () => [location().pathname, location().search, location().hash] as const,
      () => setOpen(false),
    ),
  )

  // Also close on a raw `popstate` — a location subscription only fires when a
  // URL part changes, but a same-route SPA navigation still pops.
  createEffect(() => {
    const onPopState = (): void => {
      setOpen(false)
    }
    window.addEventListener('popstate', onPopState)
    onCleanup(() => window.removeEventListener('popstate', onPopState))
  })

  // Close on outside click and Escape while the panel is open.
  createEffect(
    on(open, (isOpen) => {
      if (!isOpen) return
      const onMouseDown = (event: MouseEvent): void => {
        const container = containerRef
        if (container && !container.contains(event.target as Node)) {
          setOpen(false)
        }
      }
      const onKeyDown = (event: KeyboardEvent): void => {
        if (event.key === 'Escape') setOpen(false)
      }
      document.addEventListener('mousedown', onMouseDown)
      document.addEventListener('keydown', onKeyDown)
      onCleanup(() => {
        document.removeEventListener('mousedown', onMouseDown)
        document.removeEventListener('keydown', onKeyDown)
      })
    }),
  )

  const resolvedGuest = (): string =>
    local.guestName ?? t('userMenuPopover.guest', {}, { defaultValue: 'Account' })
  const displayName = (): string => user()?.name ?? user()?.email ?? resolvedGuest()
  const email = (): string | undefined => user()?.email ?? undefined

  return (
    <div
      ref={(element) => {
        containerRef = element
      }}
      class={cm.cn(cm.position('relative'), local.className)}
    >
      <UserMenuPopoverContext.Provider value={{ open, setOpen, displayName, email, panelId }}>
        {local.children}
      </UserMenuPopoverContext.Provider>
    </div>
  )
}

/**
 * Props for {@link UserMenuPopoverTrigger}.
 */
export interface UserMenuPopoverTriggerProps {
  /** i18n key for the trigger's aria-label. Default: `'userMenu.open'`. */
  ariaLabelKey?: string
  /** Fallback aria-label if the i18n key is missing. Default: `'Open user menu'`. */
  ariaLabelDefault?: string
  /** `data-mol-id` for the trigger button. Default: `'user-menu'`. */
  dataMolId?: string
  /** Extra className composed onto the trigger button. */
  className?: string
}

/**
 * The trigger button: an initials avatar plus the account name and email,
 * styled as a full-width sidebar card. Toggles the popover panel.
 *
 * @param props - aria-label overrides, `data-mol-id`, and className.
 * @returns The popover trigger button.
 */
export const UserMenuPopoverTrigger: Component<UserMenuPopoverTriggerProps> = (props) => {
  const [local] = splitProps(props, ['ariaLabelKey', 'ariaLabelDefault', 'dataMolId', 'className'])
  const cm = getClassMap()
  const { t } = useTranslation()
  const context = usePopoverContext('UserMenuPopoverTrigger')

  return (
    <button
      type="button"
      onClick={() => context.setOpen(!context.open())}
      // Disclosure pattern, not a menu: the panel renders a header + a `<nav>`
      // of arbitrary links, which is invalid content for `role="menu"`.
      // `aria-expanded` + `aria-controls` is the standard disclosure contract.
      aria-expanded={context.open()}
      aria-controls={context.panelId}
      aria-label={t(
        local.ariaLabelKey ?? 'userMenu.open',
        {},
        {
          defaultValue: local.ariaLabelDefault ?? 'Open user menu',
        },
      )}
      data-mol-id={local.dataMolId ?? 'user-menu'}
      class={cm.cn(
        cm.flex({ align: 'center', gap: 'sm' }),
        cm.sp('px', 3),
        cm.sp('py', 3),
        cm.userMenuPopoverTrigger,
        local.className,
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
        style={{
          'background-color': 'var(--color-primary)',
          color: 'var(--color-on-primary, #ffffff)',
        }}
      >
        {getInitials(context.displayName())}
      </span>
      <span class={cm.cn(cm.flex1, cm.minW(0))}>
        <span
          class={cm.cn(
            cm.textSize('sm'),
            cm.fontWeight('semibold'),
            cm.displayBlock,
            cm.textTruncate,
          )}
        >
          {context.displayName()}
        </span>
        <Show when={context.email()}>
          <span class={cm.cn(cm.textSize('xs'), cm.displayBlock, cm.textTruncate, cm.textMuted)}>
            {context.email()}
          </span>
        </Show>
      </span>
    </button>
  )
}

/**
 * Props for {@link UserMenuPopoverPanel}.
 */
export interface UserMenuPopoverPanelProps {
  /**
   * Panel body — typically a set of `<a>` nav items and a
   * `<UserMenuPopoverSignOut />`. Rendered inside a `<nav>` below the
   * built-in identity header.
   */
  children: JSX.Element
  /** Extra className composed onto the absolute-positioned panel. */
  className?: string
  /** i18n key for the panel's aria-label. Default: `'userMenu.panelLabel'`. */
  ariaLabelKey?: string
  /** Fallback aria-label if the i18n key is missing. Default: `'Account menu'`. */
  ariaLabelDefault?: string
  /** `data-mol-id` for the panel. Default: `'user-menu-panel'`. */
  dataMolId?: string
}

/**
 * The popover panel: an absolutely-positioned card with a built-in identity
 * header (name + email) and a `<nav>` wrapping the caller's nav items.
 * Renders nothing while the popover is closed.
 *
 * @param props - The nav children, className, and aria-label overrides.
 * @returns The popover panel, or nothing when closed.
 */
export const UserMenuPopoverPanel: Component<UserMenuPopoverPanelProps> = (props) => {
  const [local] = splitProps(props, [
    'children',
    'className',
    'ariaLabelKey',
    'ariaLabelDefault',
    'dataMolId',
  ])
  const cm = getClassMap()
  const { t } = useTranslation()
  const context = usePopoverContext('UserMenuPopoverPanel')

  return (
    <Show when={context.open()}>
      {/* A disclosure region, not role="menu": the panel renders a header PLUS
          a `<nav>` of arbitrary caller-supplied links. `id` pairs with the
          trigger's `aria-controls`; the accessible name lives on the `<nav>`
          landmark below. */}
      <div
        id={context.panelId}
        data-mol-id={local.dataMolId ?? 'user-menu-panel'}
        class={cm.cn(cm.userMenuPopoverPanel, local.className)}
      >
        <header class={cm.cn(cm.sp('pb', 4), cm.userMenuPopoverHeader)}>
          <p class={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>{context.displayName()}</p>
          <Show when={context.email()}>
            <p class={cm.cn(cm.textSize('xs'), cm.textMuted)}>{context.email()}</p>
          </Show>
        </header>
        <nav
          class={cm.cn(cm.sp('mt', 4), cm.stack(1))}
          aria-label={t(
            local.ariaLabelKey ?? 'userMenu.panelLabel',
            {},
            {
              defaultValue: local.ariaLabelDefault ?? 'Account menu',
            },
          )}
        >
          {local.children}
        </nav>
      </div>
    </Show>
  )
}

/**
 * Returns a callback that closes the enclosing `UserMenuPopover`. Useful for
 * nav-item `onClick` handlers that should dismiss the popover even when they
 * don't change the route. Returns a no-op when called outside a
 * `UserMenuPopover`.
 *
 * @returns A function that closes the popover.
 */
export function useUserMenuPopoverClose(): () => void {
  const context = useContext(UserMenuPopoverContext)
  if (!context) return () => {}
  return () => context.setOpen(false)
}

/**
 * Props for {@link UserMenuPopoverSignOut}.
 */
export interface UserMenuPopoverSignOutProps {
  /** i18n key for the button label. Default: `'userMenu.signOut'`. */
  labelKey?: string
  /** Fallback label if the i18n key is missing. Default: `'Sign out'`. */
  labelDefault?: string
  /** `data-mol-id` for the button. Default: `'user-menu-sign-out'`. */
  dataMolId?: string
  /** Extra className composed onto the button. */
  className?: string
}

/**
 * The sign-out nav item — closes the popover and calls the auth client's
 * `logout()`. Drop it in as the last child of `<UserMenuPopoverPanel>`.
 *
 * @param props - Label overrides, `data-mol-id`, and className.
 * @returns The sign-out button.
 */
export const UserMenuPopoverSignOut: Component<UserMenuPopoverSignOutProps> = (props) => {
  const [local] = splitProps(props, ['labelKey', 'labelDefault', 'dataMolId', 'className'])
  const cm = getClassMap()
  const { t } = useTranslation()
  const { logout } = useAuth()
  const context = usePopoverContext('UserMenuPopoverSignOut')

  return (
    <button
      type="button"
      data-mol-id={local.dataMolId ?? 'user-menu-sign-out'}
      onClick={async () => {
        context.setOpen(false)
        try {
          await logout()
        } catch (_error) {
          // A logout failure should not crash the panel — the user is already
          // treated as signed-out from the UI perspective; the provider may
          // clean up asynchronously or retry on the next request.
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
        local.className,
      )}
    >
      {t(
        local.labelKey ?? 'userMenu.signOut',
        {},
        {
          defaultValue: local.labelDefault ?? 'Sign out',
        },
      )}
    </button>
  )
}
