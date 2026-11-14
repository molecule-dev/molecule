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

import { followRouterLink, type Router } from '@molecule/app-routing'

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

/**
 * A `Link` made of a plain anchor and a click rule.
 *
 * @param rule - What the anchor does on click.
 * @returns The mount function.
 */
const domLink =
  (rule: ClickRule): LinkMount =>
  async (container, router, props) => {
    const anchor = document.createElement('a')
    let to = props.to
    anchor.setAttribute('href', to)
    anchor.textContent = props.text
    for (const [name, value] of Object.entries(props.attrs ?? {})) anchor.setAttribute(name, value)
    anchor.addEventListener('click', (event) => {
      props.onClick?.(event)
      rule(event, to, router, props)
    })
    container.appendChild(anchor)
    return {
      setTo: async (next) => {
        to = next
        anchor.setAttribute('href', next)
      },
      unmount: async () => anchor.remove(),
    }
  }

runLinkConformance(
  'followRouterLink',
  domLink((event, to, router, props) => {
    followRouterLink(event, to, router, { replace: props.replace, state: props.state })
  }),
)

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
    const render = linkRenderer('naive', naive, mounted)
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
    expect(failed).toEqual([
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
