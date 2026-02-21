/**
 * Utility functions for React Navigation provider.
 *
 * @module
 */

import { t } from '@molecule/app-i18n'

import type { QueryParams, RouteMatch, RouteParams } from './types.js'

/**
 * Parses a URL search string into a QueryParams object.
 * @param search - The URL search string to parse (with or without leading `?`).
 * @returns The parsed query parameters.
 */
export function parseSearchString(search: string): QueryParams {
  const result: QueryParams = {}
  if (!search || search === '?') return result

  const str = search.startsWith('?') ? search.slice(1) : search
  for (const pair of str.split('&')) {
    const [key, value] = pair.split('=').map(decodeURIComponent)
    if (!key) continue
    const existing = result[key]
    if (existing === undefined) {
      result[key] = value || ''
    } else if (Array.isArray(existing)) {
      existing.push(value || '')
    } else {
      result[key] = [existing, value || '']
    }
  }
  return result
}

/**
 * Converts a QueryParams object to a URL search string.
 * @param params - The query parameters to stringify.
 * @returns The encoded search string prefixed with `?`, or empty string if no params.
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
 * Matches a path pattern against a pathname.
 * @param pattern - The route pattern with `:param` placeholders.
 * @param pathname - The actual pathname to match against.
 * @param exact - Whether to require an exact match (defaults to true).
 * @returns The route match with extracted params, or null if no match.
 */
export function matchPath<Params extends RouteParams = RouteParams>(
  pattern: string,
  pathname: string,
  exact?: boolean,
): RouteMatch<Params> | null {
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
 * Generates a concrete path from a pattern with param substitution.
 * @param pattern - The route pattern with `:param` placeholders.
 * @param params - The parameter values to substitute into the pattern.
 * @returns The generated path with params substituted and encoded.
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
 * Resolves a screen name from a URL path using linking config.
 * @param path - The URL path to resolve.
 * @param screens - The screen-to-pattern linking configuration map.
 * @returns The matched screen name and extracted params, or null if no match.
 */
export function resolveScreenFromPath(
  path: string,
  screens: Record<string, string>,
): { screen: string; params?: Record<string, string> } | null {
  for (const [screenName, pattern] of Object.entries(screens)) {
    const match = matchPath(pattern, path)
    if (match) {
      return { screen: screenName, params: match.params }
    }
  }
  return null
}

/**
 * Resolves a URL path from a screen name using linking config.
 * @param screen - The screen name to resolve.
 * @param params - The navigation params from the current route.
 * @param screens - The screen-to-pattern linking configuration map.
 * @returns The resolved URL path.
 */
export function resolvePathFromScreen(
  screen: string,
  params: Record<string, unknown> | undefined,
  screens: Record<string, string>,
): string {
  const pattern = screens[screen]
  if (!pattern) return '/'
  const routeParams: RouteParams = {}
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) routeParams[k] = String(v)
    }
  }
  return generatePath(pattern, routeParams)
}
