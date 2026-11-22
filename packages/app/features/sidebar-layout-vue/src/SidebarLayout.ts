/**
 * Vue vertical sidebar app shell: brand link → vertical nav → bottom
 * user-menu / theme-toggle slots, with the routed page body in a `<main>`.
 *
 * Vue counterpart of `@molecule/app-sidebar-layout-react`'s `SidebarLayout` —
 * the same props (React names), the same DOM for the same input.
 *
 * @module
 */

import { defineComponent, h, type PropType, type VNode, type VNodeChild } from 'vue'

import { getClassMap } from '@molecule/app-ui'
import { Link, RoutedView, useLocation, useTranslation } from '@molecule/app-vue'

import type { SidebarNavItem } from './types.js'

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
 * Resolves a node-valued prop that may also arrive as a same-named slot: the
 * slot wins, and an absent pair contributes nothing.
 *
 * @param slot - The slot render function, when the caller passed the slot.
 * @param prop - The prop value, when the caller passed the prop.
 * @returns The children to render.
 */
const slotOrProp = (
  slot: (() => VNodeChild[]) | undefined,
  prop: VNodeChild | null | undefined,
): VNodeChild[] => {
  if (slot) return slot()
  return prop != null ? [prop] : []
}

/**
 * Vertical sidebar shell with brand + vertical nav + bottom user-menu slot.
 *
 * The page body comes from the default slot, where React renders React
 * Router's `<Outlet />`. The sidebar WIDTH is the one value a styling-agnostic
 * ClassMap can't express, so it is applied via inline style from
 * `sidebarWidth`; active-nav highlighting picks the longest prefix-match of the
 * current path, and same-path links get a `#top` fragment appended.
 *
 * @param props - Component props (see {@link SidebarLayoutProps}).
 * @returns The sidebar layout component.
 */
export const SidebarLayout = defineComponent({
  name: 'SidebarLayout',
  props: {
    appName: { type: String, required: true },
    logoTo: { type: String, default: '/' },
    navItems: {
      type: Array as PropType<ReadonlyArray<SidebarNavItem>>,
      required: true,
    },
    userMenu: null,
    themeToggle: null,
    navAriaLabel: String,
    sidebarWidth: { type: [String, Number] as PropType<string | number> },
    sidebarWidthClass: String,
    className: String,
    dataMolId: String,
  },
  setup(props, { slots }) {
    const cm = getClassMap()
    const { t } = useTranslation()
    const location = useLocation()

    /**
     * The nav region's accessible name: an explicit `navAriaLabel` wins,
     * otherwise the translated default (the inline English keeps the DOM
     * identical until a locale bond supplies the key).
     *
     * @returns The aria-label.
     */
    const navLabel = (): string =>
      props.navAriaLabel ??
      t('sidebarLayout.aria.primaryNavigation', undefined, {
        defaultValue: 'Primary navigation',
      })

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
     * produces an observable URL change.
     *
     * @param pathname - The current location's pathname.
     * @param to - The link's destination.
     * @returns The link target.
     */
    const samePathTarget = (pathname: string, to: string): string => {
      const samePath = pathname === to || pathname + '/' === to
      if (!samePath) return to
      // React passes `#top` as a RELATIVE destination and react-router resolves
      // it against the current location ('/#top' on the home route). This
      // binding's `Link` renders `to` verbatim, so the root case is spelled out.
      return `${to.replace(/\/$/, '') || '/'}#top`
    }

    return (): VNode => {
      const pathname = location.value.pathname
      const active = activeKey(pathname)
      const width = resolveSidebarWidthPx(props.sidebarWidth, props.sidebarWidthClass)
      const userMenu = slotOrProp(slots.userMenu, props.userMenu)
      const themeToggle = slotOrProp(slots.themeToggle, props.themeToggle)
      const hasBottom = userMenu.length > 0 || themeToggle.length > 0

      return h(
        'div',
        {
          class: cm.cn(cm.pageShell, cm.page, props.className),
          'data-mol-id': props.dataMolId,
        },
        [
          h(
            'aside',
            {
              class: cm.cn(
                cm.sp('p', 4),
                cm.shrink0,
                cm.flex({ direction: 'col' }),
                cm.surface,
                cm.borderR,
              ),
              style: { width: `${width}px` },
            },
            [
              h(
                Link,
                {
                  to: samePathTarget(pathname, props.logoTo),
                  class: cm.cn(
                    cm.textSize('xl'),
                    cm.fontWeight('bold'),
                    cm.sp('mb', 6),
                    cm.displayBlock,
                  ),
                },
                () => props.appName,
              ),
              h(
                'nav',
                { class: cm.cn(cm.flex1, cm.stack(1)), 'aria-label': navLabel() },
                props.navItems.map((item) => {
                  const isActive = item.key === active
                  return h(
                    Link,
                    {
                      key: item.key,
                      to: samePathTarget(pathname, item.to),
                      'data-mol-id': `nav-${item.key}`,
                      'aria-current': isActive ? 'page' : undefined,
                      class: cm.cn(
                        cm.flex({ align: 'center', gap: 'sm' }),
                        cm.sp('px', 3),
                        cm.sp('py', 2),
                        cm.textSize('sm'),
                        cm.fontWeight('medium'),
                        cm.roundedFull,
                        isActive
                          ? cm.cn(cm.bgPrimaryContainer, cm.textOnPrimaryContainer)
                          : cm.cn(cm.textMuted, cm.link),
                      ),
                    },
                    () => [
                      item.icon
                        ? h(
                            'span',
                            { class: cm.cn(cm.iconGlyphFont), 'aria-hidden': 'true' },
                            item.icon,
                          )
                        : null,
                      h('span', item.label),
                    ],
                  )
                }),
              ),
              hasBottom
                ? h(
                    'div',
                    {
                      class: cm.cn(
                        cm.sp('pt', 4),
                        cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
                        cm.borderT,
                      ),
                    },
                    [
                      ...(userMenu.length > 0 ? userMenu : [h('span', { 'aria-hidden': 'true' })]),
                      ...themeToggle,
                    ],
                  )
                : null,
            ],
          ),
          h(
            'main',
            { class: cm.cn(cm.pageShellContent), style: { minWidth: '0px' } },
            // The page body, or the matched child route through the app's routing bond.
            slots.default ? slots.default() : h(RoutedView),
          ),
        ],
      )
    }
  },
})
