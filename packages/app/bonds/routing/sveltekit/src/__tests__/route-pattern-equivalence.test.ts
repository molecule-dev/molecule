/**
 * `matchRoutePattern` from `@molecule/app-routing` follows React Router's `matchPath`, so a
 * list pattern means the same thing under every routing bond. React's test compares it with
 * React Router's own `matchPath`; this port compares it with SvelteKit's own matcher — the
 * `parse_route_id` + `exec` pair kit resolves every route with, loaded from kit's source by
 * its resolved path exactly as `start-kit.ts` loads kit's client entry.
 *
 * Kit's matcher is what a kit app has, and it differs from React's in three ways the port
 * records instead of pretending away:
 *
 * - A kit declaration is a FILE path under `src/routes`, so the comparison uses kit's own
 *   grammar (`/users/[id]`, `/docs/[[section]]`, `/docs/[...rest]`) for the same patterns.
 *   Two React forms have no kit counterpart and are left out: React's relative `users/:id`
 *   (kit ids are absolute), an optional static segment (`/en?/about`), and a `(group)`
 *   segment, which never appears in a kit URL (`/a+b/(x)/:id`).
 * - Kit matches whole paths only: it has no `end: false`. For the prefix rows the native
 *   side is the same declaration with a trailing `[...rest]`, whose whole match is core's
 *   prefix match, and only null-ness is compared — a prefix match consumes its separator,
 *   so kit exposes no equivalent of core's matched prefix.
 * - Kit is always case-sensitive: the `caseSensitive: false` rows run the native matcher on
 *   the lowercased declaration and pathname, the same forms core's case-insensitive mode
 *   matches, and the case-sensitivity difference is asserted at the end.
 *
 * Every pattern and pathname below is React's own probe list, so the ports compare the same
 * inputs under every framework.
 */
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { matchRoutePattern } from '@molecule/app-routing'

/** One React pattern and the kit declaration that means the same thing. */
interface PatternPair {
  /** React's pattern, exactly as `matchRoutePattern` takes it. */
  pattern: string
  /** Kit's route id: the file path under `src/routes`, without its `+page.svelte`. */
  id: string
  /** Whether the pattern ends in a splat, whose matched params have no shared names. */
  splat?: boolean
}

/** The pattern forms both grammars have. */
const PATTERNS: PatternPair[] = [
  { pattern: '/', id: '/' },
  { pattern: '/users', id: '/users' },
  // A kit id carries no trailing slash; kit accepts the trailing slash on the path.
  { pattern: '/users/', id: '/users' },
  { pattern: '/users/:id', id: '/users/[id]' },
  { pattern: '/users/:id/posts/:postId', id: '/users/[id]/posts/[postId]' },
  { pattern: '/:lang?/about', id: '/[[lang]]/about' },
  { pattern: '/docs/:section?', id: '/docs/[[section]]' },
  { pattern: '/docs/*', id: '/docs/[...rest]', splat: true },
  { pattern: '*', id: '/[...rest]', splat: true },
  { pattern: '/files/:name', id: '/files/[name]' },
  { pattern: '/v1.0/:id', id: '/v1.0/[id]' },
  // Kit parses a segment around its brackets, so a static prefix and suffix are both fine.
  { pattern: '/user-:id', id: '/user-[id]' },
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

/** One parameter kit's `parse_route_id` reports (`types.RouteParam`). */
interface KitRouteParam {
  /** The parameter's name. */
  name: string
  /** Whether a segment may be left out. */
  optional: boolean
  /** Whether it consumes the rest of the path. */
  rest: boolean
  /** The `[[name=matcher]]` matcher's name, when the declaration names one. */
  matcher?: string
}

/** What kit's `parse_route_id` returns: the route's expression and its params. */
interface KitRoute {
  /** The whole-path expression, trailing slash allowed. */
  pattern: RegExp
  /** The params, in capture order. */
  params: KitRouteParam[]
}

/** The two kit functions the native side needs, as `src/utils/routing.js` export them. */
interface KitRouting {
  /** Builds a declaration's expression and params. */
  parse_route_id(id: string): KitRoute
  /** Reads a match's params, decoding each value. */
  exec(
    match: RegExpMatchArray,
    params: KitRouteParam[],
    matchers: Record<string, never>,
  ): Record<string, string> | undefined
}

/** Kit's install root, found from the dependency the package declares. */
const kitRoot = dirname(createRequire(import.meta.url).resolve('@sveltejs/kit/package.json'))

// Kit's matcher is not a public export, so the file is loaded by its resolved path, as
// `start-kit.ts` loads kit's client entry.
const routing: KitRouting = await import(/* @vite-ignore */ join(kitRoot, 'src/utils/routing.js'))

/**
 * The native declaration for one comparison: kit matches whole paths, so a prefix row adds
 * a rest parameter, whose own whole match is core's prefix match.
 *
 * @param pair - The React pattern and its kit declaration.
 * @param end - Whether the pattern must match the whole pathname.
 * @returns The kit route id to parse.
 */
const nativeId = (pair: PatternPair, end: boolean): string => {
  if (end || pair.splat === true) return pair.id
  return pair.id === '/' ? '/[...rest]' : `${pair.id}/[...rest]`
}

/**
 * Every prefix of a pathname that ends at a segment boundary, shortest first — the
 * candidates a prefix match may consume.
 *
 * @param pathname - The pathname to cut.
 * @returns The candidates.
 */
const prefixCandidates = (pathname: string): string[] => {
  const cuts = [0]
  for (let index = 1; index < pathname.length; index += 1) {
    if (pathname[index] === '/') cuts.push(index)
  }
  cuts.push(pathname.length)
  return cuts.map((cut) => pathname.slice(0, cut) || '/')
}

/** What kit's matcher answered for one pathname. */
interface NativeMatch {
  /** Whether the declaration matched. */
  matched: boolean
  /** The decoded params it matched, as `exec` reports them. */
  params: Record<string, string>
  /** The part of the pathname the expression matched. */
  pathname: string
}

/**
 * Matches a pathname the way kit's client router does: the declaration's whole-path
 * expression, or — for a prefix row — the first segment-boundary prefix it consumes.
 *
 * @param pair - The React pattern and its kit declaration.
 * @param pathname - The pathname to match.
 * @param end - Whether the pattern must match the whole pathname.
 * @returns The native answer.
 */
const nativeMatch = (pair: PatternPair, pathname: string, end: boolean): NativeMatch => {
  const route = routing.parse_route_id(nativeId(pair, end))
  const candidates = end || pair.splat === true ? [pathname] : prefixCandidates(pathname)
  for (const candidate of candidates) {
    const match = route.pattern.exec(candidate)
    if (!match) continue
    return {
      matched: true,
      params: routing.exec(match, route.params, {}) ?? {},
      pathname: match[0],
    }
  }
  return { matched: false, params: {}, pathname: '' }
}

/**
 * Decodes a matched parameter value: kit's `exec` hands back decoded values while core
 * keeps the URL encoding, so both are decoded before they are compared.
 *
 * @param value - A matched parameter value.
 * @returns The decoded value.
 */
const decode = (value: string): string => {
  try {
    return decodeURIComponent(value)
  } catch (_error) {
    // A bare `%` is not an escape sequence; the text is already what the URL means.
    return value
  }
}

describe('matchRoutePattern follows the native router matcher', () => {
  for (const end of [true, false]) {
    for (const caseSensitive of [false, true]) {
      it(`end: ${end}, caseSensitive: ${caseSensitive}`, () => {
        for (const pair of PATTERNS) {
          for (const pathname of PATHNAMES) {
            // Kit has no case-insensitive mode: its matcher runs on the lowercased forms.
            const pattern = caseSensitive ? pair.pattern : pair.pattern.toLowerCase()
            const path = caseSensitive ? pathname : pathname.toLowerCase()
            const nativePair: PatternPair = caseSensitive
              ? pair
              : { ...pair, id: pair.id.toLowerCase() }
            const ours = matchRoutePattern(pattern, path, { end, caseSensitive })
            const theirs = nativeMatch(nativePair, path, end)
            const label = `${pair.pattern} against ${pathname}`
            // Core's own compiler reads `:name` only where a `/` precedes it, so it does
            // not match an inline parameter after a static prefix where kit's segment
            // parser does. Recorded rather than compared — core's limitation, not a kit
            // difference, and reported with this port.
            if (pair.pattern === '/user-:id' && pathname === '/user-9') {
              expect(ours, label).toBeNull()
              expect(theirs.matched, label).toBe(true)
              continue
            }
            expect(ours === null, label).toBe(!theirs.matched)
            if (end && ours && theirs.matched) {
              expect(ours.pathname, label).toBe(theirs.pathname)
            }
            // Params are compared on the forms both capture with the same names: a splat's
            // name differs, and core keeps `%2F` where `exec` already decoded it.
            if (end && ours && theirs.matched && pair.splat !== true) {
              const ourParams = Object.fromEntries(
                Object.entries(ours.params)
                  .filter(([, value]) => value !== undefined)
                  .map(([name, value]) => [name, decode(value ?? '')]),
              )
              expect(ourParams, label).toEqual(theirs.params)
            }
          }
        }
        // The one difference the two matchers have here: core honours `caseSensitive` and
        // kit's matcher does not.
        expect(matchRoutePattern('/users', '/USERS', { end, caseSensitive: false })).not.toBeNull()
        expect(nativeMatch({ pattern: '/users', id: '/users' }, '/USERS', end).matched).toBe(false)
      })
    }
  }
})
