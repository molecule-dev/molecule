/**
 * Utility functions for Next.js routing.
 *
 * @module
 */

import { generatePath, matchPath, parseQuery, stringifyQuery } from '@molecule/app-routing'

import type { QueryParams } from './types.js'

// Re-export utility functions from core routing
export { generatePath, matchPath, parseQuery, stringifyQuery }

/**
 * Creates a Next.js link href with query params.
 *
 * @example
 * ```tsx
 * import Link from 'next/link'
 * import { createLinkHref } from '`@molecule/app-routing-next`'
 *
 * <Link href={createLinkHref('/products', { category: 'shoes', sort: 'price' })}>
 *   View Shoes
 * </Link>
 * ```
 * @param pathname - The base path (e.g. `'/products'`).
 * @param query - Optional query parameters to append as a search string.
 * @param hash - Optional hash fragment (with or without leading `#`).
 * @returns The assembled href string with path, query, and hash.
 */
export const createLinkHref = (pathname: string, query?: QueryParams, hash?: string): string => {
  let href = pathname
  if (query) {
    href += stringifyQuery(query)
  }
  if (hash) {
    href += hash.startsWith('#') ? hash : `#${hash}`
  }
  return href
}

/**
 * Creates a reusable path builder for Next.js dynamic routes. Replaces `[param]` and
 * `[...catchAll]` segments with provided values.
 *
 * @example
 * ```typescript
 * const productPath = dynamicPath('/products/[id]')
 * productPath({ id: '123' }) // => '/products/123'
 *
 * const nestedPath = dynamicPath('/blog/[...slug]')
 * nestedPath({ slug: ['2024', '01', 'hello'] }) // => '/blog/2024/01/hello'
 * ```
 * @param pattern - A Next.js route pattern with `[param]` or `[...catchAll]` segments.
 * @returns A function that accepts params and returns the resolved path string.
 */
export const dynamicPath = (pattern: string) => {
  return (params: Record<string, string | string[]>): string => {
    return pattern.replace(/\[\.\.\.(\w+)\]|\[(\w+)\]/g, (_, catchAll, single) => {
      const key = catchAll || single
      const value = params[key]

      if (catchAll && Array.isArray(value)) {
        return value.join('/')
      }

      return Array.isArray(value) ? value[0] : value
    })
  }
}

/**
 * Normalizes a Next.js catch-all route parameter into a string array.
 * Handles `undefined` (returns `[]`), a single string, or an existing array.
 *
 * @example
 * ```typescript
 * // For route /blog/[...slug] with URL /blog/2024/01/hello
 * const segments = parseCatchAllParams(params.slug)
 * // => ['2024', '01', 'hello']
 * ```
 * @param param - The catch-all param value from Next.js route params.
 * @returns An array of path segments.
 */
export const parseCatchAllParams = (param: string | string[] | undefined): string[] => {
  if (!param) return []
  return Array.isArray(param) ? param : [param]
}
