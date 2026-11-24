<!--
  TopNavLayout: the Svelte counterpart of `@molecule/app-top-nav-layout-react`'s
  `TopNavLayout` — sticky header with brand link + horizontal router links + a
  user-menu slot, plus the `<main>` holding the routed page body (React renders
  its router's `<Outlet />` there). Same props, same DOM for the same input.
-->
<script lang="ts">
  import {
    ContentOrElse,
    Link,
    RoutedView,
    useLocation,
    useTranslation,
  } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'

  import type { TopNavItem, TopNavLayoutProps } from './types.js'

  let {
    appName,
    logoTo = '/',
    navItems,
    userMenu,
    navAriaLabel,
    className,
    dataMolId,
    children,
  }: TopNavLayoutProps = $props()

  const { t } = useTranslation()

  const cm = $derived(getClassMap())
  const location = useLocation()
  const pathname = $derived($location.pathname)
  // The nav region's aria-label: prop > `t()` > default. A `$derived` over the
  // locale-reactive `t`, so a locale switch re-renders it, as React's does.
  const navLabel = $derived(
    navAriaLabel ??
      t('topNavLayout.aria.primaryNavigation', undefined, { defaultValue: 'Primary navigation' }),
  )

  /**
   * Whether react-router's `<NavLink>` would mark `to` active at `pathname`:
   * the pathnames are equal, or the location continues beyond `to` on a
   * segment boundary (`/dashboard` is active at `/dashboard/settings`, but not
   * at `/dashboard-archive`), compared case-insensitively.
   *
   * @param current - The current location's pathname.
   * @param to - The link's destination.
   * @returns Whether the link renders in its active state.
   */
  const navItemActive = (current: string, to: string): boolean => {
    const active = current.toLowerCase()
    const target = to.toLowerCase()
    const endSlash = target !== '/' && target.endsWith('/') ? target.length - 1 : target.length
    return active === target || (active.startsWith(target) && active.charAt(endSlash) === '/')
  }

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
      navItemActive(pathname, item.to)
        ? cm.cn(cm.bgPrimaryContainer, cm.textPrimary)
        : cm.cn(cm.textMuted, cm.topNavLayoutNavItemIdle),
    )
</script>

<div class={cm.cn(cm.minH('screen'), cm.topNavLayoutRoot, className)} data-mol-id={dataMolId}>
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
      <Link to={logoTo} class={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'))}>
        {appName}
      </Link>
      <nav class={cm.flex({ align: 'center', gap: 'md' })} aria-label={navLabel}>
        {#each navItems as item (item.key)}
          <Link
            to={item.to}
            aria-label={item.label}
            aria-current={navItemActive(pathname, item.to) ? 'page' : undefined}
            class={itemClasses(item)}
          >
            {#if item.icon}
              <span class={cm.iconGlyphFont} aria-hidden="true">{item.icon}</span>
            {/if}
            <span class={cm.topNavLayoutNavItemLabel}>{item.label}</span>
          </Link>
        {/each}
      </nav>
      {#if userMenu}{@render userMenu?.()}{/if}
    </div>
  </header>
  <main>
    <ContentOrElse>
      {@render children?.()}
      {#snippet otherwise()}<RoutedView />{/snippet}
    </ContentOrElse>
  </main>
</div>
