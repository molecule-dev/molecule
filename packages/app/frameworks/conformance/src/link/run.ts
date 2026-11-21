/**
 * `runLinkConformance(name, mountLink)`: the cases every framework binding's
 * `Link` component passes, so an in-app link behaves the same in Vue, Solid,
 * Svelte and Angular as react-router's `<Link>` does in React.
 *
 * Each binding calls this from its own tests with a mount function that renders
 * its real `Link` inside its real molecule provider, over the memory router
 * this suite creates. Every case clicks the rendered anchor the way a person
 * would and reads where the router went, and whether the browser would still
 * have followed the anchor itself.
 *
 * @module
 */

import { afterEach, describe, expect, it } from 'vitest'

import { createMemoryRouter, type Router } from '@molecule/app-routing'

import { nextMillisecond } from '../ui/user-input-time.js'

/** The props a case renders a `Link` with, in React's spelling. */
export interface LinkMountProps {
  /** The link's destination. */
  to: string
  /** Replace the current history entry instead of pushing one. */
  replace?: boolean
  /** State stored with the new history entry. */
  state?: unknown
  /** Attributes the anchor must carry: `class`, `target`, `rel`, `data-mol-id`. */
  attrs?: Record<string, string>
  /** The caller's own click handler (React's `onClick`); it runs before the link's. */
  onClick?: (event: MouseEvent) => void
  /** The link's text. */
  text: string
  /**
   * Receives the rendered anchor, as React's `ref` does: each binding passes it through its own
   * element reference (Solid's `ref`, Svelte's `bind:ref`, a Vue template ref's `$el`, the
   * anchor an Angular `molLink` sits on).
   */
  ref?: (anchor: HTMLAnchorElement | null) => void
}

/** A rendered link. */
export interface MountedLink {
  /** Changes `to` on the SAME mounted link (no remount) and renders the change. */
  setTo(to: string): Promise<void>
  /** Removes the link and its app. */
  unmount(): Promise<void>
}

/**
 * Renders the binding's `Link` with `props` into `container`, inside the
 * binding's molecule provider carrying `router`.
 */
export type LinkMount = (
  container: HTMLElement,
  router: Router,
  props: LinkMountProps,
) => Promise<MountedLink>

/** The router a case renders its link over. */
export interface LinkRouterOptions {
  /** The path the app is served under (`createMemoryRouter`'s `basePath`). */
  basePath?: string
}

/** What a case gets: a rendered link over a router whose history is `/home` then `/start`. */
export interface RenderedLink {
  router: Router
  anchor: HTMLAnchorElement
  link: MountedLink
}

/** One `Link` case. */
export interface LinkCase {
  /** What the case checks. */
  name: string
  /**
   * Runs the case; throws on a mismatch.
   *
   * @param render - Renders a link with the given props.
   */
  run(
    render: (props: LinkMountProps, router?: LinkRouterOptions) => Promise<RenderedLink>,
  ): Promise<void>
}

/** Modifier keys and the button of a click. */
type ClickInit = Pick<MouseEventInit, 'button' | 'metaKey' | 'ctrlKey' | 'shiftKey' | 'altKey'>

/** Lets every framework's scheduled render and router listener run. */
const settle = async (): Promise<void> => {
  for (let i = 0; i < 3; i++) await new Promise((resolve) => setTimeout(resolve, 0))
}

/**
 * Clicks an anchor and reports whether its default (the browser following the
 * `href`) was prevented. A window listener reads it after every framework's own
 * handler ran, then prevents it, because jsdom cannot leave the page.
 *
 * @param anchor - The rendered link.
 * @param init - Modifier keys and button.
 * @returns Whether the click's default was prevented.
 */
const click = (anchor: HTMLAnchorElement, init: ClickInit = {}): boolean => {
  const seen: { prevented?: boolean } = {}
  const observe = (event: Event): void => {
    seen.prevented = event.defaultPrevented
    event.preventDefault()
  }
  window.addEventListener('click', observe)
  // Never in the millisecond the link rendered in: Vue would drop the click at an outer listener.
  nextMillisecond()
  try {
    anchor.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, ...init }))
  } finally {
    window.removeEventListener('click', observe)
  }
  if (seen.prevented === undefined) throw new Error('conformance: the link stopped the click')
  return seen.prevented
}

const pathOf = (router: Router): string => {
  const location = router.getLocation()
  return location.pathname + location.search + location.hash
}

/**
 * A modified or non-primary click: the browser opens a tab or window, or downloads.
 *
 * @param label - The case label.
 * @param init - The click's modifier keys and button.
 * @returns The case.
 */
const leftToBrowser = (label: string, init: ClickInit): LinkCase => ({
  name: `a ${label} click is left to the browser`,
  run: async (render) => {
    const { router, anchor } = await render({ to: '/settings', text: 'Go' })
    expect(click(anchor, init)).toBe(false)
    await settle()
    expect(pathOf(router)).toBe('/start')
  },
})

/**
 * A destination outside the app.
 *
 * @param to - The destination.
 * @returns The case.
 */
const external = (to: string): LinkCase => ({
  name: `an external destination (${to}) is left to the browser`,
  run: async (render) => {
    const { router, anchor } = await render({ to, text: 'Out' })
    expect(click(anchor)).toBe(false)
    await settle()
    expect(pathOf(router)).toBe('/start')
  },
})

/** Every `Link` case, in react-router `<Link>`'s behavior. */
export const linkCases: LinkCase[] = [
  {
    name: 'renders an anchor to the destination with its text and attributes',
    run: async (render) => {
      const { anchor } = await render({
        to: '/settings?tab=billing#plan',
        text: 'Settings',
        attrs: { class: 'nav-link', rel: 'nofollow', 'data-mol-id': 'settings-link' },
      })
      expect(anchor.getAttribute('href')).toBe('/settings?tab=billing#plan')
      expect(anchor.textContent).toBe('Settings')
      expect(anchor.getAttribute('class')).toBe('nav-link')
      expect(anchor.getAttribute('rel')).toBe('nofollow')
      expect(anchor.getAttribute('data-mol-id')).toBe('settings-link')
    },
  },
  {
    name: 'a plain click navigates in-app, pushing an entry, and prevents the page load',
    run: async (render) => {
      const { router, anchor } = await render({ to: '/settings?tab=billing#plan', text: 'Go' })
      expect(click(anchor)).toBe(true)
      await settle()
      expect(pathOf(router)).toBe('/settings?tab=billing#plan')
      router.back()
      await settle()
      expect(pathOf(router)).toBe('/start')
    },
  },
  leftToBrowser('ctrl', { ctrlKey: true }),
  leftToBrowser('meta', { metaKey: true }),
  leftToBrowser('shift', { shiftKey: true }),
  leftToBrowser('alt', { altKey: true }),
  leftToBrowser('middle-button', { button: 1 }),
  {
    name: 'an anchor with target="_blank" is left to the browser',
    run: async (render) => {
      const { router, anchor } = await render({
        to: '/report',
        text: 'Report',
        attrs: { target: '_blank' },
      })
      expect(anchor.getAttribute('target')).toBe('_blank')
      expect(click(anchor)).toBe(false)
      await settle()
      expect(pathOf(router)).toBe('/start')
    },
  },
  {
    name: 'counterexample: target="_self" still navigates in-app',
    run: async (render) => {
      const { router, anchor } = await render({
        to: '/report',
        text: 'Report',
        attrs: { target: '_self' },
      })
      expect(click(anchor)).toBe(true)
      await settle()
      expect(pathOf(router)).toBe('/report')
    },
  },
  {
    name: "runs the caller's click handler first, and leaves a click it prevented alone",
    run: async (render) => {
      const seen: string[] = []
      const { router, anchor } = await render({
        to: '/settings',
        text: 'Go',
        onClick: (event) => {
          seen.push(pathOf(router))
          event.preventDefault()
        },
      })
      expect(click(anchor)).toBe(true)
      await settle()
      expect(seen).toEqual(['/start'])
      expect(pathOf(router)).toBe('/start')
    },
  },
  {
    name: "counterexample: a caller's handler that does not prevent the click still navigates",
    run: async (render) => {
      const seen: string[] = []
      const { router, anchor } = await render({
        to: '/settings',
        text: 'Go',
        onClick: () => {
          seen.push('clicked')
        },
      })
      expect(click(anchor)).toBe(true)
      await settle()
      expect(seen).toEqual(['clicked'])
      expect(pathOf(router)).toBe('/settings')
    },
  },
  {
    name: 'a URL on the page origin navigates in-app to its path',
    run: async (render) => {
      const url = `${window.location.origin}/docs/intro?v=2#setup`
      const { router, anchor } = await render({ to: url, text: 'Docs' })
      expect(anchor.getAttribute('href')).toBe(url)
      expect(click(anchor)).toBe(true)
      await settle()
      expect(pathOf(router)).toBe('/docs/intro?v=2#setup')
    },
  },
  external('https://elsewhere.example/page'),
  external('mailto:help@example.com'),
  external('//cdn.example/file'),
  {
    name: 'replace replaces the current entry',
    run: async (render) => {
      const { router, anchor } = await render({ to: '/settings', replace: true, text: 'Go' })
      click(anchor)
      await settle()
      expect(pathOf(router)).toBe('/settings')
      router.back()
      await settle()
      expect(pathOf(router)).toBe('/home')
    },
  },
  {
    name: 'a link to the location already shown replaces it instead of pushing a duplicate',
    run: async (render) => {
      const { router, anchor } = await render({ to: '/start', text: 'Here' })
      click(anchor)
      await settle()
      expect(pathOf(router)).toBe('/start')
      router.back()
      await settle()
      expect(pathOf(router)).toBe('/home')
    },
  },
  {
    name: 'counterexample: replace={false} on the location already shown pushes',
    run: async (render) => {
      const { router, anchor } = await render({ to: '/start', replace: false, text: 'Here' })
      click(anchor)
      await settle()
      router.back()
      await settle()
      expect(pathOf(router)).toBe('/start')
    },
  },
  {
    name: 'carries state onto the new location',
    run: async (render) => {
      const { router, anchor } = await render({
        to: '/login',
        state: { from: '/projects' },
        text: 'Log in',
      })
      click(anchor)
      await settle()
      expect(router.getLocation().state).toEqual({ from: '/projects' })
    },
  },
  {
    name: 'an app path carries the href the router writes for it, base path included',
    run: async (render) => {
      const { router, anchor } = await render(
        { to: '/settings?tab=billing#plan', text: 'Settings' },
        { basePath: '/app' },
      )
      // A middle-click or a new tab opens this href, so it must be the page a click opens.
      expect(anchor.getAttribute('href')).toBe('/app/settings?tab=billing#plan')
      expect(click(anchor)).toBe(true)
      await settle()
      expect(pathOf(router)).toBe('/settings?tab=billing#plan')
    },
  },
  {
    name: 'a URL keeps the href it was written with under a base path',
    run: async (render) => {
      const external = await render(
        { to: 'https://example.com/docs', text: 'Docs' },
        { basePath: '/app' },
      )
      expect(external.anchor.getAttribute('href')).toBe('https://example.com/docs')
      const own = `${window.location.origin}/docs/intro`
      const sameOrigin = await render({ to: own, text: 'Intro' }, { basePath: '/app' })
      expect(sameOrigin.anchor.getAttribute('href')).toBe(own)
    },
  },
  {
    name: 'forwards ref to the anchor',
    run: async (render) => {
      const seen: { anchor?: HTMLAnchorElement | null } = {}
      const { anchor } = await render({
        to: '/settings',
        text: 'Settings',
        ref: (element) => {
          seen.anchor = element
        },
      })
      expect(seen.anchor).toBe(anchor)
    },
  },
  {
    name: 'follows a changed destination without a remount',
    run: async (render) => {
      const { router, anchor, link } = await render({ to: '/one', text: 'Go' })
      await link.setTo('/two')
      await settle()
      expect(document.body.querySelector('a')).toBe(anchor)
      expect(anchor.getAttribute('href')).toBe('/two')
      click(anchor)
      await settle()
      expect(pathOf(router)).toBe('/two')
    },
  },
]

/**
 * Renders links with one binding's mount function, remembering each one so a
 * case's teardown can remove it.
 *
 * @param name - The binding, for error messages.
 * @param mountLink - The binding's mount function.
 * @param mounted - Receives every mounted link.
 * @returns The render function the cases call.
 */
export const linkRenderer =
  (name: string, mountLink: LinkMount, mounted: MountedLink[]) =>
  async (props: LinkMountProps, options: LinkRouterOptions = {}): Promise<RenderedLink> => {
    const router = createMemoryRouter({
      initialEntries: ['/home', '/start'],
      ...(options.basePath === undefined ? {} : { basePath: options.basePath }),
    })
    const container = document.createElement('div')
    document.body.appendChild(container)
    const link = await mountLink(container, router, props)
    mounted.push(link)
    await settle()
    const anchor = container.querySelector('a')
    if (!anchor) throw new Error(`conformance: ${name}'s Link rendered no anchor`)
    return { router, anchor, link }
  }

/**
 * Registers the `Link` conformance cases for one framework binding.
 *
 * @param name - The binding (`@molecule/app-vue`, …).
 * @param mountLink - Renders the binding's real `Link`.
 */
export function runLinkConformance(name: string, mountLink: LinkMount): void {
  const mounted: MountedLink[] = []
  const render = linkRenderer(name, mountLink, mounted)

  describe(`${name} Link conformance`, () => {
    afterEach(async () => {
      for (const link of mounted.splice(0)) await link.unmount()
      document.body.innerHTML = ''
    })

    for (const linkCase of linkCases) it(linkCase.name, () => linkCase.run(render))
  })
}
