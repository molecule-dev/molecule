import type { ReactNode } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'

import { getClassMap } from '@molecule/app-ui'

export interface TopNavItem {
  /** Route path the link goes to. */
  to: string
  /** Stable key — used for React keys and i18n key suffix. */
  key: string
  /** Material symbol icon name (or any glyph) shown next to the label. */
  icon?: string
  /** Visible label. Apps that route this through `t(...)` should pass the resolved string. */
  label: string
}

export interface TopNavLayoutProps {
  /** Brand text shown in the top-left link (typically the app name). */
  appName: string
  /** Path the brand link navigates to. Defaults to `'/'`. */
  logoTo?: string
  /** Horizontal nav items rendered in the header. */
  navItems: ReadonlyArray<TopNavItem>
  /** Slot rendered at the right of the header (typically a `<UserMenu />`). */
  userMenu?: ReactNode
  /** Aria-label for the primary <nav>. */
  navAriaLabel?: string
  /** Extra classes on the outer wrapper. */
  className?: string
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string
}

/**
 * Sticky top-nav shell with brand + horizontal nav + user-menu slot.
 *
 * @param root0
 * @param root0.appName
 * @param root0.logoTo
 * @param root0.navItems
 * @param root0.userMenu
 * @param root0.navAriaLabel
 * @param root0.className
 * @param root0.dataMolId
 */
export function TopNavLayout({
  appName,
  logoTo = '/',
  navItems,
  userMenu,
  navAriaLabel = 'Primary navigation',
  className,
  dataMolId,
}: TopNavLayoutProps) {
  const cm = getClassMap()
  return (
    <div
      className={cm.cn(cm.minH('screen'), 'bg-background text-on-surface antialiased', className)}
      data-mol-id={dataMolId}
    >
      <header className={cm.cn('sticky top-0 z-40 bg-surface shadow-sm')}>
        <div
          className={cm.cn(
            cm.maxW('7xl'),
            cm.mxAuto,
            cm.sp('px', 6),
            cm.sp('py', 3),
            cm.flex({ align: 'center', justify: 'between', gap: 'lg' }),
          )}
        >
          <Link to={logoTo} className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'))}>
            {appName}
          </Link>
          <nav className={cm.flex({ align: 'center', gap: 'md' })} aria-label={navAriaLabel}>
            {navItems.map(item => (
              <NavLink
                key={item.key}
                to={item.to}
                className={({ isActive }) =>
                  cm.cn(
                    cm.flex({ align: 'center', gap: 'xs' }),
                    cm.sp('px', 3),
                    cm.sp('py', 2),
                    cm.textSize('sm'),
                    cm.fontWeight('medium'),
                    'rounded-md transition-colors',
                    isActive
                      ? cm.cn('bg-primary-container', cm.textPrimary)
                      : cm.cn(cm.textMuted, 'hover:bg-surface-container hover:text-on-surface'),
                  )
                }
              >
                {item.icon
                  ? <span className="material-symbols-outlined" aria-hidden="true">{item.icon}</span>
                  : null}
                <span className="hidden md:inline">{item.label}</span>
              </NavLink>
            ))}
          </nav>
          {userMenu}
        </div>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  )
}
