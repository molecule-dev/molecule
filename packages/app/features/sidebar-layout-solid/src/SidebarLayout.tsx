import { type Component, For, type JSX, Show } from 'solid-js'

import { Link, useLocation, useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'

import type { SidebarLayoutProps, SidebarNavItem } from './types.js'

/** Pixel widths for the `sm` / `md` / `lg` presets. */
const SIDEBAR_WIDTH_PX: Record<'sm' | 'md' | 'lg', number> = {
  sm: 208,
  md: 240,
  lg: 256,
}

/**
 * Resolves the effective sidebar pixel width from the stack-agnostic
 * `sidebarWidth` prop, falling back to the deprecated `sidebarWidthClass`
 * (a `w-<n>` Tailwind utility) for backward compatibility. The legacy class is
 * PARSED to pixels — never re-emitted as a class.
 *
 * @param width - The stack-agnostic width preset or explicit pixel number.
 * @param legacyWidthClass - Deprecated Tailwind width utility (e.g. `'w-64'`).
 * @returns The sidebar width in pixels.
 */
const resolveSidebarWidthPx = (width?: string | number, legacyWidthClass?: string): number => {
  if (typeof width === 'number') return width
  if (width === 'sm' || width === 'md' || width === 'lg') return SIDEBAR_WIDTH_PX[width]
  if (legacyWidthClass) {
    // Tailwind spacing scale: `w-<n>` === n × 0.25rem === n × 4px at a 16px root.
    const match = /^w-(\d+(?:\.\d+)?)$/.exec(legacyWidthClass.trim())
    if (match) return Number(match[1]) * 4
  }
  return SIDEBAR_WIDTH_PX.md
}

/**
 * Vertical sidebar shell with brand + vertical nav + bottom user-menu slot.
 *
 * This is the Solid counterpart of `@molecule/app-sidebar-layout-react`: the
 * same props (React names), the same ClassMap tokens, and the same DOM for the
 * same input. The routed page body goes in `children`, where React renders
 * React Router's `<Outlet />`. The sidebar WIDTH is the one value a
 * styling-agnostic ClassMap can't express, so it is applied via inline style
 * from `sidebarWidth`; active-nav highlighting picks the longest prefix-match
 * of the current path, and same-path links get a `#top` fragment appended.
 *
 * @param props - Component props (see {@link SidebarLayoutProps}).
 * @returns The rendered sidebar layout.
 */
export const SidebarLayout: Component<SidebarLayoutProps> = (props) => {
  const cm = getClassMap()
  const { t } = useTranslation()
  const location = useLocation()

  /** The brand link's destination (React's default parameter). */
  const logoTo = (): string => props.logoTo ?? '/'

  /**
   * The nav region's accessible name: an explicit `navAriaLabel` wins,
   * otherwise the translated default (the inline English keeps the DOM
   * identical until a locale bond supplies the key).
   *
   * @returns The aria-label.
   */
  const navAriaLabel = (): string =>
    props.navAriaLabel ??
    t('sidebarLayout.aria.primaryNavigation', undefined, {
      defaultValue: 'Primary navigation',
    })

  /** The inline sidebar width, in pixels. */
  const widthPx = (): number => resolveSidebarWidthPx(props.sidebarWidth, props.sidebarWidthClass)

  /**
   * The key of the nav item whose `to` is the longest prefix-match of the
   * current pathname.
   *
   * @param pathname - The current location's pathname.
   * @returns The active item's key, or null when nothing matches.
   */
  const activeKey = (pathname: string): string | null =>
    props.navItems.reduce<string | null>((bestKey, item) => {
      const isMatch = pathname === item.to || pathname.startsWith(`${item.to}/`)
      if (!isMatch) return bestKey
      if (bestKey === null) return item.key
      const best = props.navItems.find((i) => i.key === bestKey)
      return best && item.to.length > best.to.length ? item.key : bestKey
    }, null)

  /**
   * Appends `#top` when `to` is the current path, so a same-route click still
   * produces an observable URL change. React passes the bare `#top` and
   * react-router resolves it against the location (`/#top` on the home route);
   * this binding's `Link` renders `to` verbatim, so the root case is spelled
   * out here.
   *
   * @param pathname - The current location's pathname.
   * @param to - The link's destination.
   * @returns The link target.
   */
  const samePathTarget = (pathname: string, to: string): string => {
    const samePath = pathname === to || pathname + '/' === to
    if (!samePath) return to
    return `${to.replace(/\/$/, '') || '/'}#top`
  }

  /**
   * The class list of one nav link: the shared nav-item treatment plus the
   * active or idle variant.
   *
   * @param item - The nav item.
   * @returns The class string.
   */
  const itemClasses = (item: SidebarNavItem): string => {
    const isActive = item.key === activeKey(location().pathname)
    return cm.cn(
      cm.flex({ align: 'center', gap: 'sm' }),
      cm.sp('px', 3),
      cm.sp('py', 2),
      cm.textSize('sm'),
      cm.fontWeight('medium'),
      cm.roundedFull,
      isActive
        ? cm.cn(cm.bgPrimaryContainer, cm.textOnPrimaryContainer)
        : cm.cn(cm.textMuted, cm.link),
    )
  }

  return (
    <div class={cm.cn(cm.pageShell, cm.page, props.className)} data-mol-id={props.dataMolId}>
      <aside
        class={cm.cn(
          cm.sp('p', 4),
          cm.shrink0,
          cm.flex({ direction: 'col' }),
          cm.surface,
          cm.borderR,
        )}
        style={{ width: `${widthPx()}px` }}
      >
        <Link
          to={samePathTarget(location().pathname, logoTo())}
          class={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), cm.sp('mb', 6), cm.displayBlock)}
        >
          {props.appName}
        </Link>

        <nav class={cm.cn(cm.flex1, cm.stack(1))} aria-label={navAriaLabel()}>
          <For each={props.navItems}>
            {(item): JSX.Element => (
              <Link
                to={samePathTarget(location().pathname, item.to)}
                data-mol-id={`nav-${item.key}`}
                aria-current={item.key === activeKey(location().pathname) ? 'page' : undefined}
                class={itemClasses(item)}
              >
                <Show when={item.icon}>
                  <span class={cm.cn(cm.iconGlyphFont)} aria-hidden="true">
                    {item.icon}
                  </span>
                </Show>
                <span>{item.label}</span>
              </Link>
            )}
          </For>
        </nav>

        <Show when={props.userMenu || props.themeToggle}>
          <div
            class={cm.cn(
              cm.sp('pt', 4),
              cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
              cm.borderT,
            )}
          >
            {props.userMenu ?? <span aria-hidden="true" />}
            {props.themeToggle}
          </div>
        </Show>
      </aside>

      <main class={cm.cn(cm.pageShellContent)} style={{ 'min-width': '0px' }}>
        {props.children}
      </main>
    </div>
  )
}
