/**
 * Utility functions for React Router provider.
 *
 * @module
 */

import { t } from '@molecule/app-i18n'

import type { QueryParams, RouteMatch, RouteParams } from './types.js'

/**
 * Parses `URLSearchParams` into a molecule `QueryParams` object. Duplicate keys
 * are collected into arrays.
 * @param searchParams - The `URLSearchParams` instance (e.g. from `useSearchParams()`).
 * @returns A `QueryParams` map where duplicate keys become string arrays.
 */
export function parseSearchParams(searchParams: URLSearchParams): QueryParams {
  const result: QueryParams = {}

  for (const [key, value] of searchParams.entries()) {
    const existing = result[key]
    if (existing === undefined) {
      result[key] = value
    } else if (Array.isArray(existing)) {
      existing.push(value)
    } else {
      result[key] = [existing, value]
    }
  }

  return result
}

/**
 * Converts a molecule `QueryParams` object to a URL search string (e.g. `?key=val&arr=1&arr=2`).
 * Omits keys with `undefined` values. Returns empty string if no params.
 * @param params - The query parameters to stringify.
 * @returns A URL search string starting with `?`, or empty string if no params.
 */
export function stringifyQuery(params: QueryParams): string {
  const entries = Object.entries(params)
    .filter(([, v]) => v !== undefined)
    .flatMap(([k, v]) => {
      if (Array.isArray(v)) {
        return v.map((val) => `${encodeURIComponent(k)}=${encodeURIComponent(val)}`)
      }
      return `${encodeURIComponent(k)}=${encodeURIComponent(v as string)}`
    })

  return entries.length ? `?${entries.join('&')}` : ''
}

/**
 * Matches a path pattern (with `:param` segments and `*` wildcards) against a pathname.
 * @param pattern - The route pattern (e.g. `'/users/:id'`).
 * @param pathname - The actual URL pathname to test.
 * @param exact - Whether to require an exact match (default `true`). Set to `false` for prefix matching.
 * @returns A `RouteMatch` with extracted params, or `null` if no match.
 */
export function matchPath<Params extends RouteParams = RouteParams>(
  pattern: string,
  pathname: string,
  exact?: boolean,
): RouteMatch<Params> | null {
  // Convert pattern to regex
  // :param -> named capture group
  // * -> wildcard
  const paramNames: string[] = []

  const regexPattern = pattern
    .replace(/:([^/]+)/g, (_, name) => {
      paramNames.push(name)
      return '([^/]+)'
    })
    .replace(/\*/g, '.*')

  const fullPattern = exact !== false ? `^${regexPattern}$` : `^${regexPattern}`
  const regex = new RegExp(fullPattern)
  const match = pathname.match(regex)

  if (!match) {
    return null
  }

  const params: Record<string, string> = {}
  paramNames.forEach((name, index) => {
    params[name] = match[index + 1] || ''
  })

  return {
    path: pattern,
    pathname: match[0],
    params: params as Params,
    isExact: match[0] === pathname,
  }
}

/**
 * Generates a concrete path from a route pattern by replacing `:param` segments with values.
 * Throws if a required param is missing.
 * @param pattern - The route pattern (e.g. `'/users/:id'`).
 * @param params - A map of param names to values.
 * @returns The resolved path string with params URL-encoded.
 */
export function generatePath(pattern: string, params?: RouteParams): string {
  if (!params) return pattern

  return pattern.replace(/:([^/]+)/g, (_, name) => {
    const value = params[name]
    if (value === undefined) {
      throw new Error(
        t(
          'routing.error.missingParam',
          { name, pattern },
          { defaultValue: `Missing required param "${name}" for path "${pattern}"` },
        ),
      )
    }
    return encodeURIComponent(value)
  })
}

/**
 * Resolves a relative path against a base pathname. Absolute paths (starting with `/`) are
 * returned as-is. Relative paths handle `..` (parent) and `.` (current) segments.
 * @param to - The destination path (absolute or relative).
 * @param fromPathname - The current pathname to resolve against.
 * @returns The resolved absolute path.
 */
export function resolvePath(to: string, fromPathname: string): string {
  if (to.startsWith('/')) {
    return to
  }

  const fromSegments = fromPathname.split('/').slice(0, -1)
  const toSegments = to.split('/')

  for (const segment of toSegments) {
    if (segment === '..') {
      fromSegments.pop()
    } else if (segment !== '.') {
      fromSegments.push(segment)
    }
  }

  return fromSegments.join('/') || '/'
}

/**
 * Removes trailing slashes from a path. Returns `'/'` for root/empty paths.
 * @param path - The URL path to normalize.
 * @returns The path without trailing slashes.
 */
export function normalizePath(path: string): string {
  return path.replace(/\/+$/, '') || '/'
}
