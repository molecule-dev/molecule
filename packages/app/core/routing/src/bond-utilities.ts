/**
 * The path helpers every routing bond exports under these names (`@molecule/app-routing-react-router`,
 * `-vue-router`, `-solid-router`, `-sveltekit`, `-angular-router`), in one implementation so an app
 * that swaps its routing bond gets the same answers.
 *
 * They follow React Router's conventions, which differ from this package's own `matchPath`,
 * `generatePath` and `stringifyQuery` (the ones the molecule `Router` uses): `matchPath` matches the
 * whole pathname unless `exact` is `false` and reads `*` as a wildcard, `generatePath` returns a
 * pattern unchanged when given no params, and `stringifyQuery` percent-encodes a space as `%20`.
 * Bonds re-export them from `@molecule/app-routing/bond-utilities`; apps import them from their bond.
 *
 * @module
 */

import { I18nError } from '@molecule/app-i18n'

import type { QueryParams, RouteMatch, RouteParams } from './types.js'

/**
 * Converts `URLSearchParams` into `QueryParams`. A key that appears more than once becomes an array
 * of its values, in order.
 *
 * @param searchParams - The search params to read.
 * @returns The query params.
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
 * Serializes `QueryParams` into a query string with a leading `?`, percent-encoding keys and values
 * (a space is `%20`). Undefined values are left out; an array writes its key once per value.
 *
 * @param params - The query params.
 * @returns The query string, or `''` when there is nothing to write.
 */
export function stringifyQuery(params: QueryParams): string {
  const entries = Object.entries(params)
    .filter(([, value]) => value !== undefined)
    .flatMap(([key, value]) =>
      (Array.isArray(value) ? value : [value]).map(
        (item) => `${encodeURIComponent(key)}=${encodeURIComponent(String(item))}`,
      ),
    )
  return entries.length ? `?${entries.join('&')}` : ''
}

/**
 * Matches a route pattern against a pathname. `:name` captures one segment and `*` matches
 * anything. The whole pathname must match unless `exact` is `false`, which also accepts a pathname
 * that only starts with the pattern.
 *
 * @param pattern - The pattern, such as `/users/:id` or `/files/*`.
 * @param pathname - The pathname to match.
 * @param exact - Whether the whole pathname must match (default `true`).
 * @returns The match with its params, or `null`.
 */
export function matchPath<Params extends RouteParams = RouteParams>(
  pattern: string,
  pathname: string,
  exact?: boolean,
): RouteMatch<Params> | null {
  const paramNames: string[] = []
  const regexPattern = pattern
    .replace(/:([^/]+)/g, (_, name: string) => {
      paramNames.push(name)
      return '([^/]+)'
    })
    .replace(/\*/g, '.*')
  const match = pathname.match(
    new RegExp(exact !== false ? `^${regexPattern}$` : `^${regexPattern}`),
  )
  if (!match) return null
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
 * Builds a path from a pattern by putting each `:name` param in its place, percent-encoded. A
 * pattern given no params is returned as it is.
 *
 * @param pattern - The pattern, such as `/users/:id`.
 * @param params - The param values.
 * @returns The path.
 * @throws {I18nError} `routing.error.missingParam` when params are given and one the pattern names
 *   is missing.
 */
export function generatePath(pattern: string, params?: RouteParams): string {
  if (!params) return pattern
  return pattern.replace(/:([^/]+)/g, (_, name: string) => {
    const value = params[name]
    if (value === undefined) {
      throw new I18nError(
        'routing.error.missingParam',
        { name, pattern },
        'Missing param "{{name}}" for path "{{pattern}}"',
      )
    }
    return encodeURIComponent(value)
  })
}

/**
 * Resolves a path against the pathname it is relative to: an absolute `to` is returned as it is;
 * otherwise `to` is joined to `fromPathname`'s parent, with `..` moving up and `.` staying.
 *
 * @param to - The path to resolve.
 * @param fromPathname - The pathname it is relative to.
 * @returns The resolved pathname.
 */
export function resolvePath(to: string, fromPathname: string): string {
  if (to.startsWith('/')) return to
  const segments = fromPathname.split('/').slice(0, -1)
  for (const segment of to.split('/')) {
    if (segment === '..') segments.pop()
    else if (segment !== '.') segments.push(segment)
  }
  return segments.join('/') || '/'
}

/**
 * Removes trailing slashes from a path, keeping `/` itself.
 *
 * @param path - The path.
 * @returns The path without trailing slashes.
 */
export function normalizePath(path: string): string {
  return path.replace(/\/+$/, '') || '/'
}
