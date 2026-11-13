/**
 * `matchRoutePattern` from `@molecule/app-routing` follows React Router's `matchPath`, so a
 * list pattern means the same thing under every routing bond. Each pattern and pathname
 * below is matched by both, whole and as a prefix, case-insensitively and case-sensitively.
 */
import { matchPath } from 'react-router'
import { describe, expect, it } from 'vitest'

import { matchRoutePattern } from '@molecule/app-routing'

const PATTERNS = [
  '/',
  '/users',
  '/users/',
  'users/:id',
  '/users/:id',
  '/users/:id/posts/:postId',
  '/:lang?/about',
  '/docs/:section?',
  '/en?/about',
  '/docs/*',
  '*',
  '/*',
  '/files/:name',
  '/v1.0/:id',
  '/a+b/(x)/:id',
  '/user-:id',
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

describe('matchRoutePattern follows React Router matchPath', () => {
  for (const end of [true, false]) {
    for (const caseSensitive of [false, true]) {
      it(`end: ${end}, caseSensitive: ${caseSensitive}`, () => {
        for (const pattern of PATTERNS) {
          for (const pathname of PATHNAMES) {
            const ours = matchRoutePattern(pattern, pathname, { end, caseSensitive })
            const theirs = matchPath({ path: pattern, end, caseSensitive }, pathname)
            const label = `${pattern} against ${pathname}`
            expect(ours === null, label).toBe(theirs === null)
            if (ours && theirs) {
              expect(ours.params, label).toEqual({ ...theirs.params })
              expect(ours.pathname, label).toBe(theirs.pathname)
            }
          }
        }
      })
    }
  }
})
