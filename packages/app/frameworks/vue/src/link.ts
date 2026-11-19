/**
 * `Link`: an in-app anchor for Vue, the counterpart of react-router's `<Link>`.
 *
 * @module
 */

import { defineComponent, h, mergeProps } from 'vue'

import { followRouterLink, routerLinkHref } from '@molecule/app-routing'

import { useRouterInstance } from './composables/useRouter.js'

/** Props for {@link Link}. Every other attribute (`class`, `target`, `rel`, `aria-*`, `onClick`) goes on the anchor. */
export interface LinkProps {
  /** Destination: an app path (`/settings?tab=billing#plan`) or a URL. An app path's `href` is the one the router writes for it (`routerLinkHref`), base path included. */
  to: string
  /**
   * Replace the current history entry instead of pushing one. When omitted, a
   * link to the location already shown replaces it and any other link pushes,
   * as with react-router's `<Link>`.
   */
  replace?: boolean
  /** State stored with the new history entry (read back with `useLocation()`). */
  state?: unknown
}

/**
 * An `<a href={to}>` that navigates in-app through the molecule router, with
 * react-router `<Link>`'s rules (`followRouterLink` from `@molecule/app-routing`):
 * a plain primary click navigates without a page load; a ctrl/cmd, shift or alt
 * click, a `target` other than `_self`, a click an `onClick` already prevented,
 * and a URL on another origin are left to the browser.
 *
 * Use it for every internal link instead of an anchor with a click handler that
 * calls `navigate()`. Needs the router from `moleculePlugin`.
 *
 * @example
 * ```ts
 * import { defineComponent, h } from 'vue'
 * import { Link } from '@molecule/app-vue'
 *
 * export const Nav = defineComponent(() => () =>
 *   h('nav', [
 *     h(Link, { to: '/projects', class: 'nav-link' }, () => 'Projects'),
 *     h(Link, { to: '/login', replace: true, state: { from: '/projects' } }, () => 'Log in'),
 *   ]),
 * )
 * ```
 *
 * In a template: `<Link to="/settings">Settings</Link>`.
 *
 * @param props - The link's {@link LinkProps}; other attributes go on the anchor.
 * @param context - The setup context: the default slot is the link's content.
 * @returns The render function of the anchor.
 */
export const Link = defineComponent(
  (props: LinkProps, { attrs, slots }) => {
    const router = useRouterInstance()

    /**
     * Navigates in-app for a click the router should take; runs after the
     * caller's own `onClick`, so that one can still prevent it.
     *
     * @param event - The anchor's click event.
     */
    const onClick = (event: MouseEvent): void => {
      followRouterLink(event, props.to, router, { replace: props.replace, state: props.state })
    }

    return () =>
      h(
        'a',
        mergeProps(attrs, { href: routerLinkHref(props.to, router), onClick }),
        slots.default?.(),
      )
  },
  { name: 'Link', props: ['to', 'replace', 'state'], inheritAttrs: false },
)
