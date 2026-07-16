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
import { Link } from 'react-router-dom'

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
   * Avatar image URL. The profile dropdown — including the signed-out
   * `unauthedMenu` — renders ONLY when this is truthy; pass a placeholder
   * avatar URL for signed-out users or no menu appears at all.
   */
  profileImageUrl?: string
  /** Avatar alt text. Defaults to English "User profile" — pass a translated string. */
  profileImageAlt?: string
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
  profileImageAlt = 'User profile',
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
    <header
      className={cm.cn(
        'bg-white dark:bg-slate-900 sticky top-0 z-50 border-b border-gray-200 dark:border-slate-800 shadow-sm',
        className,
      )}
      data-mol-id="nav-shell-01"
    >
      <nav
        className={cm.cn(
          cm.flex({ justify: 'between', align: 'center' }),
          cm.sp('px', 6),
          cm.h(16),
          cm.mxAuto,
          cm.w('full'),
          'max-w-[1280px]',
        )}
        data-mol-id="nav-layout-01"
      >
        <div className={cm.flex({ align: 'center' })} data-mol-id="brand-container-01">
          <Link
            className={cm.cn(cm.textSize('2xl'), cm.textPrimary, 'font-black')}
            data-mol-id="brand-logo-01"
            to={brandTo}
          >
            {brand}
          </Link>
        </div>

        {links.length > 0 ? (
          <ul
            className={cm.cn(cm.flex({ align: 'center' }), 'hidden md:flex gap-6')}
            data-mol-id="nav-links-list-01"
          >
            {links.map((link) => (
              <li key={link.to}>
                <Link
                  className={cm.cn(
                    cm.textSize('sm'),
                    cm.fontWeight('medium'),
                    link.active
                      ? cm.cn(cm.textPrimary, cm.sp('pb', 1), 'font-sans border-b-2 border-primary')
                      : 'font-sans text-gray-600 hover:text-primary transition-colors',
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
              className={cm.cn(
                'p-2 text-gray-600 hover:text-primary transition-all scale-95 active:opacity-80 relative',
              )}
              data-mol-id={action.dataMolId}
              to={action.to}
              aria-label={action.ariaLabel}
            >
              <span className={cm.cn('material-symbols-outlined')} data-icon={action.icon}>
                {action.icon}
              </span>
              {action.badgeCount && action.badgeCount > 0 ? (
                <span
                  className={cm.cn(
                    cm.roundedFull,
                    cm.fontWeight('bold'),
                    'absolute -top-2 -right-2 bg-primary text-white text-[10px] px-1.5 py-0.5',
                  )}
                >
                  {action.badgeCount}
                </span>
              ) : null}
            </Link>
          ))}

          {profileImageUrl ? (
            <div className={cm.cn('relative')} data-mol-id="profile-wrapper-01" ref={profileRef}>
              <div
                className={cm.cn(
                  cm.w(8),
                  cm.h(8),
                  cm.roundedFull,
                  cm.cursorPointer,
                  'overflow-hidden border border-gray-200',
                )}
                data-mol-id="profile-trigger-01"
                onClick={() => setProfileOpen((o) => !o)}
              >
                <img
                  alt={profileImageAlt}
                  className={cm.cn(cm.w('full'), cm.h('full'), 'object-cover')}
                  src={profileImageUrl}
                />
              </div>
              {profileOpen ? (
                <div
                  className={cm.cn(
                    cm.sp('mt', 2),
                    cm.sp('py', 1),
                    cm.w(48),
                    'absolute right-0 bg-white border border-gray-100 rounded-lg shadow-lg z-50',
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
                        'block text-gray-700 hover:bg-gray-50',
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
                      <hr className={cm.cn(cm.sp('my', 1), 'border-gray-100')} />
                      <button
                        className={cm.cn(
                          cm.sp('px', 4),
                          cm.sp('py', 2),
                          cm.textSize('sm'),
                          cm.w('full'),
                          'block text-left text-gray-700 hover:bg-gray-50',
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
          ) : null}
        </div>
      </nav>
    </header>
  )
}

export default StorefrontTopNav
