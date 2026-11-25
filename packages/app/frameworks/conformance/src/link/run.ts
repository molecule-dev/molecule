/**
 * `runLinkConformance(name, mountLink, noRouterErrorKey)`: the cases every
 * framework binding's `Link` component passes, so an in-app link behaves the
 * same in Vue, Solid, Svelte and Angular as react-router's `<Link>` does in
 * React.
 *
 * Each binding calls this from its own tests with a mount function that renders
 * its real `Link` inside its real molecule provider, over the memory router
 * this suite creates, or with no router mounted where a case asks for that.
 * Every case clicks the rendered anchor the way a person would and reads where
 * the router went, and whether the browser would still have followed the
 * anchor itself.
 *
 * A link to a URL outside the app needs no router: the browser, or the device's
 * URL handler, opens it. So it renders with no router mounted, while a link to
 * an app path still fails with the binding's no-router error, which catches an
 * app that forgot to mount its router.
 *
 * @module
 */

import { afterEach, describe, expect, it } from 'vitest'

import { I18nError } from '@molecule/app-i18n'
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
 * binding's molecule provider carrying `router`, or with no router mounted
 * (the provider without one, or no provider) for `null`.
 */
export type LinkMount = (
  container: HTMLElement,
  router: Router | null,
  props: LinkMountProps,
) => Promise<MountedLink>

/** The router a case renders its link over. */
export interface LinkRouterOptions {
  /** The path the app is served under (`createMemoryRouter`'s `basePath`). */
  basePath?: string
}

/**
 * What a case gets: a rendered link, and the router it navigates through when
 * one is mounted.
 *
 * @template RouterOrNull - `Router` over a router, `null` with none mounted.
 */
export interface RenderedLink<RouterOrNull extends Router | null = Router> {
  /** The router the link navigates through, or `null` with none mounted. */
  router: RouterOrNull
  /** The rendered anchor. */
  anchor: HTMLAnchorElement
  /** The mounted link, for a case that changes or removes it. */
  link: MountedLink
}

/** One `Link` case. */
export interface LinkCase {
  /** What the case checks. */
  name: string
  /**
   * Runs the case; throws on a mismatch.
   *
   * @param render - Renders a link with the given props over a router.
   * @param renderWithoutRouter - Renders a link with no router mounted; it rejects with the
   * binding's no-router error for an app path.
   * @param noRouterErrorKey - The i18n key of that error.
   */
  run(
    render: (props: LinkMountProps, router?: LinkRouterOptions) => Promise<RenderedLink>,
    renderWithoutRouter: (props: LinkMountProps) => Promise<RenderedLink<null>>,
    noRouterErrorKey: string,
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
    name: 'a link to a URL outside the app renders with no router mounted, and a plain click is left to the browser',
    run: async (_render, renderWithoutRouter) => {
      // The browser, or the device's URL handler, opens it: the link needs no router to render
      // or to follow. Each URL leaves the app a different way: another origin, a scheme, no origin.
      for (const to of [
        'https://elsewhere.example/page',
        'mailto:help@example.com',
        '//cdn.example/file',
      ]) {
        const seen: string[] = []
        const { anchor } = await renderWithoutRouter({
          to,
          text: 'Out',
          onClick: () => {
            seen.push('clicked')
          },
        })
        expect(anchor.getAttribute('href'), to).toBe(to)
        expect(anchor.textContent, to).toBe('Out')
        expect(click(anchor), to).toBe(false)
        expect(seen, to).toEqual(['clicked'])
      }
    },
  },
  {
    name: 'a link to an app path with no router mounted fails with the no-router error',
    run: async (_render, renderWithoutRouter, noRouterErrorKey) => {
      // The guard stays: an app path can neither be written as an href nor followed without a
      // router, so this is how an app that forgot to mount its router finds out.
      const thrown = await renderWithoutRouter({
        to: '/settings?tab=billing#plan',
        text: 'Go',
      }).then(
        () => undefined,
        (error: unknown) => error,
      )
      expect(thrown).toBeInstanceOf(I18nError)
      expect(thrown instanceof I18nError ? thrown.i18nKey : undefined).toBe(noRouterErrorKey)
    },
  },
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

/** The two ways a case renders links with one binding's mount function. */
export interface LinkRenders {
  /** Renders a link over a memory router whose history is `/home` then `/start`. */
  render: (props: LinkMountProps, router?: LinkRouterOptions) => Promise<RenderedLink>
  /**
   * Renders a link with no router mounted (`null` is the mount function's router). It rejects
   * with the binding's no-router error for an app path.
   */
  renderWithoutRouter: (props: LinkMountProps) => Promise<RenderedLink<null>>
}

/**
 * The render functions the cases call, over one binding's mount function and
 * remembering each mounted link so a case's teardown can remove it.
 *
 * @param name - The binding, for error messages.
 * @param mountLink - The binding's mount function.
 * @param mounted - Receives every mounted link.
 * @returns The render functions the cases call.
 */
export const linkRenderer = (
  name: string,
  mountLink: LinkMount,
  mounted: MountedLink[],
): LinkRenders => {
  const mount = async <RouterOrNull extends Router | null>(
    router: RouterOrNull,
    props: LinkMountProps,
  ): Promise<RenderedLink<RouterOrNull>> => {
    const container = document.createElement('div')
    document.body.appendChild(container)
    const link = await mountLink(container, router, props)
    mounted.push(link)
    await settle()
    const anchor = container.querySelector('a')
    if (!anchor) throw new Error(`conformance: ${name}'s Link rendered no anchor`)
    return { router, anchor, link }
  }
  return {
    render: async (props, options = {}) => {
      const router = createMemoryRouter({
        initialEntries: ['/home', '/start'],
        ...(options.basePath === undefined ? {} : { basePath: options.basePath }),
      })
      return mount(router, props)
    },
    renderWithoutRouter: (props) => mount(null, props),
  }
}

/**
 * Registers the `Link` conformance cases for one framework binding.
 *
 * @param name - The binding (`@molecule/app-vue`, …).
 * @param mountLink - Renders the binding's real `Link`, with no router mounted for a `null` router.
 * @param noRouterErrorKey - The i18n key of the binding's error when a link to an app path has no
 * router (`vue.error.useRouterOutsideProvider`).
 */
export function runLinkConformance(
  name: string,
  mountLink: LinkMount,
  noRouterErrorKey: string,
): void {
  const mounted: MountedLink[] = []
  const { render, renderWithoutRouter } = linkRenderer(name, mountLink, mounted)

  describe(`${name} Link conformance`, () => {
    afterEach(async () => {
      for (const link of mounted.splice(0)) await link.unmount()
      document.body.innerHTML = ''
    })

    for (const linkCase of linkCases) {
      it(linkCase.name, () => linkCase.run(render, renderWithoutRouter, noRouterErrorKey))
    }
  })
}
