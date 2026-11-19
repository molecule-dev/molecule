// @vitest-environment jsdom
/**
 * `matchRoutePattern` from `@molecule/app-routing` follows React Router's `matchPath`, so a
 * list pattern means the same thing under every routing bond. This port compares it with the
 * Angular Router's own matcher (`defaultUrlMatcher`, the matcher `Router` uses for every
 * route) on the pattern forms both routers have: `:name` segments, a static segment, and the
 * whole-vs-prefix match that Angular spells `pathMatch: 'full' | 'prefix'`.
 *
 * Angular's grammar has no optional parameters, no splat, no regex segments, and no trailing
 * slash on a pattern, so the React probe list's patterns that use those are left out. Angular
 * matches case-sensitively; its `caseSensitive: false` row runs the native matcher on the
 * lowercased pattern and pathname, the same forms core's case-insensitive mode matches.
 *
 * @module
 */

import '@angular/compiler'
import { defaultUrlMatcher, type Route, UrlSegment, UrlSegmentGroup } from '@angular/router'
import { describe, expect, it } from 'vitest'

import { matchRoutePattern } from '@molecule/app-routing'

/** The pattern forms both routers have. */
const PATTERNS = [
  '/users',
  'users/:id',
  '/users/:id',
  '/users/:id/posts/:postId',
  '/files/:name',
  '/v1.0/:id',
]

/** The pathnames the React probe uses; the native matcher runs on each. */
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

/**
 * Angular's route path for a value: its route table takes no leading slash.
 *
 * @param path - A pattern, slash-prefixed or not.
 * @returns The path Angular's route table takes.
 */
const routePath = (path: string): string => path.replace(/^\/+/, '')

/**
 * The URL segments Angular's parser would hand its matcher.
 *
 * @param pathname - The pathname to split and decode.
 * @returns Segment objects for the pathname's non-empty parts.
 */
const segmentsOf = (pathname: string): UrlSegment[] =>
  pathname
    .split('/')
    .filter((part) => part !== '')
    .map((part) => new UrlSegment(decodeURIComponent(part), {}))

/**
 * The pathname a set of URL segments spells, as the matcher consumed them.
 *
 * @param segments - The consumed segments.
 * @returns The pathname, decoded and without a trailing slash.
 */
const consumedPathname = (segments: UrlSegment[]): string =>
  `/${segments.map((segment) => segment.path).join('/')}`

/**
 * The pathname core matched, decoded and without a trailing slash.
 *
 * @param pathname - The pathname `matchRoutePattern` reported.
 * @returns The normalized pathname.
 */
const normalizedPathname = (pathname: string): string =>
  `/${pathname
    .split('/')
    .filter((part) => part !== '')
    .map((part) => decodeURIComponent(part))
    .join('/')}`

describe('matchRoutePattern follows the Angular Router matcher', () => {
  for (const end of [true, false]) {
    for (const caseSensitive of [false, true]) {
      it(`end: ${end}, caseSensitive: ${caseSensitive}`, () => {
        for (const pattern of PATTERNS) {
          for (const pathname of PATHNAMES) {
            const comparePattern = caseSensitive ? pattern : pattern.toLowerCase()
            const comparePathname = caseSensitive ? pathname : pathname.toLowerCase()
            const ours = matchRoutePattern(comparePattern, comparePathname, { end, caseSensitive })
            const group = new UrlSegmentGroup(segmentsOf(comparePathname), {})
            const route: Route = {
              path: routePath(comparePattern),
              pathMatch: end ? 'full' : 'prefix',
            }
            const theirs = defaultUrlMatcher(group.segments, group, route)
            const label = `${pattern} against ${pathname}`
            expect(ours === null, label).toBe(theirs === null)
            if (ours && theirs) {
              // Angular decodes URL segments; core leaves them encoded for the caller.
              const decoded = Object.fromEntries(
                Object.entries(ours.params).map(([name, value]) => [
                  name,
                  value === undefined ? undefined : decodeURIComponent(value),
                ]),
              )
              const nativeParams = Object.fromEntries(
                Object.entries(theirs.posParams ?? {}).map(([name, segment]) => [
                  name,
                  segment.path,
                ]),
              )
              expect(decoded, label).toEqual(nativeParams)
              expect(normalizedPathname(ours.pathname), label).toBe(
                consumedPathname(theirs.consumed),
              )
            }
          }
        }
      })
    }
  }
})
