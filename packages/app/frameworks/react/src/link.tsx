/**
 * `Link`: an in-app anchor for React, the counterpart of react-router's `<Link>`, exported as
 * `@molecule/app-react/link`. The Vue, Solid, Svelte and Angular bindings export their `Link` from
 * their root; React's sits on its own path because it renders a DOM anchor, and
 * `@molecule/app-react-native` re-exports the root of `@molecule/app-react`.
 *
 * @module
 */

import { type AnchorHTMLAttributes, forwardRef, type MouseEvent as ReactMouseEvent } from 'react'

import { followRouterLink, routerLinkHref } from '@molecule/app-routing'

import { useLinkRouter } from './hooks/useRouter.js'

/**
 * Props for {@link Link}. Every other anchor attribute (`className`, `target`,
 * `rel`, `aria-*`, `data-*`, `onClick`) goes on the anchor, and a `ref` receives the anchor.
 */
export interface LinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  /**
   * Destination: an app path (`/settings?tab=billing#plan`) or a URL. An app path's `href` is the
   * one the router writes for it (`routerLinkHref`), base path included; a URL's is the URL as
   * written.
   */
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
 * The DOM event `followRouterLink` should read for a React click.
 *
 * React dispatches a click from a synthetic event while the underlying native
 * event is still bubbling at the root container, where React listens, so
 * `event.nativeEvent.currentTarget` is that container. `followRouterLink` reads
 * `currentTarget` to see the anchor's `target`, so this view reports the anchor
 * for it and the native event for every other member (a caller's `onClick`
 * prevented the native click too). Methods are bound to the native event so a
 * real browser's brand checks accept them.
 *
 * @param event - The anchor's React click event.
 * @returns A `MouseEvent` whose `currentTarget` is the anchor.
 */
const routerEvent = (event: ReactMouseEvent<HTMLAnchorElement>): MouseEvent =>
  new Proxy(event.nativeEvent, {
    get: (native, property): unknown => {
      if (property === 'currentTarget') return event.currentTarget
      const value: unknown = Reflect.get(native, property)
      return typeof value === 'function' ? value.bind(native) : value
    },
  })

/**
 * An `<a href={to}>` that navigates in-app through the molecule router, with
 * react-router `<Link>`'s rules (`followRouterLink` from `@molecule/app-routing`):
 * a plain primary click navigates without a page load; a ctrl/cmd, shift or alt
 * click, a `target` other than `_self`, a click an `onClick` already prevented,
 * and a URL on another origin are left to the browser.
 *
 * A link to a URL outside the app (another origin, `mailto:`, `//host`) needs
 * no router: the browser, or on a device the URL handler, opens it. It renders
 * with no router mounted, the URL as its `href`, and a click is left to the
 * browser (`onClick` still runs). A link to an app path needs a router, and
 * fails without one with the error `useRouterInstance` throws.
 *
 * Use it for every internal link instead of an anchor with a click handler that
 * calls `navigate()`. Render it inside a `MoleculeProvider` whose config has a
 * `router`, so it works under every routing bond (including one that mounts no
 * react-router `<Router>`).
 *
 * @example
 * ```tsx
 * import { Link } from '@molecule/app-react/link'
 *
 * export function Nav() {
 *   return (
 *     <nav>
 *       <Link to="/projects" className="nav-link">Projects</Link>
 *       <Link to="/login" replace state={{ from: '/projects' }}>Log in</Link>
 *       <Link to="https://molecule.dev">Molecule</Link>
 *     </nav>
 *   )
 * }
 * ```
 *
 * It forwards `ref` to the anchor with `forwardRef`, which React 18 and 19 both honour (the
 * binding supports both).
 */
export const Link = forwardRef<HTMLAnchorElement, LinkProps>(function Link(
  { replace, state, children, ...anchor },
  ref,
) {
  const { to, onClick } = anchor
  const router = useLinkRouter(to)

  /**
   * Runs the caller's `onClick`, then navigates in-app for a click the router
   * should take. With no router (a URL outside the app) the browser follows the
   * anchor instead.
   *
   * @param event - The anchor's click event.
   */
  const handleClick = (event: ReactMouseEvent<HTMLAnchorElement>): void => {
    onClick?.(event)
    if (router === null) return
    followRouterLink(routerEvent(event), to, router, { replace, state })
  }

  const href = router === null ? to : routerLinkHref(to, router)
  const attributes = Object.fromEntries(
    Object.entries(anchor).map(([name, value]) =>
      name === 'to' || name === 'href' ? ['href', href] : [name, value],
    ),
  )
  return (
    <a {...attributes} ref={ref} onClick={handleClick}>
      {children}
    </a>
  )
})
