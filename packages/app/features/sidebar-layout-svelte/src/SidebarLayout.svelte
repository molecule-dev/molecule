<!--
  SidebarLayout: the Svelte counterpart of
  `@molecule/app-sidebar-layout-react`'s `SidebarLayout` — fixed-width left
  sidebar with brand link + vertical router links + bottom user-menu /
  theme-toggle snippets, and the `<main>` holding the routed page body (React
  renders its router's `<Outlet />` there). Same props, same DOM for the same
  input.
-->
<script lang="ts">
  import { Link, RoutedView, useLocation, useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'

  import type { SidebarLayoutProps, SidebarNavItem } from './types.js'

  let {
    appName,
    logoTo = '/',
    navItems,
    userMenu,
    themeToggle,
    navAriaLabel,
    sidebarWidth,
    sidebarWidthClass,
    className,
    dataMolId,
    children,
  }: SidebarLayoutProps = $props()

  /** Pixel widths for the `sm` / `md` / `lg` presets. */
  const SIDEBAR_WIDTH_PX: Record<'sm' | 'md' | 'lg', number> = { sm: 208, md: 240, lg: 256 }

  /**
   * Resolves the effective sidebar pixel width from the stack-agnostic
   * `sidebarWidth` prop, falling back to the deprecated `sidebarWidthClass`
   * (a `w-<n>` Tailwind utility) for backward compatibility. The legacy class
   * is PARSED to pixels — never re-emitted as a class.
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

  const cm = $derived(getClassMap())
  const location = useLocation()
  const { t } = useTranslation()
  const pathname = $derived($location.pathname)
  const widthPx = $derived(resolveSidebarWidthPx(sidebarWidth, sidebarWidthClass))
  // The nav region's accessible name: an explicit `navAriaLabel` wins,
  // otherwise the translated default (the inline English keeps the DOM
  // identical until a locale bond supplies the key).
  const navLabel = $derived(
    navAriaLabel ??
      t('sidebarLayout.aria.primaryNavigation', undefined, {
        defaultValue: 'Primary navigation',
      }),
  )

  /**
   * The key of the nav item whose `to` is the longest prefix-match of the
   * current pathname.
   *
   * @param current - The current location's pathname.
   * @returns The active item's key, or null when nothing matches.
   */
  const activeKey = (current: string): string | null =>
    navItems.reduce<string | null>((bestKey, item) => {
      const isMatch = current === item.to || current.startsWith(`${item.to}/`)
      if (!isMatch) return bestKey
      if (bestKey === null) return item.key
      const best = navItems.find((i) => i.key === bestKey)
      return best && item.to.length > best.to.length ? item.key : bestKey
    }, null)

  /**
   * Appends `#top` when `to` is the current path, so a same-route click still
   * produces an observable URL change. React passes the bare `#top` and
   * react-router resolves it against the location (`/#top` on the home route);
   * this binding's `Link` renders `to` verbatim, so the root case is spelled
   * out here.
   *
   * @param current - The current location's pathname.
   * @param to - The link's destination.
   * @returns The link target.
   */
  const samePathTarget = (current: string, to: string): string => {
    const samePath = current === to || current + '/' === to
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
  const itemClasses = (item: SidebarNavItem): string =>
    cm.cn(
      cm.flex({ align: 'center', gap: 'sm' }),
      cm.sp('px', 3),
      cm.sp('py', 2),
      cm.textSize('sm'),
      cm.fontWeight('medium'),
      cm.roundedFull,
      item.key === activeKey(pathname)
        ? cm.cn(cm.bgPrimaryContainer, cm.textOnPrimaryContainer)
        : cm.cn(cm.textMuted, cm.link),
    )
</script>

<div class={cm.cn(cm.pageShell, cm.page, className)} data-mol-id={dataMolId}>
  <aside
    class={cm.cn(cm.sp('p', 4), cm.shrink0, cm.flex({ direction: 'col' }), cm.surface, cm.borderR)}
    style="width: {widthPx}px"
  >
    <Link
      to={samePathTarget(pathname, logoTo)}
      class={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), cm.sp('mb', 6), cm.displayBlock)}
    >
      {appName}
    </Link>

    <nav class={cm.cn(cm.flex1, cm.stack(1))} aria-label={navLabel}>
      {#each navItems as item (item.key)}
        <Link
          to={samePathTarget(pathname, item.to)}
          data-mol-id={`nav-${item.key}`}
          aria-current={item.key === activeKey(pathname) ? 'page' : undefined}
          class={itemClasses(item)}
        >
          {#if item.icon}
            <span class={cm.cn(cm.iconGlyphFont)} aria-hidden="true">{item.icon}</span>
          {/if}
          <span>{item.label}</span>
        </Link>
      {/each}
    </nav>

    {#if userMenu || themeToggle}
      <div
        class={cm.cn(
          cm.sp('pt', 4),
          cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
          cm.borderT,
        )}
      >
        {#if userMenu}
          {@render userMenu()}
        {:else}
          <span aria-hidden="true"></span>
        {/if}
        {#if themeToggle}
          {@render themeToggle()}
        {/if}
      </div>
    {/if}
  </aside>

  <main class={cm.cn(cm.pageShellContent)} style="min-width: 0px">
    {#if children}
      {@render children()}
    {:else}
      <RoutedView />
    {/if}
  </main>
</div>
