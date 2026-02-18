/**
 * Next.js middleware helpers for routing.
 *
 * @module
 */

import type { MiddlewareGuardRule } from './types.js'

/**
 * Next.js middleware helper for route guards.
 *
 * @example
 * ```typescript
 * // middleware.ts
 * import { NextResponse } from 'next/server'
 * import { createMiddlewareGuard } from '`@molecule/app-routing-next`'
 *
 * const guard = createMiddlewareGuard([
 *   {
 *     match: '/dashboard/*',
 *     check: async (req) => {
 *       const token = req.cookies.get('token')
 *       if (!token) return '/login'
 *       return true
 *     },
 *   },
 * ])
 *
 * export function middleware(request) {
 *   return guard(request)
 * }
 * ```
 * @param rules - Array of guard rules, each with a `match` pattern (supports `*` wildcards) and an async `check` function.
 * @returns An async middleware function that returns `{ redirect: string }` or `{ continue: true }`.
 */
export const createMiddlewareGuard = (rules: MiddlewareGuardRule[]) => {
  return async (request: {
    url: string
    nextUrl: { pathname: string }
    cookies: { get: (name: string) => { value: string } | undefined }
    headers: { get: (name: string) => string | null }
  }) => {
    const { nextUrl } = request
    const pathname = nextUrl.pathname

    for (const rule of rules) {
      // Convert wildcard pattern to regex
      const pattern = rule.match.replace(/\*/g, '.*').replace(/\//g, '\\/')

      const regex = new RegExp(`^${pattern}$`)

      if (regex.test(pathname)) {
        const result = await rule.check({
          url: request.url,
          pathname,
          cookies: request.cookies,
          headers: request.headers,
        })

        if (typeof result === 'string') {
          // Return redirect response
          // Note: This returns a plain object - the actual NextResponse.redirect
          // should be created in the middleware.ts file
          return { redirect: result }
        }

        if (result === false) {
          return { redirect: '/' }
        }
      }
    }

    return { continue: true }
  }
}
