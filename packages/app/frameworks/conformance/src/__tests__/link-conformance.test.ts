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

import { followRouterLink, type Router, routerLinkHref } from '@molecule/app-routing'

import {
  linkCases,
  type LinkMount,
  type LinkMountProps,
  linkRenderer,
  type MountedLink,
  runLinkConformance,
} from '../link/index.js'

/** How a test link handles a click its caller's handler did not prevent. */
type ClickRule = (event: MouseEvent, to: string, router: Router, props: LinkMountProps) => void

/** How a test link writes its anchor's `href` and hands out the anchor. */
interface AnchorRule {
  href: (to: string, router: Router) => string
  forwardsRef: boolean
}

/**
 * A `Link` made of a plain anchor and a click rule.
 *
 * @param rule - What the anchor does on click.
 * @param anchorRule - How it writes its `href` and whether it hands the anchor to `ref`.
 * @returns The mount function.
 */
const domLink =
  (
    rule: ClickRule,
    anchorRule: AnchorRule = { href: routerLinkHref, forwardsRef: true },
  ): LinkMount =>
  async (container, router, props) => {
    const anchor = document.createElement('a')
    let to = props.to
    anchor.setAttribute('href', anchorRule.href(to, router))
    anchor.textContent = props.text
    for (const [name, value] of Object.entries(props.attrs ?? {})) anchor.setAttribute(name, value)
    anchor.addEventListener('click', (event) => {
      props.onClick?.(event)
      rule(event, to, router, props)
    })
    container.appendChild(anchor)
    if (anchorRule.forwardsRef) props.ref?.(anchor)
    return {
      setTo: async (next) => {
        to = next
        anchor.setAttribute('href', anchorRule.href(next, router))
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

runLinkConformance('followRouterLink', domLink(routerRule))

/**
 * The cases a link fails.
 *
 * @param mount - The link.
 * @param mounted - Collects what the cases mounted.
 * @returns The failed cases' names.
 */
const failedCases = async (mount: LinkMount, mounted: MountedLink[]): Promise<string[]> => {
  const render = linkRenderer('probe', mount, mounted)
  const failed: string[] = []
  for (const linkCase of linkCases) {
    try {
      await linkCase.run(render)
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
