// @vitest-environment jsdom
/**
 * The ListRouteNav cases themselves: a framework-free `ListRouteNav` made of plain DOM
 * over core's memory router, `resolveListRoute` and `followRouterLink` (the pieces every
 * port's `ListRouteNav` is built from) reproduces React's goldens, and each known-bad
 * variant (an `aria-current="false"` on inactive links, links rebuilt on every render, a
 * click handler that leaves the click to the browser) differs from them, so a bond cannot
 * pass while making one of those mistakes.
 *
 * @module
 */

import { describe, expect, it } from 'vitest'

import {
  createMemoryRouter,
  followRouterLink,
  generatePath,
  resolveListRoute,
  type RouteParams,
} from '@molecule/app-routing'

import {
  type ListRouteNavCaseItem,
  listRouteNavCases,
  listRouteNavGoldens,
  type ListRouteNavMount,
  listRouteNavRoutes,
  recordListRouteNavCase,
  runListRouteNavConformance,
} from '../routing/index.js'

/** A mistake a variant makes. */
type Mistake = 'aria-current-false' | 'rebuild-links' | 'browser-click'

/** Lets the router's listeners and the render run. */
const settle = async (): Promise<void> => {
  for (let i = 0; i < 3; i++) await new Promise((resolve) => setTimeout(resolve, 0))
}

/**
 * A `ListRouteNav` of plain DOM, rendered on every route change.
 *
 * @param mistake - The mistake this variant makes, if any.
 * @returns The mount.
 */
const domListRouteNav =
  (mistake?: Mistake): ListRouteNavMount =>
  async (container, initialPath, props) => {
    const router = createMemoryRouter({
      initialEntries: [initialPath],
      routes: listRouteNavRoutes.map((path) => ({ path })),
    })
    const nav = document.createElement('nav')
    nav.setAttribute('aria-label', props['aria-label'])
    for (const [name, value] of Object.entries(props.attrs ?? {})) nav.setAttribute(name, value)
    container.appendChild(nav)
    const output = props.children ? document.createElement('output') : undefined
    if (output) {
      output.setAttribute('data-testid', 'children')
      container.appendChild(output)
    }
    const choices = new Map<string, HTMLElement>()
    // Each choice's in-app destination, which its click navigates to.
    const targets = new Map<string, string>()
    const entries = Object.entries(props.selections)

    const render = (): void => {
      const current: RouteParams = router.getParams()
      const destinations: Record<string, ListRouteNavCaseItem> = { ...props.selections }
      for (const [selection, item] of entries) {
        if (item.params) {
          destinations[selection] = {
            ...item,
            path: generatePath(item.path, { ...current, ...item.params }),
          }
        }
      }
      const route = resolveListRoute(
        { location: router.getLocation(), routeParams: current },
        {
          selections: destinations,
          defaultSelection: props.defaultSelection,
          pageParam: props.pageParam,
        },
        router.navigate,
      )
      if (mistake === 'rebuild-links') choices.clear()
      const parent = props.list ? document.createElement('ul') : nav
      if (props.list?.className) parent.setAttribute('class', props.list.className)
      const rendered: Node[] = []
      for (const [selection, item] of entries) {
        const active = route.selection === selection
        const disabled = item.disabled === true
        let element = choices.get(selection)
        if (!element) {
          element = document.createElement(disabled ? 'span' : 'a')
          element.textContent = item.label
          if (!disabled) {
            element.addEventListener('click', (event) => {
              const to = targets.get(selection) ?? ''
              if (mistake !== 'browser-click') followRouterLink(event, to, router)
            })
          }
          choices.set(selection, element)
        }
        const className =
          typeof props.linkClassName === 'function'
            ? props.linkClassName({ selection, active, disabled })
            : props.linkClassName
        if (className) element.setAttribute('class', className)
        else element.removeAttribute('class')
        element.setAttribute('data-state', active ? 'active' : 'inactive')
        element.setAttribute('data-mol-id', `list-route-${selection}`)
        if (active) element.setAttribute('aria-current', 'page')
        else if (mistake === 'aria-current-false') element.setAttribute('aria-current', 'false')
        else element.removeAttribute('aria-current')
        if (disabled) {
          element.setAttribute('role', 'link')
          element.setAttribute('aria-disabled', 'true')
        } else {
          const to = route.href({ selection })
          targets.set(selection, to)
          element.setAttribute('href', router.createHref(to))
        }
        if (props.list) {
          const li = element.parentElement ?? document.createElement('li')
          if (props.list.itemClassName) li.setAttribute('class', props.list.itemClassName)
          li.appendChild(element)
          rendered.push(li)
        } else {
          rendered.push(element)
        }
      }
      parent.replaceChildren(...rendered)
      if (parent !== nav) nav.replaceChildren(parent)
      if (output && props.children) output.textContent = props.children(route)
    }

    render()
    const stop = router.subscribe(render)
    return {
      nativePath: () => {
        const { pathname, search, hash } = router.getLocation()
        return pathname + search + hash
      },
      nativeBack: () => router.back(),
      nativeForward: () => router.forward(),
      perform: async (action) => {
        await action()
        await settle()
      },
      unmount: async () => {
        stop()
        router.destroy()
      },
    }
  }

describe('ListRouteNav cases', () => {
  it('has a recorded golden for every case', () => {
    const goldens = listRouteNavGoldens()
    expect(listRouteNavCases.map((c) => c.name).filter((name) => !(name in goldens))).toEqual([])
  })
})

runListRouteNavConformance('plain DOM over core', domListRouteNav())

describe.each<Mistake>(['aria-current-false', 'rebuild-links', 'browser-click'])(
  'a ListRouteNav that makes the mistake %s',
  (mistake) => {
    it('differs from the goldens in at least one case', async () => {
      const goldens = listRouteNavGoldens()
      const differing: string[] = []
      for (const testCase of listRouteNavCases) {
        const records = await recordListRouteNavCase(domListRouteNav(mistake), testCase)
        const golden = goldens[testCase.name]
        if (JSON.stringify(records) !== JSON.stringify(golden)) differing.push(testCase.name)
      }
      expect(differing.length).toBeGreaterThan(0)
    })
  },
)
