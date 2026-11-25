// @vitest-environment jsdom
/**
 * The `Link` cases themselves: a plain DOM anchor driven by `followRouterLink`
 * (the rule every binding's `Link` calls) passes all of them, and a hand-written
 * click handler of the kind the bindings' `Link` replaces fails exactly the
 * cases it gets wrong — so a binding cannot pass with that handler.
 *
 * @module
 */

import { afterEach, describe, expect, it } from 'vitest'

import { I18nError } from '@molecule/app-i18n'
import {
  followRouterLink,
  resolveLinkPath,
  type Router,
  routerLinkHref,
} from '@molecule/app-routing'

import {
  linkCases,
  type LinkMount,
  type LinkMountProps,
  linkRenderer,
  type MountedLink,
  runLinkConformance,
} from '../link/index.js'

/** The key of the no-router error the test link throws: each binding's has a key of its own. */
const NO_ROUTER_ERROR_KEY = 'conformance.error.useRouterOutsideProvider'

/** When a test link insists on a mounted router. */
type RouterNeed = 'as-needed' | 'always' | 'never'

/**
 * The router the test link follows a click to `to` through, among what is mounted. A URL outside
 * the app needs none, so it is left to the browser; an app path with no router mounted fails with
 * the no-router error, as every binding's `Link` fails.
 *
 * @param need - Whether it requires a router for every destination, for an app path only, or never.
 * @param router - The mounted router, or `null`.
 * @param to - The link's destination.
 * @returns The router, or `null` for a destination it leaves to the browser with none mounted.
 * @throws {I18nError} When it requires a router for `to` and none is mounted.
 */
const routerFor = (need: RouterNeed, router: Router | null, to: string): Router | null => {
  const required = need === 'always' || (need === 'as-needed' && resolveLinkPath(to) !== null)
  if (router !== null) return router
  if (required) throw new I18nError(NO_ROUTER_ERROR_KEY, undefined, 'No router here.')
  return null
}

/** How a test link handles a click its caller's handler did not prevent. */
type ClickRule = (event: MouseEvent, to: string, router: Router, props: LinkMountProps) => void

/** How a test link writes its anchor's `href`, hands out the anchor and requires a router. */
interface AnchorRule {
  href: (to: string, router: Router) => string
  forwardsRef: boolean
  /** When it insists on a mounted router; every binding's `Link` requires one as-needed. */
  needsRouter?: RouterNeed
}

/**
 * A `Link` made of a plain anchor and a click rule.
 *
 * @param rule - What the anchor does on click.
 * @param anchorRule - How it writes its `href`, whether it hands the anchor to `ref`, and when it
 * requires a router.
 * @returns The mount function.
 */
const domLink =
  (
    rule: ClickRule,
    anchorRule: AnchorRule = { href: routerLinkHref, forwardsRef: true },
  ): LinkMount =>
  async (container, router, props) => {
    const need = anchorRule.needsRouter ?? 'as-needed'
    const linkRouter = (destination: string): Router | null => routerFor(need, router, destination)
    const href = (destination: string): string => {
      const current = linkRouter(destination)
      return current === null ? destination : anchorRule.href(destination, current)
    }
    const anchor = document.createElement('a')
    let to = props.to
    anchor.setAttribute('href', href(to))
    anchor.textContent = props.text
    for (const [name, value] of Object.entries(props.attrs ?? {})) anchor.setAttribute(name, value)
    anchor.addEventListener('click', (event) => {
      props.onClick?.(event)
      const current = linkRouter(to)
      if (current !== null) rule(event, to, current, props)
    })
    container.appendChild(anchor)
    if (anchorRule.forwardsRef) props.ref?.(anchor)
    return {
      setTo: async (next) => {
        to = next
        anchor.setAttribute('href', href(next))
      },
      unmount: async () => {
        anchor.remove()
        if (anchorRule.forwardsRef) props.ref?.(null)
      },
    }
  }

/** The click rule every binding's `Link` calls. */
const routerRule: ClickRule = (event, to, router, props) => {
  followRouterLink(event, to, router, { replace: props.replace, state: props.state })
}

runLinkConformance('followRouterLink', domLink(routerRule), NO_ROUTER_ERROR_KEY)

/**
 * The cases a link fails.
 *
 * @param mount - The link.
 * @param mounted - Collects what the cases mounted.
 * @returns The failed cases' names.
 */
const failedCases = async (mount: LinkMount, mounted: MountedLink[]): Promise<string[]> => {
  const { render, renderWithoutRouter } = linkRenderer('probe', mount, mounted)
  const failed: string[] = []
  for (const linkCase of linkCases) {
    try {
      await linkCase.run(render, renderWithoutRouter, NO_ROUTER_ERROR_KEY)
    } catch (_error) {
      // Intentional noop: the failure is the observation; its name is recorded below.
      failed.push(linkCase.name)
    }
    for (const link of mounted.splice(0)) await link.unmount()
    document.body.innerHTML = ''
  }
  return failed
}

describe('a link that writes its destination as the href and keeps its anchor', () => {
  const mounted: MountedLink[] = []

  it('fails the base-path href and ref cases', async () => {
    // Every binding's Link wrote `href={to}` before `routerLinkHref`: under a base path or a hash
    // history, a middle-click opened a page the app does not serve.
    const raw = domLink(routerRule, { href: (to) => to, forwardsRef: false })
    expect(await failedCases(raw, mounted)).toEqual([
      'an app path carries the href the router writes for it, base path included',
      'forwards ref to the anchor',
    ])
  })
})

describe('a hand-written link click handler', () => {
  const mounted: MountedLink[] = []
  afterEach(async () => {
    for (const link of mounted.splice(0)) await link.unmount()
    document.body.innerHTML = ''
  })

  it('fails the target, external, replace and state cases', async () => {
    // The rule the header and footer packages hand-wrote before `Link`: modifier keys are
    // checked, but not the target or the origin, and every click pushes without state.
    const naive = domLink((event, to, router) => {
      if (
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey ||
        event.defaultPrevented
      )
        return
      event.preventDefault()
      router.navigate(to)
    })
    expect(await failedCases(naive, mounted)).toEqual([
      'an anchor with target="_blank" is left to the browser',
      'a URL on the page origin navigates in-app to its path',
      'an external destination (https://elsewhere.example/page) is left to the browser',
      'an external destination (mailto:help@example.com) is left to the browser',
      'an external destination (//cdn.example/file) is left to the browser',
      'replace replaces the current entry',
      'a link to the location already shown replaces it instead of pushing a duplicate',
      'carries state onto the new location',
    ])
  })
})

describe('a link that does not look at its destination to decide it needs a router', () => {
  const mounted: MountedLink[] = []
  afterEach(async () => {
    for (const link of mounted.splice(0)) await link.unmount()
    document.body.innerHTML = ''
  })

  it('fails the no-router URL case when it requires a router for every destination', async () => {
    // Every binding's Link read its router with a throwing hook: a link to another site, or a
    // `mailto:` address, failed in a tree with no router, where only the browser is needed.
    const always = domLink(routerRule, {
      href: routerLinkHref,
      forwardsRef: true,
      needsRouter: 'always',
    })
    expect(await failedCases(always, mounted)).toEqual([
      'a link to a URL outside the app renders with no router mounted, and a plain click is left to the browser',
    ])
  })

  it('fails the no-router app-path case when it never requires a router', async () => {
    // Without the guard, an app that forgot to mount its router would render app paths as plain
    // anchors that reload the page, and never learn why.
    const never = domLink(routerRule, {
      href: routerLinkHref,
      forwardsRef: true,
      needsRouter: 'never',
    })
    expect(await failedCases(never, mounted)).toEqual([
      'a link to an app path with no router mounted fails with the no-router error',
    ])
  })
})
