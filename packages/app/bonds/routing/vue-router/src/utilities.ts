/**
 * Utility functions for Vue Router provider.
 *
 * @module
 */

import type { LocationQueryRaw, LocationQueryValue } from 'vue-router'

import type { QueryParams, RouteMatch, RouteParams } from './types.js'

/**
 * Converts a Vue Router query object (with nullable values) into a molecule `QueryParams` object.
 * Filters out `null` values and preserves arrays.
 * @param query - The Vue Router `LocationQuery` object from `route.query`.
 * @returns A molecule `QueryParams` map with only non-null values.
 */
export function parseVueQuery(
  query: Record<string, LocationQueryValue | LocationQueryValue[]>,
): QueryParams {
  const result: QueryParams = {}

  for (const [key, value] of Object.entries(query)) {
    if (value === null) {
      continue
    }
    if (Array.isArray(value)) {
      result[key] = value.filter((v): v is string => v !== null)
    } else {
      result[key] = value
    }
  }

  return result
}

/**
 * Converts a molecule `QueryParams` object to a Vue Router `LocationQueryRaw` object.
 * Omits keys with `undefined` values.
 * @param params - The molecule query parameters.
 * @returns A `LocationQueryRaw` compatible with Vue Router's `router.push({ query })`.
 */
export function toVueQuery(params: QueryParams): LocationQueryRaw {
  const result: LocationQueryRaw = {}

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) {
      continue
    }
    result[key] = value
  }

  return result
}

/**
 * Converts a molecule `QueryParams` object to a URL search string (e.g. `?key=val&arr=1&arr=2`).
 * Omits keys with `undefined` values.
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
      throw new Error(`Missing required param "${name}"`)
    }
    return encodeURIComponent(value)
  })
}

/**
 * Normalizes Vue Router params (which may contain `string | string[]`) into molecule
 * `RouteParams` (plain `string` values). Array values are joined with `'/'`.
 * @param params - The Vue Router params object from `route.params`.
 * @returns A flat `RouteParams` map with string values only.
 */
export function normalizeParams(params: Record<string, string | string[]>): RouteParams {
  const result: RouteParams = {}
  for (const [key, value] of Object.entries(params)) {
    result[key] = Array.isArray(value) ? value.join('/') : value
  }
  return result
}
