/**
 * Core `matchRoutePattern` must agree with the native router's own matcher, so a list
 * pattern a `useListRoute` declaration uses selects the route the native router matched.
 * React's test compares it with React Router's `matchPath`; this port mounts the bond's
 * real Solid Router and reads which routes its matcher selected, for each pattern whole
 * (`end`) and as a layout (a prefix), case-insensitively and case-sensitively.
 *
 * The comparison covers the pattern forms both grammars have: static segments, `:name`,
 * `:name?` and a trailing splat. Two React forms have no Solid Router counterpart and are
 * left out: a static optional segment (`/en?/about`), and static segments holding
 * characters the router percent-encodes before matching (`/a+b/(x)/:id`).
 *
 * Two more native differences are recorded rather than compared: Solid Router has no
 * case-sensitive mode (its matcher lowercases static segments), and its matched path and
 * params keep the raw text — lowercased static segments, a splat named after its `*`, and
 * `%2F` undecoded — where core returns the input path and decodes `%2F`.
 */
import { MemoryRouter, Route, useParams } from '@solidjs/router'
import type { JSX } from 'solid-js'
import { render } from 'solid-js/web'
import { describe, expect, it } from 'vitest'

import { matchRoutePattern } from '@molecule/app-routing'

import { createSolidMemoryHistory } from '../memory-history.js'

/** The patterns both grammars have. */
const PATTERNS = [
  '/',
  '/users',
  '/users/',
  'users/:id',
  '/users/:id',
  '/users/:id/posts/:postId',
  '/:lang?/about',
  '/docs/:section?',
  '/docs/*',
  '*',
  '/*',
  '/files/:name',
  '/v1.0/:id',
  '/user-:id',
]

/** The pathnames each pattern is matched against, as React's test uses them. */
const PATHNAMES = [
  '/',
  '/users',
  '/users/',
  '/USERS/42',
  '/users/42',
  '/users/42/',
  '/users/42/posts/7',
  '/about',
  '/en/about',
  '/fr/about',
  '/docs',
  '/docs/intro',
  '/docs/a/b',
  '/files/a%2Fb',
  '/files/a%20b',
  '/v1.0/7',
  '/v1x0/7',
  '/a+b/(x)/3',
  '/user-9',
  '/usersx',
]

/** One route the native router selected: whether it matched, and its params. */
interface NativeMatch {
  matched: boolean
  params: Record<string, string>
}

/** Waits for a native navigation to commit. */
const flush = (): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, 0)
  })

/** The page the router selects when the pattern matched the current pathname. */
const Matched = (): JSX.Element => {
  const params = useParams()
  return <p data-params={JSON.stringify({ ...params })}>match</p>
}

/** The page the router selects when no route matched the current pathname. */
const Unmatched = (): JSX.Element => <p>none</p>

/**
 * Drives a real Solid Router over each pathname and reports the route it selected. With
 * `end` the pattern mounts whole (a leaf route); otherwise it mounts as a layout, whose
 * own matcher is Solid Router's prefix match. A sibling catch-all route reports the
 * pathnames it did not match.
 *
 * @param pattern - The route pattern to mount.
 * @param end - Whether the pattern must match the whole pathname.
 * @param pathnames - The pathnames to visit.
 * @returns One result per pathname, in order.
 */
async function nativeMatches(
  pattern: string,
  end: boolean,
  pathnames: string[],
): Promise<NativeMatch[]> {
  const memory = createSolidMemoryHistory([pathnames[0]])
  const container = document.createElement('div')
  document.body.appendChild(container)
  const dispose = render(
    () => (
      <MemoryRouter history={memory}>
        {end ? (
          <>
            <Route path={pattern} component={Matched} />
            <Route path="*rest" component={Unmatched} />
          </>
        ) : (
          <>
            <Route path={pattern} component={Matched}>
              <Route path="*rest" />
            </Route>
            <Route path="*rest" component={Unmatched} />
          </>
        )}
      </MemoryRouter>
    ),
    container,
  )
  const results: NativeMatch[] = []
  for (const pathname of pathnames) {
    memory.set({ value: pathname, replace: true, state: undefined })
    await flush()
    const page = container.querySelector<HTMLElement>('p')
    const params = page?.dataset.params
    results.push({
      matched: page?.textContent === 'match',
      params: params ? JSON.parse(params) : {},
    })
  }
  dispose()
  container.remove()
  return results
}

describe('matchRoutePattern follows the native router matcher', () => {
  for (const end of [true, false]) {
    for (const caseSensitive of [false, true]) {
      it(`end: ${end}, caseSensitive: ${caseSensitive}`, async () => {
        // Solid Router has no case-sensitive mode, so its matcher can only be compared on
        // pathnames whose casing would not decide the outcome.
        const pathnames = caseSensitive
          ? PATHNAMES.filter((pathname) => pathname === pathname.toLowerCase())
          : PATHNAMES
        for (const pattern of PATTERNS) {
          const native = await nativeMatches(pattern, end, pathnames)
          pathnames.forEach((pathname, index) => {
            const ours = matchRoutePattern(pattern, pathname, { end, caseSensitive })
            const label = `${pattern} against ${pathname}`
            expect(ours === null, label).toBe(!native[index].matched)
            // Params are compared on the forms both capture the same names: a splat's name
            // differs, and core decodes `%2F` while Solid Router keeps the raw segment.
            if (
              ours &&
              native[index].matched &&
              !pattern.includes('*') &&
              !pathname.includes('%2F')
            ) {
              for (const [name, value] of Object.entries(ours.params)) {
                expect(native[index].params[name], `${label} param ${name}`).toBe(value)
              }
            }
          })
        }
        // The one difference the two matchers have here: core honours `caseSensitive` and
        // Solid Router's matcher does not.
        const caseSensitiveResult = matchRoutePattern('/users', '/USERS', { end, caseSensitive })
        const caseSensitiveNative = await nativeMatches('/users', end, ['/USERS'])
        expect(caseSensitiveResult === null).toBe(caseSensitive)
        expect(caseSensitiveNative[0].matched).toBe(true)
      })
    }
  }
})
