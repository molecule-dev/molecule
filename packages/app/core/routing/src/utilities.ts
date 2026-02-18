/**
 * Utility functions for routing — query string parsing, path matching,
 * and path generation.
 *
 * @module
 */

import { t } from '@molecule/app-i18n'

import type { QueryParams, RouteMatch, RouteParams } from './types.js'

/**
 * Parses a URL query string (e.g. `?foo=bar&baz=1`) into a
 * `QueryParams` object. Duplicate keys produce string arrays.
 *
 * @param search - The query string to parse (with or without leading `?`).
 * @returns A key-value map of query parameters.
 */
export const parseQuery = (search: string): QueryParams => {
  const params: QueryParams = {}
  const searchParams = new URLSearchParams(search)

  searchParams.forEach((value, key) => {
    const existing = params[key]
    if (existing !== undefined) {
      if (Array.isArray(existing)) {
        existing.push(value)
      } else {
        params[key] = [existing, value]
      }
    } else {
      params[key] = value
    }
  })

  return params
}

/**
 * Serializes a `QueryParams` object into a query string with leading `?`.
 * Returns an empty string if no parameters are present.
 *
 * @param params - The query parameters to serialize.
 * @returns The query string (e.g. `?foo=bar&baz=1`) or `''`.
 */
export const stringifyQuery = (params: QueryParams): string => {
  const searchParams = new URLSearchParams()

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue

    if (Array.isArray(value)) {
      for (const v of value) {
        searchParams.append(key, v)
      }
    } else {
      searchParams.append(key, value)
    }
  }

  const result = searchParams.toString()
  return result ? `?${result}` : ''
}

/**
 * Matches a route pattern (e.g. `/users/:id`) against a pathname.
 * Extracts named parameters from the URL.
 *
 * @param pattern - Route pattern with `:param` placeholders.
 * @param pathname - The actual URL pathname to match against.
 * @param exact - If `true`, requires a full match (no trailing segments).
 * @returns A `RouteMatch` with extracted params, or `null` if no match.
 */
export const matchPath = <Params extends RouteParams = RouteParams>(
  pattern: string,
  pathname: string,
  exact: boolean = false,
): RouteMatch<Params> | null => {
  // Convert pattern to regex
  // Important: extract param names FIRST, then escape slashes
  // Otherwise the escaped backslash gets captured as part of the param name
  const paramNames: string[] = []
  const regexPattern = pattern
    .replace(/:([^/]+)/g, (_, name) => {
      paramNames.push(name)
      return '([^/]+)'
    })
    .replace(/\//g, '\\/')

  const regex = exact ? new RegExp(`^${regexPattern}$`) : new RegExp(`^${regexPattern}(?:\\/|$)`)

  const match = pathname.match(regex)
  if (!match) return null

  const params: RouteParams = {}
  paramNames.forEach((name, index) => {
    params[name] = match[index + 1]
  })

  return {
    path: pattern,
    pathname: match[0],
    params: params as Params,
    isExact: match[0] === pathname,
  }
}

/**
 * Generates a URL path from a route pattern by substituting named parameters.
 *
 * @param pattern - Route pattern with `:param` placeholders (e.g. `/users/:id`).
 * @param params - Parameter values to substitute into the pattern.
 * @returns The generated path with parameters URL-encoded.
 * @throws {Error} If a required parameter is missing.
 */
export const generatePath = (pattern: string, params: RouteParams = {}): string => {
  return pattern.replace(/:([^/]+)/g, (_, name) => {
    const value = params[name]
    if (value === undefined) {
      throw new Error(
        t(
          'routing.error.missingParam',
          { name, pattern },
          { defaultValue: `Missing param "${name}" for path "${pattern}"` },
        ),
      )
    }
    return encodeURIComponent(value)
  })
}
