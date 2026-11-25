// @vitest-environment jsdom

/**
 * `useLinkRouter`: the router a link to a destination navigates through, with a router mounted and
 * with none, which is how every binding's `Link` tells a URL outside the app from an app path.
 *
 * @module
 */

import { type Accessor, createSignal, type JSX } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, describe, expect, it } from 'vitest'

import { I18nError } from '@molecule/app-i18n'
import { createMemoryRouter, type Router } from '@molecule/app-routing'

import { useLinkRouter } from '../primitives/router.js'
import { MoleculeProvider } from '../provider.jsx'

/** What a probe read, by destination: the router, or `null`. */
type Read = Record<string, Router | null>

/** The key of the error a routing primitive throws with no router provided. */
const NO_ROUTER_ERROR_KEY = 'solid.error.useRouterOutsideProvider'

const disposers: (() => void)[] = []
afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
  document.body.innerHTML = ''
})

/**
 * Renders `tree` into a fresh container under the binding's `MoleculeProvider`.
 *
 * @param router - The provider's router, or `null` to leave it out.
 * @param tree - The tree under the provider.
 */
function underProvider(router: Router | null, tree: () => JSX.Element): void {
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(
    render(
      // The provider without a router when none is mounted: an app with no router mounts it the same way.
      () => <MoleculeProvider router={router ?? undefined}>{tree()}</MoleculeProvider>,
      container,
    ),
  )
}

/** What a link router gave for a destination, or the error it threw. */
const outcomeOf = (linkRouter: (to: string) => Router | null, to: string): unknown => {
  try {
    return linkRouter(to)
  } catch (error) {
    return error
  }
}

describe('useLinkRouter', () => {
  it('gives the mounted router for an app path and for a URL', () => {
    const router = createMemoryRouter()
    const read: Read = {}
    underProvider(router, () => {
      for (const to of [
        '/settings?tab=billing#plan',
        'https://elsewhere.example/page',
        'mailto:help@example.com',
      ]) {
        read[to] = useLinkRouter(to)()
      }
      return null
    })
    expect(read['/settings?tab=billing#plan']).toBe(router)
    expect(read['https://elsewhere.example/page']).toBe(router)
    expect(read['mailto:help@example.com']).toBe(router)
  })

  it('gives null for a URL outside the app with no router mounted', () => {
    const read: Read = {}
    underProvider(null, () => {
      for (const to of [
        'https://elsewhere.example/page',
        'mailto:help@example.com',
        '//cdn.example/file',
      ]) {
        read[to] = useLinkRouter(to)()
      }
      return null
    })
    expect(read['https://elsewhere.example/page']).toBeNull()
    expect(read['mailto:help@example.com']).toBeNull()
    expect(read['//cdn.example/file']).toBeNull()
  })

  it('throws the no-router error for an app path with no router mounted', () => {
    let thrown: unknown
    try {
      underProvider(null, () => {
        useLinkRouter('/settings?tab=billing#plan')
        return null
      })
    } catch (error) {
      thrown = error
    }
    expect(thrown).toBeInstanceOf(I18nError)
    expect(thrown instanceof I18nError ? thrown.i18nKey : undefined).toBe(NO_ROUTER_ERROR_KEY)
  })

  it('checks a destination again when it changes from a URL to an app path', () => {
    const [to, setTo] = createSignal('https://elsewhere.example/page')
    let router: Accessor<Router | null> = () => null
    underProvider(null, () => {
      router = useLinkRouter(to)
      return null
    })
    expect(router()).toBeNull()
    // The destination changing is where the link finds out: the accessor asks again.
    let thrown: unknown
    try {
      setTo('/settings')
      router()
    } catch (error) {
      thrown = error
    }
    expect(thrown).toBeInstanceOf(I18nError)
    expect(thrown instanceof I18nError ? thrown.i18nKey : undefined).toBe(NO_ROUTER_ERROR_KEY)
  })

  it('gives a function to call with the destination when called without one', () => {
    const router = createMemoryRouter()
    const read: (Router | null)[] = []
    underProvider(router, () => {
      const linkRouter = useLinkRouter()
      read.push(linkRouter('/settings'), linkRouter('https://elsewhere.example/page'))
      return null
    })
    expect(read).toEqual([router, router])
  })

  it('gives that function with no router too, and it fails an app path there', () => {
    const given: unknown[] = []
    underProvider(null, () => {
      const linkRouter = useLinkRouter()
      for (const to of ['https://elsewhere.example/page', '/settings']) {
        given.push(outcomeOf(linkRouter, to))
      }
      return null
    })
    expect(given[0]).toBeNull()
    expect(given[1]).toBeInstanceOf(I18nError)
    expect(given[1] instanceof I18nError ? given[1].i18nKey : undefined).toBe(NO_ROUTER_ERROR_KEY)
  })
})
