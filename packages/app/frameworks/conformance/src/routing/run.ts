/**
 * `runRouterConformance(name, createHarness)`: the cases every `@molecule/app-routing`
 * bond passes, so routing bonds can be swapped without the app noticing.
 *
 * Each routing bond (React Router, Vue Router, Solid Router, Angular Router, SvelteKit,
 * and the browser and memory routers of `@molecule/app-routing` itself) calls this from
 * its own tests with a harness over its REAL native router. The cases drive both sides:
 * the molecule `Router` the bond builds, and the native router underneath it, the way a
 * link or the back button would.
 *
 * @module
 */

import { describe, expect, it } from 'vitest'

import type { NavigationAction, RouteLocation, Router } from '@molecule/app-routing'

/** One router under test, over a native router. */
export interface RouterHarness {
  /** The molecule router the bond built. */
  router: Router
  /** Navigates the native router itself, as one of its own links would. */
  nativePush(path: string): void | Promise<void>
  /** Moves the native router back one entry, as the browser's back button does. */
  nativeBack(): void | Promise<void>
  /** The native router's own current path: `pathname + search + hash`, within the app (no base). */
  nativePath(): string
  /**
   * The `href` the native router's own link writes for an in-app `path`: React Router's
   * `useHref`, Vue Router's `router.resolve(path).href`, Angular's
   * `Location.prepareExternalUrl`, Solid Router's `useHref`, the base SvelteKit prefixes.
   */
  nativeHref(path: string): string
  /** Waits until navigations in flight have committed (default: a few macrotasks). */
  settle?(): Promise<void>
  /** Removes the router and its native router. */
  teardown(): void | Promise<void>
}

/** What a harness builds its native router with. */
export interface RouterHarnessOptions {
  /**
   * The path the app is served under: `''` (the root) or `'/app'`. The native router is built
   * under it (React Router's `basename`, Vue Router's history base, Angular's `APP_BASE_HREF`,
   * Solid Router's `base`, SvelteKit's `paths.base`, a core router's `basePath`; a hash
   * history keeps the document at it). `nativePath` stays the path within the app.
   */
  base: '' | '/app'
  /**
   * Where the native router renders the page of its current route. It declares `/one` and
   * `/two`, whose pages are elements with the text `page one` and `page two`, and
   * `/users/:id`, whose page shows `user <id>` from the framework binding's route params hook
   * (`@molecule/app-react`'s `useParams`, or Vue's, Svelte's, Solid's, Angular's), with no
   * route definitions registered by the app. Beside the page, mounted the whole time, an
   * element with a `data-location` attribute shows the pathname the binding's location hook
   * reads. A harness with no framework binding renders both from the router's `subscribe`.
   */
  container: HTMLElement
}

/**
 * Builds a fresh harness whose native router starts at `initialPath` and declares the
 * routes `/users/:id`, `/one` and `/two` (with any other path also routable).
 */
export type RouterHarnessFactory = (
  initialPath: string,
  options: RouterHarnessOptions,
) => RouterHarness | Promise<RouterHarness>

const pathOf = (location: Pick<RouteLocation, 'pathname' | 'search' | 'hash'>): string =>
  location.pathname + location.search + location.hash

/**
 * A URL as its parts, with the query as decoded entries in order: `?q=x+y` and
 * `?q=x%20y` hold the same value, and native routers differ in which they write
 * (Angular Router serializes a space as `%20`, URLSearchParams as `+`).
 *
 * @param path - `pathname + search + hash`.
 * @returns The pathname, the query entries and the hash.
 */
const urlParts = (path: string): { pathname: string; query: [string, string][]; hash: string } => {
  const url = new URL(path, 'http://conformance.invalid')
  return { pathname: url.pathname, query: [...url.searchParams], hash: url.hash }
}

/** The frame callbacks of `requestAnimationFrame`, as the global functions take them. */
type FrameCallback = (time: number) => void

/**
 * Samples the screen at every task boundary while `action` runs and the router settles, as
 * if the browser painted at each one. A browser paints only between tasks, so what holds
 * between a task and its microtasks never reaches the screen; and its rendering step runs
 * the callbacks requested with `requestAnimationFrame` before it paints, so each sample
 * first runs those (Angular renders in one, raced with a timer). While it samples, frame
 * callbacks are queued here instead of on the environment's own frame clock.
 *
 * @param action - What moves the router.
 * @param settle - Waits until the navigation has committed.
 * @param sample - Records what is wrong on screen at one boundary.
 */
const sampleEveryPaint = async (
  action: () => unknown,
  settle: () => Promise<void>,
  sample: () => void,
): Promise<void> => {
  const frames = globalThis as {
    requestAnimationFrame?: (callback: FrameCallback) => number
    cancelAnimationFrame?: (handle: number) => void
  }
  const { requestAnimationFrame, cancelAnimationFrame } = frames
  let pending = new Map<number, FrameCallback>()
  let nextHandle = 1
  frames.requestAnimationFrame = (callback) => {
    const handle = nextHandle++
    pending.set(handle, callback)
    return handle
  }
  frames.cancelAnimationFrame = (handle) => {
    pending.delete(handle)
  }
  // The rendering step: the callbacks requested before it run, then the paint. One a
  // callback requests runs in the next frame, as in a browser.
  const paint = (): void => {
    const due = pending
    pending = new Map()
    const now = performance.now()
    for (const callback of due.values()) callback(now)
    sample()
  }
  let sampling = true
  const loop = (): void => {
    paint()
    if (sampling) setTimeout(loop, 0)
  }
  try {
    const done = action()
    setTimeout(loop, 0)
    await done
    await settle()
    sampling = false
    paint()
  } finally {
    sampling = false
    frames.requestAnimationFrame = requestAnimationFrame
    frames.cancelAnimationFrame = cancelAnimationFrame
    // What was requested and never painted gets its frame on the environment's clock.
    for (const callback of pending.values()) requestAnimationFrame?.(callback)
  }
}

const macrotasks = async (count: number): Promise<void> => {
  for (let i = 0; i < count; i++) await new Promise((resolve) => setTimeout(resolve, 0))
}

/** Options for {@link runRouterConformance}. */
export interface RouterConformanceOptions {
  /**
   * The base paths to run the cases under; both (`''` and `'/app'`) by default. Only a
   * native router whose base is fixed when the app is built passes one, and runs the other
   * in a second test project built with that base (SvelteKit's `paths.base`).
   */
  bases?: readonly ('' | '/app')[]
}

/**
 * Registers the router conformance cases for one routing bond, twice: with the app at the
 * root, and served under the base path `/app`.
 *
 * @param name - The bond (`vue-router`, `solid-router`, …).
 * @param createHarness - Builds a harness over the bond's real native router.
 * @param options - The base paths, when the native router's base is fixed at build time.
 */
export function runRouterConformance(
  name: string,
  createHarness: RouterHarnessFactory,
  options: RouterConformanceOptions = {},
): void {
  for (const base of options.bases ?? (['', '/app'] as const)) runCases(name, base, createHarness)
}

/**
 * The cases, for one base path.
 *
 * @param name - The bond.
 * @param base - The base path the native router is built under.
 * @param createHarness - Builds a harness over the bond's real native router.
 */
function runCases(name: string, base: '' | '/app', createHarness: RouterHarnessFactory): void {
  /**
   * Runs one case against a fresh harness, recording what subscribers hear.
   *
   * @param initialPath - Where the native router starts.
   * @param body - The case.
   * @returns The test function.
   */
  const withHarness =
    (
      initialPath: string,
      body: (context: {
        router: Router
        harness: RouterHarness
        settle: () => Promise<void>
        heard: () => [string, NavigationAction][]
        listen: () => () => void
        container: HTMLElement
      }) => Promise<void>,
    ) =>
    async (): Promise<void> => {
      const container = document.createElement('div')
      document.body.appendChild(container)
      const harness = await createHarness(initialPath, { base, container })
      const settle = async (): Promise<void> => {
        await macrotasks(3)
        await harness.settle?.()
        await macrotasks(3)
      }
      const calls: [string, NavigationAction][] = []
      const listen = (): (() => void) =>
        harness.router.subscribe((location, action) => {
          expect(pathOf(location), 'the location a subscriber hears is the current one').toBe(
            pathOf(harness.router.getLocation()),
          )
          calls.push([pathOf(location), action])
        })
      try {
        await settle()
        await body({
          router: harness.router,
          harness,
          settle,
          heard: () => [...calls],
          listen,
          container,
        })
      } finally {
        await harness.teardown()
        container.remove()
      }
    }

  describe(`${name} router conformance${base ? ` under the base path ${base}` : ''}`, () => {
    it(
      "createHref is the href the native router's own link carries",
      withHarness('/start', async ({ router, harness }) => {
        for (const path of ['/', '/users/5', '/users/a%20b', '/orders?page=2&q=a%20b#top'])
          expect(router.createHref(path), path).toBe(harness.nativeHref(path))
        if (base)
          expect(
            harness.nativeHref('/users/5'),
            `the native router is built under ${base}, so its links carry more than the path`,
          ).not.toBe('/users/5')
      }),
    )

    it(
      'a navigation never shows the previous page under the new URL',
      withHarness('/one', async ({ router, harness, settle, container }) => {
        const text = (): string => (container.textContent ?? '').replace(/\s+/g, ' ').trim()
        expect(text(), 'the harness renders the page of /one').toContain('page one')
        // Samples the URL and the page at every task boundary after the action until settled:
        // what holds between a task and its microtasks (a history that moves before the
        // router's own flush) never reaches the screen, and a sample there would fail a router
        // no user can catch out.
        const moves = async (from: string, to: string, action: () => unknown): Promise<void> => {
          const seen: string[] = []
          await sampleEveryPaint(action, settle, () => {
            const at = urlParts(harness.nativePath()).pathname
            if (at === `/${to}` && text().includes(`page ${from}`)) seen.push(`${at}: "${text()}"`)
          })
          expect(seen, `the URL named /${to} while page ${from} was on screen`).toEqual([])
          expect(text()).toContain(`page ${to}`)
          expect(text()).not.toContain(`page ${from}`)
        }
        await moves('one', 'two', () => router.navigate('/two'))
        await moves('two', 'one', () => harness.nativeBack())
        await moves('one', 'two', () => harness.nativePush('/two'))
      }),
    )

    it(
      'a component kept mounted beside the page shows the location of the page on screen',
      withHarness('/one', async ({ router, harness, settle, container }) => {
        const reader = (): string | undefined =>
          container.querySelector('[data-location]')?.textContent?.trim()
        const page = (): string | undefined => {
          const text = container.textContent ?? ''
          if (text.includes('page one')) return '/one'
          if (text.includes('page two')) return '/two'
          return undefined
        }
        expect(reader(), 'the harness renders the location reader').toBe('/one')
        const moves = async (to: string, action: () => unknown): Promise<void> => {
          const seen: string[] = []
          await sampleEveryPaint(action, settle, () => {
            const shown = page()
            if (shown !== undefined && reader() !== shown)
              seen.push(`page ${shown}, location ${reader()}`)
          })
          expect(
            seen,
            `a paint showed a location other than its page's on the way to ${to}`,
          ).toEqual([])
          expect(reader()).toBe(to)
        }
        await moves('/two', () => router.navigate('/two'))
        await moves('/one', () => harness.nativeBack())
        await moves('/two', () => harness.nativePush('/two'))
      }),
    )

    it(
      'the matched page reads its route params through the binding with no route definitions',
      withHarness('/users/42', async ({ router, harness, settle, container }) => {
        const user = (): string | undefined => /user (\S*)/.exec(container.textContent ?? '')?.[1]
        expect(user(), "the page of /users/:id shows the binding's params").toBe('42')
        const moves = async (to: string, action: () => unknown): Promise<void> => {
          const seen: string[] = []
          await sampleEveryPaint(action, settle, () => {
            const at = urlParts(harness.nativePath()).pathname
            const shown = user()
            if (at.startsWith('/users/') && shown !== undefined && `/users/${shown}` !== at)
              seen.push(`${at}: user ${shown}`)
          })
          expect(
            seen,
            `a paint paired the URL with another user's params on the way to ${to}`,
          ).toEqual([])
          expect(user()).toBe(to)
        }
        await moves('7', () => router.navigate('/users/7'))
        await moves('42', () => harness.nativeBack())
        await moves('8', () => harness.nativePush('/users/8'))
      }),
    )

    it(
      'reads the location the native router is at',
      withHarness('/start?tab=a&tag=x&tag=y#top', async ({ router }) => {
        expect(router.getLocation()).toMatchObject({
          pathname: '/start',
          search: '?tab=a&tag=x&tag=y',
          hash: '#top',
        })
        expect(router.getQuery()).toEqual({ tab: 'a', tag: ['x', 'y'] })
        expect(router.getQueryParam('tab')).toBe('a')
        expect(router.getQueryParam('tag')).toBe('x')
        expect(router.getQueryParam('missing')).toBeUndefined()
        expect(router.getHash()).toBe('#top')
      }),
    )

    it(
      'navigate moves the native router and tells each subscriber once',
      withHarness('/start', async ({ router, harness, settle, heard, listen }) => {
        listen()
        router.navigate('/next?x=1#h')
        await settle()
        expect(harness.nativePath()).toBe('/next?x=1#h')
        expect(pathOf(router.getLocation())).toBe('/next?x=1#h')
        expect(heard()).toEqual([['/next?x=1#h', 'push']])
      }),
    )

    it(
      'navigate with replace replaces the current entry',
      withHarness('/start', async ({ router, harness, settle, heard, listen }) => {
        router.navigate('/a')
        await settle()
        listen()
        router.navigate('/b', { replace: true })
        await settle()
        expect(heard()).toEqual([['/b', 'replace']])
        await harness.nativeBack()
        await settle()
        expect(harness.nativePath()).toBe('/start')
      }),
    )

    it(
      'a navigation the native router makes reaches subscribers',
      withHarness('/start', async ({ router, harness, settle, heard, listen }) => {
        listen()
        await harness.nativePush('/elsewhere?from=link')
        await settle()
        expect(pathOf(router.getLocation())).toBe('/elsewhere?from=link')
        expect(heard()).toEqual([['/elsewhere?from=link', 'push']])
      }),
    )

    it(
      'the native back button reaches subscribers as a pop',
      withHarness('/start', async ({ router, harness, settle, heard, listen }) => {
        router.navigate('/a')
        await settle()
        listen()
        await harness.nativeBack()
        await settle()
        expect(pathOf(router.getLocation())).toBe('/start')
        expect(heard()).toEqual([['/start', 'pop']])
      }),
    )

    it(
      'back, forward and go move through the history as pops',
      withHarness('/start', async ({ router, harness, settle, heard, listen }) => {
        router.navigate('/a')
        await settle()
        router.navigate('/b')
        await settle()
        listen()
        router.back()
        await settle()
        expect(harness.nativePath()).toBe('/a')
        router.forward()
        await settle()
        expect(harness.nativePath()).toBe('/b')
        router.go(-2)
        await settle()
        expect(harness.nativePath()).toBe('/start')
        expect(heard()).toEqual([
          ['/a', 'pop'],
          ['/b', 'pop'],
          ['/start', 'pop'],
        ])
      }),
    )

    it(
      'an unsubscribed listener hears nothing more',
      withHarness('/start', async ({ router, harness, settle, heard, listen }) => {
        const stop = listen()
        router.navigate('/a')
        await settle()
        stop()
        router.navigate('/b')
        await settle()
        await harness.nativePush('/c')
        await settle()
        expect(heard()).toEqual([['/a', 'push']])
        expect(harness.nativePath()).toBe('/c')
      }),
    )

    it(
      'state travels with a navigation',
      withHarness('/start', async ({ router, settle }) => {
        router.navigate('/a', { state: { from: 'list' } })
        await settle()
        expect(router.getLocation().state).toEqual({ from: 'list' })
      }),
    )

    it(
      'state of any kind stays with its history entry',
      withHarness('/start', async ({ router, harness, settle }) => {
        router.navigate('/a', { state: 'note' })
        await settle()
        expect(router.getLocation().state).toBe('note')
        router.navigate('/b', { state: ['x', 1] })
        await settle()
        expect(router.getLocation().state).toEqual(['x', 1])
        router.navigate('/b', { state: { __moleculeState: 'mine', n: 2 }, replace: true })
        await settle()
        expect(router.getLocation().state).toEqual({ __moleculeState: 'mine', n: 2 })
        router.navigate('/c')
        await settle()
        expect(router.getLocation().state).toBeUndefined()
        await harness.nativeBack()
        await settle()
        expect(router.getLocation().pathname).toBe('/b')
        expect(router.getLocation().state).toEqual({ __moleculeState: 'mine', n: 2 })
        await harness.nativeBack()
        await settle()
        expect(router.getLocation().pathname).toBe('/a')
        expect(router.getLocation().state).toBe('note')
      }),
    )

    it(
      'the location key names the history entry: Back returns the key it had',
      withHarness('/start', async ({ router, harness, settle }) => {
        router.navigate('/a')
        await settle()
        const first = router.getLocation().key
        expect(router.getLocation().key, 'stable between reads').toBe(first)
        router.navigate('/a?page=2')
        await settle()
        const second = router.getLocation().key
        expect(second).not.toBe(first)
        await harness.nativeBack()
        await settle()
        expect(router.getLocation().pathname + router.getLocation().search).toBe('/a')
        expect(router.getLocation().key).toBe(first)
        router.navigate('/a?page=3')
        await settle()
        expect(router.getLocation().key).not.toBe(first)
        expect(router.getLocation().key).not.toBe(second)
      }),
    )

    it(
      'preserveQuery and preserveHash keep the current query and hash',
      withHarness('/start?keep=1#here', async ({ router, harness, settle }) => {
        router.navigate('/next', { preserveQuery: true, preserveHash: true })
        await settle()
        expect(harness.nativePath()).toBe('/next?keep=1#here')
        router.navigate('/plain')
        await settle()
        expect(harness.nativePath()).toBe('/plain')
      }),
    )

    it(
      'setQuery, setQueryParam and setHash rewrite the current URL',
      withHarness('/list?a=1', async ({ router, harness, settle }) => {
        router.setQueryParam('b', '2')
        await settle()
        expect(harness.nativePath()).toBe('/list?a=1&b=2')
        router.setQueryParam('a', undefined)
        await settle()
        expect(harness.nativePath()).toBe('/list?b=2')
        router.setQuery({ q: 'x y', tag: ['1', '2'] })
        await settle()
        expect(urlParts(harness.nativePath())).toEqual(urlParts('/list?q=x+y&tag=1&tag=2'))
        expect(router.getQuery()).toEqual({ q: 'x y', tag: ['1', '2'] })
        router.setHash('section')
        await settle()
        expect(urlParts(harness.nativePath())).toEqual(urlParts('/list?q=x+y&tag=1&tag=2#section'))
      }),
    )

    it(
      'isActive matches the current path exactly or by prefix',
      withHarness('/users/42', async ({ router }) => {
        expect(router.isActive('/users')).toBe(true)
        expect(router.isActive('/users', true)).toBe(false)
        expect(router.isActive('/users/42', true)).toBe(true)
        expect(router.isActive('/use')).toBe(false)
        expect(router.isActive('/posts')).toBe(false)
      }),
    )

    it(
      "getParams reads the matched route's params",
      withHarness('/users/42', async ({ router, settle }) => {
        router.registerRoutes([{ path: '/users/:id', name: 'user' }])
        expect(router.getParams()).toEqual({ id: '42' })
        router.navigate('/users/7')
        await settle()
        expect(router.getParams()).toEqual({ id: '7' })
        // Decoded once, as React Router's `useParams` hands them out: an escaped space, and
        // an escaped percent sign that stays a literal `%`.
        router.navigate('/users/Ada%20Lovelace')
        await settle()
        expect(router.getParams()).toEqual({ id: 'Ada Lovelace' })
        router.navigate('/users/50%25%20off')
        await settle()
        expect(router.getParams()).toEqual({ id: '50% off' })
      }),
    )

    it(
      'named routes generate paths and navigate',
      withHarness('/start', async ({ router, harness, settle }) => {
        router.registerRoutes([
          { path: '/users/:id', name: 'user' },
          {
            path: '/settings',
            name: 'settings',
            children: [{ path: '/profile', name: 'profile' }],
          },
        ])
        expect(router.generatePath('user', { id: '5' }, { tab: 'a' })).toBe('/users/5?tab=a')
        expect(router.generatePath('profile')).toBe('/settings/profile')
        expect(router.getRoutes().map((route) => route.name)).toEqual(['user', 'settings'])
        router.navigateTo('user', { id: 'a b' })
        await settle()
        expect(harness.nativePath()).toBe('/users/a%20b')
        expect(() => router.generatePath('missing')).toThrow('Route "missing" not found')
        expect(() => router.navigateTo('missing')).toThrow('Route "missing" not found')
      }),
    )

    it(
      'matchPath extracts params from a pattern',
      withHarness('/start', async ({ router }) => {
        expect(router.matchPath('/users/:id', '/users/9')).toEqual({
          path: '/users/:id',
          pathname: '/users/9',
          params: { id: '9' },
          isExact: true,
        })
        expect(router.matchPath('/users/:id', '/posts/1')).toBeNull()
      }),
    )

    it(
      'a guard can cancel or redirect a navigation, and be removed',
      withHarness('/start', async ({ router, harness, settle, heard, listen }) => {
        const seen: [string, string | null][] = []
        const remove = router.addGuard((to, from) => {
          seen.push([to.pathname, from ? from.pathname : null])
          if (to.pathname === '/blocked') return false
          if (to.pathname === '/old') return '/new'
          return undefined
        })
        const removeAsync = router.addGuard(async (to) => to.pathname !== '/later')
        listen()
        router.navigate('/blocked')
        await settle()
        expect(harness.nativePath()).toBe('/start')
        router.navigate('/later')
        await settle()
        expect(harness.nativePath()).toBe('/start')
        router.navigate('/old')
        await settle()
        expect(harness.nativePath()).toBe('/new')
        // A redirect takes the place of the navigation it stopped: still a push.
        expect(heard()).toEqual([['/new', 'push']])
        await harness.nativeBack()
        await settle()
        expect(harness.nativePath()).toBe('/start')
        expect(seen).toEqual([
          ['/blocked', '/start'],
          ['/later', '/start'],
          ['/old', '/start'],
          ['/new', '/start'],
        ])
        remove()
        removeAsync()
        router.navigate('/blocked')
        await settle()
        expect(harness.nativePath()).toBe('/blocked')
      }),
    )

    it(
      'destroy stops every notification',
      withHarness('/start', async ({ router, harness, settle, heard, listen }) => {
        listen()
        router.destroy()
        await harness.nativePush('/after')
        await settle()
        expect(heard()).toEqual([])
      }),
    )
  })
}
