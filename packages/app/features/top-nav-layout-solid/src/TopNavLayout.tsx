import { type Component, For, type JSX, Show } from 'solid-js'

import { Link, RoutedView, useLocation, useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'

import type { TopNavItem, TopNavLayoutProps } from './types.js'

/**
 * Whether react-router's `<NavLink>` would mark `to` active at `pathname`:
 * the pathnames are equal, or the location continues beyond `to` on a segment
 * boundary (`/dashboard` is active at `/dashboard/settings`, but not at
 * `/dashboard-archive`), compared case-insensitively.
 *
 * @param pathname - The current location's pathname.
 * @param to - The link's destination.
 * @returns Whether the link renders in its active state.
 */
const navItemActive = (pathname: string, to: string): boolean => {
  const location = pathname.toLowerCase()
  const target = to.toLowerCase()
  const endSlash = target !== '/' && target.endsWith('/') ? target.length - 1 : target.length
  return location === target || (location.startsWith(target) && location.charAt(endSlash) === '/')
}

/**
 * Sticky top-nav shell with brand + horizontal nav + user-menu slot.
 *
 * This is the Solid counterpart of `@molecule/app-top-nav-layout-react`: the
 * same props (React names), the same ClassMap tokens, and the same DOM for the
 * same input. The routed page body goes in `children`, where React renders
 * React Router's `<Outlet />`. Nav labels are hidden below the `md` breakpoint
 * (icon-only mobile nav), so always provide `icon` names; they render as
 * Material Symbols ligatures and need the Material Symbols font loaded by the
 * host app. `label` is rendered as-is: pass an already-translated string.
 *
 * @param props - Component props (see {@link TopNavLayoutProps}).
 * @returns The rendered top navigation layout.
 */
export const TopNavLayout: Component<TopNavLayoutProps> = (props) => {
  const cm = getClassMap()
  const location = useLocation()
  const { t } = useTranslation()
  const logoTo = (): string => props.logoTo ?? '/'
  // The nav region's aria-label: prop > `t()` > default. Read in an accessor,
  // so a locale switch re-renders it, as React's does.
  const navLabel = (): string =>
    props.navAriaLabel ??
    t('topNavLayout.aria.primaryNavigation', undefined, { defaultValue: 'Primary navigation' })

  /**
   * The link classes for one item: the shared nav-item treatment plus the
   * active or idle variant.
   *
   * @param item - The nav item.
   * @returns The class string.
   */
  const itemClasses = (item: TopNavItem): string =>
    cm.cn(
      cm.flex({ align: 'center', gap: 'xs' }),
      cm.sp('px', 3),
      cm.sp('py', 2),
      cm.textSize('sm'),
      cm.fontWeight('medium'),
      cm.topNavLayoutNavItem,
      navItemActive(location().pathname, item.to)
        ? cm.cn(cm.bgPrimaryContainer, cm.textPrimary)
        : cm.cn(cm.textMuted, cm.topNavLayoutNavItemIdle),
    )

  return (
    <div
      class={cm.cn(cm.minH('screen'), cm.topNavLayoutRoot, props.className)}
      data-mol-id={props.dataMolId}
    >
      <header class={cm.cn(cm.topNavLayoutHeader)}>
        <div
          class={cm.cn(
            cm.maxW('7xl'),
            cm.mxAuto,
            cm.sp('px', 6),
            cm.sp('py', 3),
            cm.flex({ align: 'center', justify: 'between', gap: 'lg' }),
          )}
        >
          <Link to={logoTo()} class={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'))}>
            {props.appName}
          </Link>
          <nav class={cm.flex({ align: 'center', gap: 'md' })} aria-label={navLabel()}>
            <For each={props.navItems}>
              {(item): JSX.Element => (
                <Link
                  to={item.to}
                  // Below `md` the label span hides and the link becomes
                  // icon-only; the icon span is aria-hidden, so the link's
                  // accessible name must come from here.
                  aria-label={item.label}
                  aria-current={navItemActive(location().pathname, item.to) ? 'page' : undefined}
                  class={itemClasses(item)}
                >
                  <Show when={item.icon}>
                    <span class={cm.iconGlyphFont} aria-hidden="true">
                      {item.icon}
                    </span>
                  </Show>
                  <span class={cm.topNavLayoutNavItemLabel}>{item.label}</span>
                </Link>
              )}
            </For>
          </nav>
          {props.userMenu}
        </div>
      </header>
      <main>{props.children ?? <RoutedView />}</main>
    </div>
  )
}
