/**
 * `matchRoutePattern` from `@molecule/app-routing` follows React Router's `matchPath`, so a
 * list pattern means the same thing under every routing bond. Each pattern and pathname
 * below is matched by both, whole and as a prefix, case-insensitively and case-sensitively.
 * The native matcher is Vue Router's own `createRouterMatcher`, and the patterns are the
 * forms both grammars parse: Vue Router's custom-regexp, `+`, `*` and splat syntax is its own.
 */
import { describe, expect, it } from 'vitest'
import { defineComponent } from 'vue'
import { createRouterMatcher } from 'vue-router'

import { matchRoutePattern } from '@molecule/app-routing'

const PATTERNS = [
  '/',
  '/users',
  '/users/',
  '/users/:id',
  '/users/:id/posts/:postId',
  '/:lang?/about',
  '/docs/:section?',
  '/files/:name',
  '/v1.0/:id',
  '/a+b/(x)/:id',
]

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
 * Vue Router's tokenizer reads a trailing slash as a distinct empty segment, while both
 * grammars treat a trailing slash as optional on the path. Drop it for the native route.
 *
 * @param pattern - A route pattern.
 * @returns The pattern Vue Router should parse.
 */
function nativePath(pattern: string): string {
  return pattern.length > 1 ? pattern.replace(/\/+$/, '') || '/' : pattern
}

/**
 * Decodes a matched parameter value. Vue Router's matcher hands back decoded values while
 * the core keeps the URL encoding, so both are decoded before they are compared.
 *
 * @param value - A matched parameter value.
 * @returns The decoded value.
 */
function decode(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch (_error) {
    // A bare `%` is not an escape sequence; the text is already what the URL means.
    return value
  }
}

describe('matchRoutePattern follows the native matcher', () => {
  for (const end of [true, false]) {
    for (const caseSensitive of [false, true]) {
      it(`end: ${end}, caseSensitive: ${caseSensitive}`, () => {
        for (const pattern of PATTERNS) {
          // Vue Router reaches React Router's `end: false` segment boundary through `strict`
          // when the match is not anchored; `strict: false` allows the trailing slash that
          // the core allows for a whole match.
          const matcher = createRouterMatcher(
            [{ path: nativePath(pattern), component: defineComponent({ render: () => null }) }],
            { end, sensitive: caseSensitive, strict: !end },
          )
          const native = matcher.getRoutes()[0]
          for (const pathname of PATHNAMES) {
            const ours = matchRoutePattern(pattern, pathname, { end, caseSensitive })
            const theirs = native.parse(pathname)
            const label = `${pattern} against ${pathname}`
            expect(ours === null, label).toBe(theirs === null)
            if (end) {
              // A whole match is the native expression's own match, so both report the
              // same matched text. A prefix match consumes its separator instead, so Vue
              // Router exposes no equivalent of the core's matched prefix. No match is null on
              // both sides (the assertion above pins that the two agree on whether it matched).
              expect(ours?.pathname ?? null, label).toBe(native.re.exec(pathname)?.[0] ?? null)
            }
            if (ours && theirs) {
              const ourParams = Object.fromEntries(
                Object.entries(ours.params)
                  .filter(([, value]) => value !== undefined)
                  .map(([name, value]) => [name, decode(value ?? '')]),
              )
              const nativeParams = Object.fromEntries(
                Object.entries(theirs)
                  .filter(([, value]) => value !== '')
                  .map(([name, value]) => [name, decode(String(value))]),
              )
              expect(ourParams, label).toEqual(nativeParams)
            }
          }
        }
      })
    }
  }
})
