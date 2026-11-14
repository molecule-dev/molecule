/**
 * The click rule of an in-app link: react-router's `<Link>` behavior, written
 * once for every framework binding's `Link` component.
 *
 * @module
 */

import { formatLocation, parseLocation } from './history-router.js'
import type { NavigateOptions, Router } from './types.js'

/** A URL with a scheme (`https:`, `mailto:`) or a protocol-relative one (`//host`). */
const ABSOLUTE_URL = /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i

/**
 * The in-app path a link's `to` names, or `null` when the link leaves the app.
 *
 * A path (`/settings`, `/search?q=a#top`) is returned unchanged. An absolute URL
 * on the page's own origin becomes its path, query and hash; any other absolute
 * URL (another origin, or a scheme such as `mailto:`) returns `null`, which is how
 * react-router's `<Link>` tells an external link from an internal one.
 *
 * @param to - The link's destination.
 * @param origin - The page's origin. Defaults to the current `location.origin`.
 * @returns The path to navigate to, or `null` for an external link.
 */
export function resolveLinkPath(to: string, origin = globalThis.location?.origin): string | null {
  if (!ABSOLUTE_URL.test(to)) return to
  if (!origin) return null
  let url: URL
  try {
    url = new URL(to, origin)
  } catch (_error) {
    // Intentional noop: a URL the parser rejects is not an in-app path, so the
    // browser keeps it, exactly as react-router's Link does.
    return null
  }
  return url.origin === origin ? url.pathname + url.search + url.hash : null
}

/**
 * Whether the router should handle a link click itself, under react-router's
 * `<Link>` rule: the primary button, no meta/ctrl/shift/alt key, not already
 * `defaultPrevented`, and an anchor `target` that is absent or `_self`. Any other
 * click (a new tab, a new window, a download) is left to the browser.
 *
 * @param event - The anchor's click event; its `currentTarget` is the anchor.
 * @returns True when the click should navigate in-app.
 */
export function isRouterLinkClick(event: MouseEvent): boolean {
  const anchor = event.currentTarget
  const target = anchor instanceof Element ? anchor.getAttribute('target') : null
  return (
    event.button === 0 &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey &&
    !event.defaultPrevented &&
    (!target || target === '_self')
  )
}

/** Navigation options a link passes to the router. */
export interface RouterLinkOptions {
  /**
   * Replace the current history entry instead of pushing one. When omitted, a
   * link to the location already shown replaces it (react-router's default), and
   * any other link pushes.
   */
  replace?: boolean
  /** State stored with the new history entry. */
  state?: unknown
}

/**
 * Handles an in-app link's click: when {@link isRouterLinkClick} accepts it and
 * `to` is internal ({@link resolveLinkPath}), the browser's navigation is
 * prevented and the router navigates instead. Every other click keeps the
 * anchor's native behavior.
 *
 * Every binding's `Link` component calls this from its click handler, so all of
 * them follow one rule.
 *
 * @param event - The anchor's click event.
 * @param to - The link's destination (`href`).
 * @param router - The router that navigates.
 * @param options - Whether to replace the history entry, and the state to store.
 * @returns True when the router took the navigation.
 */
export function followRouterLink(
  event: MouseEvent,
  to: string,
  router: Pick<Router, 'navigate' | 'getLocation'>,
  options: RouterLinkOptions = {},
): boolean {
  if (!isRouterLinkClick(event)) return false
  const path = resolveLinkPath(to)
  if (path === null) return false
  event.preventDefault()
  const navigation: NavigateOptions = {
    replace:
      options.replace ??
      formatLocation(router.getLocation()) === formatLocation(parseLocation(path)),
  }
  if (options.state !== undefined) navigation.state = options.state
  router.navigate(path, navigation)
  return true
}
