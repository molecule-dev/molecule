/**
 * SidebarUserCard component.
 *
 * @module
 */

import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { useEffect, useState } from 'react'

import { useAuth, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { Modal } from './Modal.js'

/**
 * Compute up-to-two-letter initials from a display name or email.
 *
 * @param value - The name or email to derive initials from.
 * @returns The uppercased initials, or `'?'` when no usable input is given.
 */
function getInitials(value: string | null | undefined): string {
  if (!value) return '?'
  const cleaned = value.includes('@') ? value.split('@')[0] : value
  const parts = cleaned.split(/[\s._-]+/).filter(Boolean)
  if (parts.length === 0) return '?'
  const first = parts[0]?.[0] ?? ''
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : ''
  return (first + last).toUpperCase().slice(0, 2) || '?'
}

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
 * button without forking. The named props below cover the common
 * customization points.
 */
export interface SidebarUserCardProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label' | 'onClick' | 'children'> {
  /**
   * Render function for the panel shown inside the drawer/modal.
   * Receives an `onClose` callback so the panel's own close-button
   * can dismiss the drawer.
   */
  renderPanel: (args: { onClose: () => void }) => ReactNode
  /**
   * Display name override. When omitted, falls back to
   * `useAuth().user?.name`, then `email`, then a guest label.
   */
  name?: string
  /**
   * Secondary line under the name (role, plan, status, etc.).
   * Apps typically pass something like `t('sidebar.memberStatus', {}, { defaultValue: 'Premium Member' })`.
   * When omitted and the auth user has an email, the email is shown instead.
   */
  secondaryLine?: string
  /** Optional avatar image URL — overrides `useAuth().user?.avatarUrl`. */
  avatarUrl?: string
  /** i18n key for the trigger button's aria-label. Default: `'sidebarUserCard.open'`. */
  ariaLabelKey?: string
  /** Fallback aria-label if the i18n key is missing. Default: `'Open account menu'`. */
  ariaLabelDefault?: string
}

/**
 * Sidebar-resident user-account card: avatar + name + status line, opens
 * the app's settings drawer on click.
 *
 * Drop-in replacement for `<UserMenu />` when the trigger lives inside a
 * vertical sidebar (e.g. as the `userMenu` slot of `<SidebarLayout>`).
 * Reads name/email/avatar from `useAuth()` by default; pass explicit
 * `name` / `secondaryLine` / `avatarUrl` props to override.
 *
 * Ships with `data-mol-id="sidebar-user-card"` on the trigger button
 * by default for AI-agent / e2e selection. Callers can override by
 * passing `data-mol-id` as an extra prop.
 */
export function SidebarUserCard({
  renderPanel,
  name,
  secondaryLine,
  avatarUrl,
  ariaLabelKey = 'sidebarUserCard.open',
  ariaLabelDefault = 'Open account menu',
  className,
  ...rest
}: SidebarUserCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const auth = useAuth<AccountUserShape>()
  const user = auth.user
  const [open, setOpen] = useState(false)

  // Close drawer on browser back/forward navigation so subsequent
  // SPA route changes don't leave the modal overlay covering the page.
  useEffect(() => {
    const onPop = () => setOpen(false)
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const guestName = t('sidebarUserCard.guest', {}, { defaultValue: 'Guest' })
  const displayName = name ?? user?.name ?? user?.email ?? guestName
  const displaySecondary = secondaryLine ?? user?.email ?? undefined
  const displayAvatarUrl = avatarUrl ?? user?.avatarUrl ?? undefined

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t(ariaLabelKey, {}, { defaultValue: ariaLabelDefault })}
        data-mol-id="sidebar-user-card"
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'sm' }),
          cm.sp('px', 3),
          cm.sp('py', 3),
          'w-full text-left rounded-xl bg-surface-container-low hover:bg-surface-container transition-colors',
          className,
        )}
        {...rest}
      >
        {displayAvatarUrl ? (
          <img
            src={displayAvatarUrl}
            alt=""
            className={cm.cn(cm.w(10), cm.h(10), cm.roundedFull, 'shrink-0 object-cover')}
          />
        ) : (
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
        )}
        <span className={cm.cn('min-w-0 flex-1')}>
          <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'), 'block truncate')}>
            {displayName}
          </span>
          {displaySecondary ? (
            <span className={cm.cn(cm.textSize('xs'), 'block truncate text-on-surface-variant')}>
              {displaySecondary}
            </span>
          ) : null}
        </span>
      </button>
      <Modal open={open} onClose={() => setOpen(false)} className={cm.drawer}>
        {renderPanel({ onClose: () => setOpen(false) })}
      </Modal>
    </>
  )
}
