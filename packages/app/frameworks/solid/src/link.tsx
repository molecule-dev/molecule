/**
 * `Link`: an in-app anchor for Solid, the counterpart of react-router's `<Link>`.
 *
 * @module
 */

import { createMemo, type JSX, splitProps } from 'solid-js'

import { followRouterLink, routerLinkHref } from '@molecule/app-routing'

import { useLinkRouter } from './primitives/router.js'

/**
 * Props for {@link Link}. Every other anchor attribute (`class`, `target`,
 * `rel`, `aria-*`, `data-*`, `onClick`) goes on the anchor.
 */
export interface LinkProps extends Omit<JSX.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
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
 * Runs a Solid event handler in either of its forms: a function, or the
 * `[handler, data]` tuple Solid binds without a closure.
 *
 * @param handler - The caller's `onClick`.
 * @param event - The click event.
 */
const callHandler = (
  handler: JSX.EventHandlerUnion<HTMLAnchorElement, MouseEvent> | undefined,
  event: MouseEvent & { currentTarget: HTMLAnchorElement; target: Element },
): void => {
  if (typeof handler === 'function') handler(event)
  else if (Array.isArray(handler)) handler[0](handler[1], event)
}

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
 * `router`.
 *
 * @example
 * ```tsx
 * import { Link } from '@molecule/app-solid'
 *
 * export const Nav = () => (
 *   <nav>
 *     <Link to="/projects" class="nav-link">Projects</Link>
 *     <Link to="/login" replace state={{ from: '/projects' }}>Log in</Link>
 *     <Link to="https://molecule.dev">Molecule</Link>
 *   </nav>
 * )
 * ```
 *
 * @param props - The link's {@link LinkProps}; other attributes go on the anchor.
 * @returns The anchor.
 */
export const Link = (props: LinkProps): JSX.Element => {
  const [local, anchor] = splitProps(props, ['to', 'replace', 'state', 'onClick', 'children'])
  const router = useLinkRouter(() => local.to)
  /** The anchor's `href`: the URL as written when no router is mounted, else the one the router writes. */
  const href = createMemo(() => {
    const current = router()
    return current === null ? local.to : routerLinkHref(local.to, current)
  })

  /**
   * Runs the caller's `onClick`, then navigates in-app for a click the router
   * should take. With no router (a URL outside the app) the browser follows the
   * anchor instead.
   *
   * @param event - The anchor's click event.
   */
  const onClick = (
    event: MouseEvent & { currentTarget: HTMLAnchorElement; target: Element },
  ): void => {
    callHandler(local.onClick, event)
    const current = router()
    if (current !== null) {
      followRouterLink(event, local.to, current, { replace: local.replace, state: local.state })
    }
  }

  return (
    <a {...anchor} href={href()} onClick={onClick}>
      {local.children}
    </a>
  )
}
