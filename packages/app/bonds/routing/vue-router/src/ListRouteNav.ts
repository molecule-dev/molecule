/**
 * Navigation between URL-backed list views, using the same declaration for labels and destinations.
 *
 * @module
 */

import { defineComponent, h, type HTMLAttributes, type VNodeChild } from 'vue'

import type { RouteParams } from '@molecule/app-routing'
import { followRouterLink, generatePath } from '@molecule/app-routing'

import { useMoleculeRouter } from './composables.js'
import type { ListRouteAuth, ListRouteResult, ListRouteSelection } from './list-types.js'
import { useListRoute } from './useListRoute.js'

/** A named list view and its navigation label. */
export interface ListRouteNavItem extends ListRouteSelection {
  /** Translated label, optionally including an icon. */
  label: VNodeChild
  /** Path parameters for this destination; current route parameters are otherwise retained. */
  params?: RouteParams
  /** Keep the choice visible but prevent navigation. Authorization still belongs in the route. */
  disabled?: boolean
}

/** URL-derived state available to the app's link styling. */
export interface ListRouteNavItemState<Selection extends string = string> {
  /** The app-owned selection key. */
  selection: Selection
  /** Whether the current URL selects this view. */
  active: boolean
  /** Whether navigation is disabled for this choice. */
  disabled: boolean
}

/**
 * Props for URL-backed list navigation; local content panels use the UI package's Tabs instead.
 *
 * It carries every native `<nav>` attribute React's prop type does (`id`, `class`, event
 * listeners), so one declaration serves both bonds; Vue's attribute fallthrough puts them
 * on the navigation landmark.
 */
export interface ListRouteNavProps<Selection extends string = string> extends Omit<
  HTMLAttributes,
  'aria-label' | 'children'
> {
  /** Accessible navigation name, translated by the app. */
  'aria-label': string
  /** Every declared view stays visible on every route; labels and targets share one declaration. */
  selections: Record<Selection, ListRouteNavItem>
  /** Tie-breaker or fallback, with the same meaning as useListRoute's defaultSelection. */
  defaultSelection?: NoInfer<Selection>
  /** Pagination query key to remove on selection, defaulting to page. */
  pageParam?: string
  /** Required for protected selections, with the same readiness rules as useListRoute. */
  auth?: ListRouteAuth
  /** Render links in a list, with optional classes for the list and its items. */
  list?: { className?: string; itemClassName?: string }
  /** App-owned styling, resolved from its class map. */
  linkClassName?: string | ((state: ListRouteNavItemState<Selection>) => string | undefined)
  /** Render the list beside the nav using its exact URL state, including resolved item params. */
  children?: (route: ListRouteResult<string, Selection>) => VNodeChild
}

/** The link attributes every choice carries, styled and described by its URL state. */
interface ChoiceAttributes {
  /** The app's link class for this state. */
  class: string | undefined
  /** `active` or `inactive`, for the app's CSS. */
  'data-state': 'active' | 'inactive'
  /** The choice's app-owned selection key. */
  'data-mol-id': string
  /** The accessibility tree's current-page marker, present only while active. */
  'aria-current': 'page' | undefined
}

/**
 * Render every declared list view as a router link. The URL selects the active choice, and
 * selecting any view resets pagination through useListRoute. Native link behavior (new-tab
 * clicks, keyboard activation and history) is preserved. This is a navigation landmark,
 * not an ARIA tablist with local panels. No active-value state or change handler is needed.
 * When children are supplied, they render after the navigation landmark. Put loading and
 * empty results in that branch so a pending list never removes the filter controls.
 *
 * The links are the component's OWN anchors: their `href` is the molecule router's
 * `createHref` (the href the native router's own link writes, base path and hash history
 * included), and a plain click navigates through `followRouterLink`, so a modified click,
 * a `target` other than `_self` or an external URL is left to the browser. The rendered
 * markup is exactly react-router's `ListRouteNav`: same elements, attributes and ARIA, no
 * styles of its own. The accessible name and every other native attribute (`id`, `class`,
 * listeners) arrive through Vue's attribute fallthrough onto the `<nav>`.
 *
 * @param props - Named destinations, translated labels, optional auth and native nav attributes.
 * @returns The navigation landmark with all its choices, followed by any rendered content.
 *
 * @example
 * ```ts
 * import { defineComponent, h } from 'vue'
 * import { ListRouteNav } from '@molecule/app-routing-vue-router'
 *
 * export const OrderViews = defineComponent(() => () =>
 *   h(ListRouteNav, {
 *     'aria-label': 'Order views',
 *     selections: {
 *       all: { path: '/orders', query: { view: undefined }, label: 'All orders' },
 *       open: { path: '/orders', query: { view: 'open' }, label: 'Open orders' },
 *     },
 *     children: (route) => h(OrderResults, { selection: route.selection, page: route.page }),
 *   }),
 * )
 * ```
 */
export const ListRouteNav = defineComponent(
  (props: ListRouteNavProps, { attrs }) => {
    const router = useMoleculeRouter()
    // The same declaration drives the list rules and the links: item params are applied to
    // the destination path, and the current route's params fill the rest.
    const route = useListRoute(() => {
      const currentParams: RouteParams = {}
      for (const [name, value] of Object.entries(router.value.getParams())) {
        if (value !== undefined) currentParams[name] = value
      }
      // Resolve per-choice params before matching as well as before building links:
      // two choices can share /folders/:folder while naming different folders.
      const destinations: Record<string, ListRouteNavItem> = { ...props.selections }
      for (const [selection, item] of Object.entries(props.selections)) {
        if (item.params) {
          destinations[selection] = {
            ...item,
            path: generatePath(item.path, { ...currentParams, ...item.params }),
          }
        }
      }
      return {
        selections: destinations,
        defaultSelection: props.defaultSelection,
        pageParam: props.pageParam,
        auth: props.auth,
      }
    })

    return (): VNodeChild => {
      const list = route.value
      const choices = Object.entries(props.selections).map(([selection, item]) => {
        const active = list.selection === selection
        const disabled = item.disabled === true
        const linkClassName = props.linkClassName
        const attributes: ChoiceAttributes = {
          class:
            typeof linkClassName === 'function'
              ? linkClassName({ selection, active, disabled })
              : linkClassName,
          'data-state': active ? 'active' : 'inactive',
          'data-mol-id': `list-route-${selection}`,
          'aria-current': active ? 'page' : undefined,
        }
        const to = disabled ? undefined : list.href({ selection })
        const link =
          to === undefined
            ? h('span', { key: selection, ...attributes, role: 'link', 'aria-disabled': 'true' }, [
                item.label,
              ])
            : h(
                'a',
                {
                  key: selection,
                  ...attributes,
                  href: router.value.createHref(to),
                  onClick: (event: MouseEvent) => {
                    followRouterLink(event, to, router.value)
                  },
                },
                [item.label],
              )
        return props.list
          ? h('li', { key: selection, class: props.list.itemClassName }, link)
          : link
      })
      const nav = h(
        'nav',
        attrs,
        props.list ? h('ul', { class: props.list.className }, choices) : choices,
      )
      const content = props.children?.(list)
      return content === undefined ? nav : [nav, content]
    }
  },
  {
    name: 'ListRouteNav',
    props: [
      'selections',
      'defaultSelection',
      'pageParam',
      'auth',
      'list',
      'linkClassName',
      'children',
    ],
    inheritAttrs: false,
  },
)
