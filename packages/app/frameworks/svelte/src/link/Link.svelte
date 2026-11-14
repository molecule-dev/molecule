<!--
  @component
  An `<a href={to}>` that navigates in-app through the molecule router, with
  react-router `<Link>`'s rules (`followRouterLink` from `@molecule/app-routing`):
  a plain primary click navigates without a page load; a ctrl/cmd, shift or alt
  click, a `target` other than `_self`, a click an `onclick` already prevented,
  and a URL on another origin are left to the browser.
-->
<script lang="ts">
  import { followRouterLink } from '@molecule/app-routing'

  import { useRouterInstance } from '../context.js'
  import type { LinkProps } from './types.js'

  let { to, replace, state, children, onclick, ...anchor }: LinkProps = $props()

  const router = useRouterInstance()

  /**
   * Runs the caller's `onclick`, then navigates in-app for a click the router
   * should take.
   *
   * @param event - The anchor's click event.
   */
  function handleClick(
    event: MouseEvent & { currentTarget: EventTarget & HTMLAnchorElement },
  ): void {
    onclick?.(event)
    followRouterLink(event, to, router, { replace, state })
  }
</script>

<a {...anchor} href={to} onclick={handleClick}>{@render children?.()}</a>
