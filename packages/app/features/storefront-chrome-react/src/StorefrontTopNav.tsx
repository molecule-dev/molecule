/**
 * Storefront top nav: brand + horizontal nav links + icon-action cluster
 * (search, wishlist, cart-with-badge, profile dropdown).
 *
 * Stateless about auth and cart counts — the consumer supplies them
 * via props so this component can be reused in apps with different
 * auth providers and cart shapes.
 *
 * @module
 */

import { type JSX, type ReactNode, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'

import { getClassMap } from '@molecule/app-ui'

import type { NavActionSpec, NavLinkSpec, ProfileMenuItem } from './types.js'

/** Props for the {@link StorefrontTopNav} component. */
export interface StorefrontTopNavProps {
  brand: ReactNode
  brandTo?: string
  links?: NavLinkSpec[]
  actions?: NavActionSpec[]
  isAuthenticated: boolean
  /**
   * Avatar image URL. OPTIONAL enhancement only — the account/sign-in
   * menu always renders so it is reachable without one. When absent the
   * trigger falls back to `profileInitials`, else a default avatar icon.
   */
  profileImageUrl?: string
  /**
   * Uppercase initials shown in the avatar when no `profileImageUrl` is
   * given (e.g. "JD"). Falls back to a default avatar icon when omitted.
   */
  profileInitials?: string
  /** Avatar alt text. Defaults to English "User profile" — pass a translated string. */
  profileImageAlt?: string
  /** Accessible name for the account-menu trigger. Defaults to English "Account menu". */
  accountMenuLabel?: string
  authedMenu?: ProfileMenuItem[]
  unauthedMenu?: ProfileMenuItem[]
  onSignOut?: () => void
  /** Sign-out button label. Defaults to English "Sign Out" — pass a translated string. */
  signOutLabel?: ReactNode
  className?: string
}

/** Storefront top navigation bar. */
export function StorefrontTopNav({
  brand,
  brandTo = '/',
  links = [],
  actions = [],
  isAuthenticated,
  profileImageUrl,
  profileInitials,
  profileImageAlt = 'User profile',
  accountMenuLabel = 'Account menu',
  authedMenu = [],
  unauthedMenu = [],
  onSignOut,
  signOutLabel = 'Sign Out',
  className,
}: StorefrontTopNavProps): JSX.Element {
  const cm = getClassMap()
  const [profileOpen, setProfileOpen] = useState(false)
  const profileRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!profileOpen) return
    const handler = (e: MouseEvent): void => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [profileOpen])

  return (
    <header className={cm.cn(cm.storefrontChromeTopNav, className)} data-mol-id="nav-shell-01">
      <nav
        className={cm.cn(
          cm.flex({ justify: 'between', align: 'center' }),
          cm.sp('px', 6),
          cm.h(16),
          cm.mxAuto,
          cm.w('full'),
          cm.storefrontChromeTopNavInner,
        )}
        data-mol-id="nav-layout-01"
      >
        <div className={cm.flex({ align: 'center' })} data-mol-id="brand-container-01">
          <Link
            className={cm.cn(cm.textSize('2xl'), cm.textPrimary, cm.storefrontChromeTopNavBrand)}
            data-mol-id="brand-logo-01"
            to={brandTo}
          >
            {brand}
          </Link>
        </div>

        {links.length > 0 ? (
          <ul
            className={cm.cn(cm.flex({ align: 'center' }), cm.storefrontChromeTopNavLinks)}
            data-mol-id="nav-links-list-01"
          >
            {links.map((link) => (
              <li key={link.to}>
                <Link
                  className={cm.cn(
                    cm.textSize('sm'),
                    cm.fontWeight('medium'),
                    link.active
                      ? cm.cn(cm.textPrimary, cm.sp('pb', 1), cm.storefrontChromeTopNavLinkActive)
                      : cm.storefrontChromeTopNavLink,
                  )}
                  data-mol-id={link.dataMolId}
                  to={link.to}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        ) : null}

        <div className={cm.cn(cm.flex({ align: 'center', gap: 4 }))} data-mol-id="nav-actions-01">
          {actions.map((action) => (
            <Link
              key={action.to}
              className={cm.cn(cm.storefrontChromeTopNavAction)}
              data-mol-id={action.dataMolId}
              to={action.to}
              aria-label={action.ariaLabel}
            >
              <span className={cm.iconGlyphFont} data-icon={action.icon}>
                {action.icon}
              </span>
              {action.badgeCount && action.badgeCount > 0 ? (
                <span
                  className={cm.cn(
                    cm.roundedFull,
                    cm.fontWeight('bold'),
                    cm.storefrontChromeTopNavBadge,
                  )}
                >
                  {action.badgeCount}
                </span>
              ) : null}
            </Link>
          ))}

          {/* The account/sign-in menu ALWAYS renders so it is reachable for
              every user; the avatar image is an optional enhancement that
              falls back to initials, then a default avatar icon. */}
          <div
            className={cm.cn(cm.position('relative'))}
            data-mol-id="profile-wrapper-01"
            ref={profileRef}
          >
            <button
              type="button"
              aria-label={accountMenuLabel}
              aria-haspopup="menu"
              aria-expanded={profileOpen}
              className={cm.cn(
                cm.w(8),
                cm.h(8),
                cm.roundedFull,
                cm.cursorPointer,
                cm.touchTarget,
                cm.borderAll,
                cm.flex({ align: 'center', justify: 'center' }),
              )}
              // `overflow: hidden` clips the avatar image to the round button;
              // the ClassMap has no overflow token, so it stays inline.
              style={{ overflow: 'hidden' }}
              data-mol-id="profile-trigger-01"
              onClick={() => setProfileOpen((o) => !o)}
            >
              {profileImageUrl ? (
                <img
                  alt={profileImageAlt}
                  className={cm.cn(cm.w('full'), cm.h('full'), cm.objectCover)}
                  src={profileImageUrl}
                />
              ) : profileInitials ? (
                <span className={cm.cn(cm.textSize('xs'), cm.fontWeight('bold'), cm.textPrimary)}>
                  {profileInitials}
                </span>
              ) : (
                <span className={cm.cn(cm.iconGlyphFont, cm.textMuted)} data-icon="person">
                  person
                </span>
              )}
            </button>
            {profileOpen ? (
              <div
                className={cm.cn(
                  cm.sp('mt', 2),
                  cm.sp('py', 1),
                  cm.w(48),
                  cm.storefrontChromeTopNavMenu,
                )}
                data-mol-id="profile-dropdown-01"
              >
                {(isAuthenticated ? authedMenu : unauthedMenu).map((item) => (
                  <Link
                    key={item.to}
                    className={cm.cn(
                      cm.sp('px', 4),
                      cm.sp('py', 2),
                      cm.textSize('sm'),
                      cm.storefrontChromeTopNavMenuItem,
                    )}
                    data-mol-id={item.dataMolId}
                    onClick={() => setProfileOpen(false)}
                    to={item.to}
                  >
                    {item.label}
                  </Link>
                ))}
                {isAuthenticated && onSignOut ? (
                  <>
                    <hr className={cm.cn(cm.sp('my', 1), cm.storefrontChromeTopNavMenuDivider)} />
                    <button
                      type="button"
                      // A menu row, not a CTA: the design system's dropdown-item
                      // token carries the hover/focus treatment, so it can never
                      // drift from the links above it.
                      className={cm.cn(
                        cm.dropdownItem,
                        cm.w('full'),
                        cm.textSize('sm'),
                        cm.touchTargetCompact,
                      )}
                      data-mol-id="profile-link-signout"
                      onClick={() => {
                        setProfileOpen(false)
                        onSignOut()
                      }}
                    >
                      {signOutLabel}
                    </button>
                  </>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </nav>
    </header>
  )
}

export default StorefrontTopNav
