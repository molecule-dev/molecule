import type { JSX, ReactNode } from 'react'

import { RoutedView, useLocation, useTranslation } from '@molecule/app-react'
import { Link } from '@molecule/app-react/link'
import { slot } from '@molecule/app-react/render'
import { getClassMap } from '@molecule/app-ui'

import { navItemActive } from './nav-item-active.js'

/** A single navigation item rendered in the top nav bar. */
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

/** Props for the {@link TopNavLayout} shell component. */
export interface TopNavLayoutProps {
  /** Brand text shown in the top-left link (typically the app name). */
  appName: string
  /** Path the brand link navigates to. Defaults to `'/'`. */
  logoTo?: string
  /** Horizontal nav items rendered in the header. */
  navItems: ReadonlyArray<TopNavItem>
  /** Slot rendered at the right of the header (typically a `<UserMenu />`). */
  userMenu?: ReactNode
  /**
   * Aria-label for the primary `<nav>`. Overrides the translated /
   * `defaultValue` `'Primary navigation'` (prop > `t()` > default).
   */
  navAriaLabel?: string
  /** Extra classes on the outer wrapper. */
  className?: string
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string
  /**
   * The page body, rendered in the `<main>`. Without it the layout renders
   * `<RoutedView />`: the matched child route, through whichever routing bond
   * the app wired. That throws when the routing bond has no routed view
   * (Next.js gives a layout its page as `children`): pass the page then.
   */
  children?: ReactNode
}

/**
 * Sticky top-nav shell with brand + horizontal nav + user-menu slot.
 *
 * @param props - Component props (see {@link TopNavLayoutProps}).
 */
export function TopNavLayout({
  appName,
  logoTo = '/',
  navItems,
  userMenu,
  navAriaLabel,
  className,
  dataMolId,
  children: childrenProp,
}: TopNavLayoutProps): JSX.Element {
  const children = slot(childrenProp)
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const cm = getClassMap()
  const navLabel =
    navAriaLabel ??
    t('topNavLayout.aria.primaryNavigation', undefined, { defaultValue: 'Primary navigation' })
  return (
    <div
      className={cm.cn(cm.minH('screen'), cm.topNavLayoutRoot, className)}
      data-mol-id={dataMolId}
    >
      <header className={cm.cn(cm.topNavLayoutHeader)}>
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
          <nav className={cm.flex({ align: 'center', gap: 'md' })} aria-label={navLabel}>
            {navItems.map((item) => {
              const isActive = navItemActive(pathname, item.to)
              return (
                <Link
                  key={item.key}
                  to={item.to}
                  // Below `md` the label span hides and the link becomes
                  // icon-only; the icon span is aria-hidden, so the link's
                  // accessible name must come from here.
                  aria-label={item.label}
                  aria-current={isActive ? 'page' : undefined}
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'xs' }),
                    cm.sp('px', 3),
                    cm.sp('py', 2),
                    cm.textSize('sm'),
                    cm.fontWeight('medium'),
                    cm.topNavLayoutNavItem,
                    isActive
                      ? cm.cn(cm.bgPrimaryContainer, cm.textPrimary)
                      : cm.cn(cm.textMuted, cm.topNavLayoutNavItemIdle),
                  )}
                >
                  {item.icon ? (
                    <span className={cm.iconGlyphFont} aria-hidden="true">
                      {item.icon}
                    </span>
                  ) : null}
                  <span className={cm.topNavLayoutNavItemLabel}>{item.label}</span>
                </Link>
              )
            })}
          </nav>
          {userMenu}
        </div>
      </header>
      <main>{children ?? <RoutedView />}</main>
    </div>
  )
}
