/**
 * UserMenuPopover — an inline (non-modal) popover account menu.
 *
 * Unlike `UserMenu` / `SidebarUserCard` (which open their panel in a
 * `<Modal>` drawer), this family renders the panel inline as an
 * absolutely-positioned popover. It auto-dismisses on route change, raw
 * `popstate`, outside click, and `Escape` — so an SPA navigation never
 * leaves the menu hovering over the next page.
 *
 * Compose it:
 *
 * ```tsx
 * <UserMenuPopover guestName={t('userMenu.guestName', {}, { defaultValue: 'Analyst' })}>
 *   <UserMenuPopoverTrigger />
 *   <UserMenuPopoverPanel>
 *     <Link to="/settings">Settings</Link>
 *     <Link to="/datasets">My datasets</Link>
 *     <UserMenuPopoverSignOut />
 *   </UserMenuPopoverPanel>
 * </UserMenuPopover>
 * ```
 *
 * @module
 */

import React, {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'
import { useLocation } from 'react-router-dom'

import { useAuth, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { getInitials } from '../utilities/initials.js'

interface AccountUser {
  name?: string | null
  email?: string | null
}

interface UserMenuPopoverContextValue {
  /** Whether the popover panel is currently open. */
  open: boolean
  /** Set the open state. */
  setOpen: (open: boolean) => void
  /** Resolved display name (auth user's name/email, or the guest label). */
  displayName: string
  /** Resolved account email, when the auth user has one. */
  email: string | undefined
}

const UserMenuPopoverContext = createContext<UserMenuPopoverContextValue | null>(null)

/**
 * Returns the nearest `UserMenuPopoverContext` value, throwing if not inside a `UserMenuPopover`.
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
  children: ReactNode
  /**
   * Label shown when there is no authenticated user. Defaults to the
   * `userMenuPopover.guest` translation (English fallback `"Account"`).
   */
  guestName?: string
  /** Extra className composed onto the relative-positioned container. */
  className?: string
}

/**
 * Container for the inline popover account menu. Owns the open state and
 * the auto-dismiss behaviour (route change, `popstate`, outside click,
 * `Escape`), and provides the resolved account identity to its
 * sub-components via context.
 *
 * @param props - The popover children, optional guest label, and className.
 * @returns The relative-positioned popover container.
 */
export function UserMenuPopover({
  children,
  guestName,
  className,
}: UserMenuPopoverProps): React.JSX.Element {
  const cm = getClassMap()
  const { t } = useTranslation()
  const auth = useAuth<AccountUser>()
  const user = auth.user
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Close on route change so the panel never sticks across navigations.
  useEffect(() => {
    setOpen(false)
  }, [location.pathname, location.search, location.hash])

  // Also close on a raw `popstate` — `useLocation()` only fires when a
  // URL part changes, but a same-route SPA navigation still pops.
  useEffect(() => {
    const onPopState = (): void => setOpen(false)
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  // Close on outside click and Escape while the panel is open.
  useEffect(() => {
    if (!open) return
    const onMouseDown = (event: MouseEvent): void => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onMouseDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onMouseDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const resolvedGuest = guestName ?? t('userMenuPopover.guest', {}, { defaultValue: 'Account' })
  const displayName = user?.name ?? user?.email ?? resolvedGuest
  const email = user?.email ?? undefined

  return (
    <div ref={containerRef} className={cm.cn('relative', className)}>
      <UserMenuPopoverContext.Provider value={{ open, setOpen, displayName, email }}>
        {children}
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
export function UserMenuPopoverTrigger({
  ariaLabelKey = 'userMenu.open',
  ariaLabelDefault = 'Open user menu',
  dataMolId = 'user-menu',
  className,
}: UserMenuPopoverTriggerProps): React.JSX.Element {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { open, setOpen, displayName, email } = usePopoverContext('UserMenuPopoverTrigger')
  return (
    <button
      type="button"
      onClick={() => setOpen(!open)}
      aria-expanded={open}
      aria-haspopup="menu"
      aria-label={t(ariaLabelKey, {}, { defaultValue: ariaLabelDefault })}
      data-mol-id={dataMolId}
      className={cm.cn(
        cm.flex({ align: 'center', gap: 'sm' }),
        cm.sp('px', 3),
        cm.sp('py', 3),
        'w-full text-left rounded-xl bg-surface-container-low hover:bg-surface-container transition-colors',
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cm.cn(
          cm.w(10),
          cm.h(10),
          cm.roundedFull,
          cm.flex({ align: 'center', justify: 'center' }),
          cm.textSize('sm'),
          cm.fontWeight('bold'),
          'shrink-0',
        )}
        style={{
          backgroundColor: 'var(--color-primary)',
          color: 'var(--color-on-primary, #ffffff)',
        }}
      >
        {getInitials(displayName)}
      </span>
      <span className={cm.cn('min-w-0 flex-1')}>
        <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'), 'block truncate')}>
          {displayName}
        </span>
        {email ? (
          <span className={cm.cn(cm.textSize('xs'), 'block truncate text-on-surface-variant')}>
            {email}
          </span>
        ) : null}
      </span>
    </button>
  )
}

/**
 * Props for {@link UserMenuPopoverPanel}.
 */
export interface UserMenuPopoverPanelProps {
  /**
   * Panel body — typically a set of `<Link>` nav items and a
   * `<UserMenuPopoverSignOut />`. Rendered inside a `<nav>` below the
   * built-in identity header.
   */
  children: ReactNode
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
 * The popover panel: an absolutely-positioned card with a built-in
 * identity header (name + email) and a `<nav>` wrapping the caller's nav
 * items. Renders nothing while the popover is closed.
 *
 * Provides only the structural concerns (absolute positioning above the
 * trigger, `rounded-xl` border frame, the header/nav layout). Cosmetic
 * choices — width, background, padding, shadow — are per-app: pass them
 * via `className`. `cn()` concatenates (it does not tailwind-merge), so
 * the panel never bakes a width/background the caller would have to
 * fight.
 *
 * @param props - The nav children, className, and aria-label overrides.
 * @returns The popover panel, or `null` when closed.
 */
export function UserMenuPopoverPanel({
  children,
  className,
  ariaLabelKey = 'userMenu.panelLabel',
  ariaLabelDefault = 'Account menu',
  dataMolId = 'user-menu-panel',
}: UserMenuPopoverPanelProps): React.JSX.Element | null {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { open, displayName, email } = usePopoverContext('UserMenuPopoverPanel')
  if (!open) return null
  return (
    <div
      role="menu"
      aria-label={t(ariaLabelKey, {}, { defaultValue: ariaLabelDefault })}
      data-mol-id={dataMolId}
      className={cm.cn(
        'absolute bottom-full mb-2 z-50 rounded-xl border border-outline-variant',
        className,
      )}
    >
      <header className={cm.cn(cm.sp('pb', 4), 'border-b border-outline-variant')}>
        <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>{displayName}</p>
        {email ? (
          <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>{email}</p>
        ) : null}
      </header>
      <nav
        className={cm.cn(cm.sp('mt', 4), 'space-y-1')}
        aria-label={t('userMenu.navLabel', {}, { defaultValue: 'Account menu' })}
      >
        {children}
      </nav>
    </div>
  )
}

/**
 * Returns a callback that closes the enclosing `UserMenuPopover`. Useful
 * for nav-item `onClick` handlers that should dismiss the popover even
 * when they don't change the route. Returns a no-op when called outside
 * a `UserMenuPopover`.
 *
 * @returns A function that closes the popover.
 */
export function useUserMenuPopoverClose(): () => void {
  const ctx = useContext(UserMenuPopoverContext)
  if (!ctx) return () => {}
  return () => ctx.setOpen(false)
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
 * The sign-out nav item — closes the popover and calls `auth.logout()`.
 * Drop it in as the last child of `<UserMenuPopoverPanel>`.
 *
 * @param props - Label overrides, `data-mol-id`, and className.
 * @returns The sign-out button.
 */
export function UserMenuPopoverSignOut({
  labelKey = 'userMenu.signOut',
  labelDefault = 'Sign out',
  dataMolId = 'user-menu-sign-out',
  className,
}: UserMenuPopoverSignOutProps): React.JSX.Element {
  const cm = getClassMap()
  const { t } = useTranslation()
  const auth = useAuth()
  const { setOpen } = usePopoverContext('UserMenuPopoverSignOut')
  return (
    <button
      type="button"
      data-mol-id={dataMolId}
      onClick={async () => {
        setOpen(false)
        try {
          await auth.logout()
        } catch (_error) {
          // A logout failure should not crash the panel — the user is already
          // treated as signed-out from the UI perspective; the provider may
          // clean up asynchronously or retry on the next request.
        }
      }}
      className={cm.cn(
        cm.sp('px', 3),
        cm.sp('py', 2),
        cm.textSize('sm'),
        cm.fontWeight('semibold'),
        'block w-full text-left rounded-md text-error hover:bg-error/10 transition-colors',
        className,
      )}
    >
      {t(labelKey, {}, { defaultValue: labelDefault })}
    </button>
  )
}
