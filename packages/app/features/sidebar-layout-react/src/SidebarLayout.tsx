import type { ReactNode } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'

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
  return (
    <div
      className={cm.cn(cm.minH('screen'), cm.flex({ direction: 'row' }), 'bg-background text-on-surface antialiased', className)}
      data-mol-id={dataMolId}
    >
      <aside className={cm.cn(cm.sp('p', 4), cm.shrink0, cm.flex({ direction: 'col' }), `${sidebarWidthClass} bg-surface border-r border-outline-variant`)}>
        <Link to={logoTo} className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), cm.sp('mb', 6), 'block')}>
          {appName}
        </Link>

        <nav className={cm.cn(cm.flex1, 'space-y-1')} aria-label={navAriaLabel}>
          {navItems.map(item => (
            <NavLink
              key={item.key}
              to={item.to}
              className={({ isActive }) =>
                cm.cn(
                  cm.flex({ align: 'center', gap: 'sm' }),
                  cm.sp('px', 3),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  cm.fontWeight('medium'),
                  'rounded-md transition-colors',
                  isActive
                    ? 'bg-primary-container text-on-primary-container'
                    : cm.cn(cm.textMuted, 'hover:bg-surface-container hover:text-on-surface'),
                )
              }
            >
              {item.icon
                ? <span className="material-symbols-outlined" aria-hidden="true">{item.icon}</span>
                : null}
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {userMenu
          ? <div className={cm.cn(cm.sp('pt', 4), 'border-t border-outline-variant')}>{userMenu}</div>
          : null}
      </aside>

      <main className={cm.cn(cm.flex1, 'min-w-0 overflow-y-auto')}>
        <Outlet />
      </main>
    </div>
  )
}
