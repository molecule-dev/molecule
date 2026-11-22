/**
 * Vue top navigation app shell: brand link → horizontal nav → user-menu slot,
 * with the routed page body in a `<main>`.
 *
 * Vue counterpart of `@molecule/app-top-nav-layout-react`'s `TopNavLayout` —
 * the same props (React names), the same DOM for the same input.
 *
 * @module
 */

import { defineComponent, h, type PropType, type VNode, type VNodeChild } from 'vue'

import { getClassMap } from '@molecule/app-ui'
import { Link, RoutedView, useLocation, useTranslation } from '@molecule/app-vue'

import type { TopNavItem } from './types.js'

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
 * Sticky top-nav shell with brand + horizontal nav + user-menu slot.
 *
 * The page body comes from the default slot, where React renders React
 * Router's `<Outlet />`. Nav labels are hidden below the `md` breakpoint
 * (icon-only mobile nav), so always provide `icon` names; they render as
 * Material Symbols ligatures and need the Material Symbols font loaded by the
 * host app. `label` is rendered as-is: pass an already-translated string.
 *
 * @param props - Component props (see {@link TopNavLayoutProps}).
 * @returns The top navigation layout component.
 */
export const TopNavLayout = defineComponent({
  name: 'TopNavLayout',
  props: {
    appName: { type: String, required: true },
    logoTo: { type: String, default: '/' },
    navItems: {
      type: Array as PropType<ReadonlyArray<TopNavItem>>,
      required: true,
    },
    userMenu: null,
    navAriaLabel: String,
    className: String,
    dataMolId: String,
  },
  setup(props, { slots }) {
    const cm = getClassMap()
    const location = useLocation()
    const { t } = useTranslation()
    // The nav region's aria-label: prop > `t()` > default. Read in the render
    // function, so a locale switch re-renders it, as React's does.
    const navLabel = (): string =>
      props.navAriaLabel ??
      t('topNavLayout.aria.primaryNavigation', undefined, { defaultValue: 'Primary navigation' })

    return (): VNode =>
      h(
        'div',
        {
          class: cm.cn(cm.minH('screen'), cm.topNavLayoutRoot, props.className),
          'data-mol-id': props.dataMolId,
        },
        [
          h('header', { class: cm.cn(cm.topNavLayoutHeader) }, [
            h(
              'div',
              {
                class: cm.cn(
                  cm.maxW('7xl'),
                  cm.mxAuto,
                  cm.sp('px', 6),
                  cm.sp('py', 3),
                  cm.flex({ align: 'center', justify: 'between', gap: 'lg' }),
                ),
              },
              [
                h(
                  Link,
                  {
                    to: props.logoTo,
                    class: cm.cn(cm.textSize('2xl'), cm.fontWeight('bold')),
                  },
                  () => props.appName,
                ),
                h(
                  'nav',
                  {
                    class: cm.flex({ align: 'center', gap: 'md' }),
                    'aria-label': navLabel(),
                  },
                  props.navItems.map((item) => {
                    const active = navItemActive(location.value.pathname, item.to)
                    const content: VNodeChild[] = []
                    if (item.icon) {
                      content.push(
                        h('span', { class: cm.iconGlyphFont, 'aria-hidden': 'true' }, item.icon),
                      )
                    }
                    content.push(h('span', { class: cm.topNavLayoutNavItemLabel }, item.label))
                    return h(
                      Link,
                      {
                        key: item.key,
                        to: item.to,
                        // Below `md` the label span hides and the link becomes
                        // icon-only; the icon span is aria-hidden, so the link's
                        // accessible name must come from here.
                        'aria-label': item.label,
                        'aria-current': active ? 'page' : undefined,
                        class: cm.cn(
                          cm.flex({ align: 'center', gap: 'xs' }),
                          cm.sp('px', 3),
                          cm.sp('py', 2),
                          cm.textSize('sm'),
                          cm.fontWeight('medium'),
                          cm.topNavLayoutNavItem,
                          active
                            ? cm.cn(cm.bgPrimaryContainer, cm.textPrimary)
                            : cm.cn(cm.textMuted, cm.topNavLayoutNavItemIdle),
                        ),
                      },
                      () => content,
                    )
                  }),
                ),
                ...slotOrProp(slots.userMenu, props.userMenu),
              ],
            ),
          ]),
          // The page body, or the matched child route through the app's routing bond.
          h('main', null, slots.default ? slots.default() : h(RoutedView)),
        ],
      )
  },
})
