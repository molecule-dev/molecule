/**
 * Utility functions for Vue Router provider. The path helpers every routing bond exports come from
 * `@molecule/app-routing/bond-utilities`, one implementation for every bond.
 *
 * @module
 */

import type { LocationQueryRaw, LocationQueryValue } from 'vue-router'

import type { QueryParams, RouteParams } from './types.js'

export * from '@molecule/app-routing/bond-utilities'

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
