// @vitest-environment jsdom

/**
 * `useLinkRouter`: the router a link to a destination navigates through, with a router in context
 * and with none, which is how every binding's `Link` tells a URL outside the app from an app path.
 *
 * @module
 */

import { type Component, flushSync, mount, unmount } from 'svelte'
import { afterEach, describe, expect, it } from 'vitest'

import { I18nError } from '@molecule/app-i18n'
import { createMemoryRouter, type Router } from '@molecule/app-routing'

import AsksLinkRouter from './link/AsksLinkRouter.svelte'
import CallsLinkRouter from './link/CallsLinkRouter.svelte'
import FollowsLinkRouter from './link/FollowsLinkRouter.svelte'
import LinkRouterHost from './link/LinkRouterHost.svelte'

/** What `FollowsLinkRouter` takes. */
type FollowsLinkRouterProps = {
  /** What its router store gave for each destination it showed. */
  seen: unknown[]
}

/** What `FollowsLinkRouter` exports to a case. */
type FollowsLinkRouterExports = {
  /** Changes the destination it follows. */
  setTo(next: string): void
}

/** The props `LinkRouterHost` takes for one page's props. */
type LinkRouterHostProps<PageProps extends Record<string, unknown>> = {
  /** The router the host sets in context, or `null` for none. */
  router: Router | null
  /** The page rendered under it. */
  page: Component<PageProps>
  /** The page's props. */
  pageProps: PageProps
}

/** What the asking pages take, and where they record. */
type AskingProps = {
  /** The destinations to ask about. */
  destinations: string[]
  /** What the hook gave for each, or the error it threw. */
  seen: unknown[]
}

/** The key of the error a router-reading function throws with no router in context. */
const NO_ROUTER_ERROR_KEY = 'svelte.error.useRouterOutsideProvider'

const mounted: { instance: Record<string, unknown>; container: HTMLElement }[] = []
afterEach(async () => {
  for (const { instance, container } of mounted.splice(0)) {
    await unmount(instance)
    container.remove()
  }
})

/**
 * Mounts `page` with `pageProps` with `router` in context, or with none for
 * `null`.
 *
 * @param router - The router, or `null`.
 * @param page - The page.
 * @param pageProps - The page's props.
 */
function under<PageProps extends Record<string, unknown>>(
  router: Router | null,
  page: Component<PageProps>,
  pageProps: PageProps,
): void {
  const container = document.createElement('div')
  document.body.appendChild(container)
  // The type arguments are explicit because `mount` infers a component's props from the component
  // itself, and the host's vary with the page's.
  const instance = mount<LinkRouterHostProps<PageProps>, Record<never, never>>(LinkRouterHost, {
    target: container,
    props: { router, page, pageProps },
  })
  flushSync()
  mounted.push({ instance, container })
}

/** Whether what a probe recorded is the binding's no-router error. */
const isNoRouterError = (seen: unknown): boolean =>
  seen instanceof I18nError && seen.i18nKey === NO_ROUTER_ERROR_KEY

describe('useLinkRouter', () => {
  it('gives the mounted router for an app path and for a URL', () => {
    const router = createMemoryRouter()
    const seen: unknown[] = []
    under<AskingProps>(router, AsksLinkRouter, {
      seen,
      destinations: [
        '/settings?tab=billing#plan',
        'https://elsewhere.example/page',
        'mailto:help@example.com',
      ],
    })
    expect(seen).toEqual([router, router, router])
  })

  it('gives null for a URL outside the app with no router mounted', () => {
    const seen: unknown[] = []
    under<AskingProps>(null, AsksLinkRouter, {
      seen,
      destinations: [
        'https://elsewhere.example/page',
        'mailto:help@example.com',
        '//cdn.example/file',
      ],
    })
    expect(seen).toEqual([null, null, null])
  })

  it('throws the no-router error for an app path with no router mounted', () => {
    const seen: unknown[] = []
    under<AskingProps>(null, AsksLinkRouter, { seen, destinations: ['/settings?tab=billing#plan'] })
    expect(seen).toHaveLength(1)
    expect(seen[0]).toBeInstanceOf(I18nError)
    expect(isNoRouterError(seen[0])).toBe(true)
  })

  it('checks a destination again when it changes from a URL to an app path', () => {
    const seen: unknown[] = []
    const container = document.createElement('div')
    document.body.appendChild(container)
    const instance = mount<FollowsLinkRouterProps, FollowsLinkRouterExports>(FollowsLinkRouter, {
      target: container,
      props: { seen },
    })
    flushSync()
    mounted.push({ instance, container })
    expect(seen).toEqual([null])
    // The destination changing is where the link finds out: the store asks again and throws.
    let thrown: unknown
    try {
      instance.setTo('/settings')
      flushSync()
    } catch (error) {
      thrown = error
    }
    expect(thrown).toBeInstanceOf(I18nError)
    expect(isNoRouterError(thrown)).toBe(true)
    expect(seen).toEqual([null])
  })

  it('gives a function to call with the destination when called without one', () => {
    const router = createMemoryRouter()
    const seen: unknown[] = []
    under<AskingProps>(router, CallsLinkRouter, {
      seen,
      destinations: ['/settings', 'https://elsewhere.example/page'],
    })
    expect(seen).toEqual([router, router])
  })

  it('gives that function with no router too, and it fails an app path there', () => {
    const seen: unknown[] = []
    under<AskingProps>(null, CallsLinkRouter, {
      seen,
      destinations: ['https://elsewhere.example/page', '/settings'],
    })
    expect(seen).toHaveLength(2)
    expect(seen[0]).toBeNull()
    expect(seen[1]).toBeInstanceOf(I18nError)
    expect(isNoRouterError(seen[1])).toBe(true)
  })
})
