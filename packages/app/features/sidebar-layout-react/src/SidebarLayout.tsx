import type { ReactNode } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'

import { getClassMap } from '@molecule/app-ui'

export interface SidebarNavItem {
  /** Route path the link goes to. */
  to: string
  /** Stable key — used for React keys and i18n key suffix. */
  key: string
  /** Material symbol icon name. */
  icon?: string
  /** Visible label. Apps that route this through `t(...)` should pass the resolved string. */
  label: string
}

export interface SidebarLayoutProps {
  /** Brand text shown at the top of the sidebar (typically the app name). */
  appName: string
  /** Path the brand link navigates to. Defaults to `'/'`. */
  logoTo?: string
  /** Vertical nav items rendered in the sidebar. */
  navItems: ReadonlyArray<SidebarNavItem>
  /** Slot rendered at the bottom of the sidebar (typically a `<UserMenu />`). */
  userMenu?: ReactNode
  /** Aria-label for the primary <nav>. */
  navAriaLabel?: string
  /** Tailwind width utility for the sidebar (e.g. `'w-60'`, `'w-64'`). Defaults to `'w-60'`. */
  sidebarWidthClass?: string
  /** Extra classes on the outer wrapper. */
  className?: string
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string
}

/**
 * Vertical sidebar shell with brand + vertical nav + bottom user-menu slot.
 *
 * @param root0
 * @param root0.appName
 * @param root0.logoTo
 * @param root0.navItems
 * @param root0.userMenu
 * @param root0.navAriaLabel
 * @param root0.sidebarWidthClass
 * @param root0.className
 * @param root0.dataMolId
 */
export function SidebarLayout({
  appName,
  logoTo = '/',
  navItems,
  userMenu,
  navAriaLabel = 'Primary navigation',
  sidebarWidthClass = 'w-60',
  className,
  dataMolId,
}: SidebarLayoutProps) {
  const cm = getClassMap()
  const { pathname } = useLocation()

  // Single-active-item resolution: highlight the nav item whose `to` is the
  // longest prefix-match of the current pathname. Avoids the default NavLink
  // behaviour of highlighting every ancestor (e.g. both `/docs` and
  // `/docs/endpoints` when on `/docs/endpoints`).
  const activeKey = navItems.reduce<string | null>((bestKey, item) => {
    const isMatch = pathname === item.to || pathname.startsWith(`${item.to}/`)
    if (!isMatch) return bestKey
    if (bestKey === null) return item.key
    const best = navItems.find((i) => i.key === bestKey)
    return best && item.to.length > best.to.length ? item.key : bestKey
  }, null)

  // safeTarget: when a Link's destination matches the current path, append
  // a `#top` fragment so clicking still produces an observable URL change.
  // Avoids "dead-link" behaviour on same-route clicks (active nav items,
  // brand logo when already on the home route).
  const safeTarget = (to: string): string => {
    const samePath = pathname === to || pathname + '/' === to
    return samePath ? `${to.replace(/\/$/, '')}#top` : to
  }

  return (
    <div
      className={cm.cn(
        cm.h('screen'),
        cm.flex({ direction: 'row' }),
        'bg-background text-on-surface antialiased overflow-hidden',
        className,
      )}
      data-mol-id={dataMolId}
    >
      <aside
        className={cm.cn(
          cm.sp('p', 4),
          cm.shrink0,
          cm.flex({ direction: 'col' }),
          `${sidebarWidthClass} bg-surface border-r border-outline-variant`,
        )}
      >
        <Link
          to={safeTarget(logoTo)}
          className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), cm.sp('mb', 6), 'block')}
        >
          {appName}
        </Link>

        <nav className={cm.cn(cm.flex1, 'space-y-1')} aria-label={navAriaLabel}>
          {navItems.map((item) => {
            const isActive = item.key === activeKey
            return (
              <Link
                key={item.key}
                to={safeTarget(item.to)}
                data-mol-id={`nav-${item.key}`}
                aria-current={isActive ? 'page' : undefined}
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'sm' }),
                  cm.sp('px', 3),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  cm.fontWeight('medium'),
                  'rounded-md transition-colors',
                  isActive
                    ? 'bg-primary-container text-on-primary-container'
                    : cm.cn(cm.textMuted, 'hover:bg-surface-container hover:text-on-surface'),
                )}
              >
                {item.icon ? (
                  <span className="material-symbols-outlined" aria-hidden="true">
                    {item.icon}
                  </span>
                ) : null}
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        {userMenu ? (
          <div className={cm.cn(cm.sp('pt', 4), 'border-t border-outline-variant')}>{userMenu}</div>
        ) : null}
      </aside>

      <main className={cm.cn(cm.flex1, 'min-w-0 overflow-y-auto')}>
        <Outlet />
      </main>
    </div>
  )
}
