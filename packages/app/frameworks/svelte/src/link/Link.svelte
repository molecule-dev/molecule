<!--
  @component
  An `<a href={to}>` that navigates in-app through the molecule router, with
  react-router `<Link>`'s rules (`followRouterLink` from `@molecule/app-routing`):
  a plain primary click navigates without a page load; a ctrl/cmd, shift or alt
  click, a `target` other than `_self`, an `onclick` already prevented,
  and a URL on another origin are left to the browser.

  A link to a URL outside the app (another origin, `mailto:`, `//host`) needs
  no router: the browser, or on a device the URL handler, opens it. It renders
  with no router in context, the URL as its `href`, and a click is left to the
  browser (`onclick` still runs). A link to an app path needs a router, and
  fails without one with the error `useRouterInstance` throws.
-->
<script lang="ts">
  import { followRouterLink, routerLinkHref } from '@molecule/app-routing'

  import { useLinkRouter } from '../context.js'
  import type { LinkProps } from './types.js'

  let {
    to,
    replace,
    state,
    children,
    onclick,
    ref = $bindable(null),
    ...anchor
  }: LinkProps = $props()

  /** Reads the router a destination needs: none for a URL outside the app with no router in context. */
  const linkRouter = useLinkRouter()
  /** The router this link follows: `null` when the browser opens the destination instead. */
  const router = $derived(linkRouter(to))
  /** The anchor's `href`: the URL as written when no router is in context, else the one the router writes. */
  const href = $derived(router === null ? to : routerLinkHref(to, router))

  /**
   * Runs the caller's `onclick`, then navigates in-app for a click the router
   * should take. With no router (a URL outside the app) the browser follows the
   * anchor instead.
   *
   * @param event - The anchor's click event.
   */
  function handleClick(
    event: MouseEvent & { currentTarget: EventTarget & HTMLAnchorElement },
  ): void {
    onclick?.(event)
    if (router !== null) followRouterLink(event, to, router, { replace, state })
  }
</script>

<a {...anchor} bind:this={ref} {href} onclick={handleClick}>{@render children?.()}</a>
