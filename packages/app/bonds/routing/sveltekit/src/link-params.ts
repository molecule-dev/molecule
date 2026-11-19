/**
 * The link a route declaration's page is reachable at, built from the declaration
 * itself.
 *
 * SvelteKit mounts routes from files: the file path under `src/routes` IS the
 * declaration (`/shelves/[shelf]/+page.svelte` declares `/shelves/[shelf]`), and
 * `page.params` hands the page the decoded values. `$app/paths`' `resolve` turns a
 * route ID into a URL, but it writes the parameter values into the path as they
 * are — it does not percent-encode them, and it refuses a value that starts or
 * ends with `/`. A link built with this module carries the same address React
 * Router's `generatePath` builds for the same values, so a saved record's link is
 * one string in every framework binding.
 *
 * This module is internal: `src/index.ts` does not re-export it.
 *
 * @module
 */

import { I18nError } from '@molecule/app-i18n'

/**
 * Percent escapes React Router leaves as the literal character in a path segment,
 * because RFC 3986 allows `$ & + , ; = : @` there. The same rules as its
 * `generatePath`, so a link built here equals the one React's bond builds.
 */
const PATH_PARAM_LITERALS: Record<string, string> = {
  '%24': '$',
  '%26': '&',
  '%2B': '+',
  '%2C': ',',
  '%3A': ':',
  '%3B': ';',
  '%3D': '=',
  '%40': '@',
}

/**
 * Encodes one value for a path segment: `encodeURIComponent`, then the characters
 * a path segment may carry literally are restored.
 *
 * @param value - The raw value.
 * @returns The value as one path segment.
 */
function encodePathParam(value: string): string {
  return encodeURIComponent(value).replace(/%(?:24|26|2B|2C|3A|3B|3D|40)/g, (escape) => {
    return PATH_PARAM_LITERALS[escape] ?? escape
  })
}

/**
 * Encodes a rest value segment by segment, keeping its `/` separators.
 *
 * @param value - The raw value.
 * @returns The value with each segment encoded.
 */
function encodeRest(value: string): string {
  return value.split('/').map(encodeURIComponent).join('/')
}

/**
 * The parameter one route-id segment declares.
 *
 * `[name]` and `[...name]` are required; `[[name]]` and `[[...name]]` may be left
 * out; a `=type` matcher after the name is ignored, as kit ignores it when it
 * interpolates the value.
 */
type SegmentParams<Segment extends string> = Segment extends `[[...${infer Name}]]`
  ? { [Key in Name]?: string }
  : Segment extends `[...${infer Name}]`
    ? { [Key in Name]: string }
    : Segment extends `[[${infer Name}]]`
      ? { [Key in Name]?: string }
      : Segment extends `[${infer Name}]`
        ? { [Key in StripMatcher<Name>]: string }
        : Record<never, never>

/**
 * Drops the `=type` matcher some route IDs name after the parameter.
 */
type StripMatcher<Name extends string> = Name extends `${infer Bare}=${string}` ? Bare : Name

/**
 * The parameter names a route ID declares, with the optional ones left free.
 */
export type RouteIdParams<Id extends string> = Id extends `${infer Head}/${infer Tail}`
  ? SegmentParams<Head> & RouteIdParams<Tail>
  : SegmentParams<Id>

/**
 * The arguments {@link routeHref} takes for a route ID: none when the declaration
 * names no parameter, a required object when one is required, and an optional one
 * when every parameter may be left out.
 */
type RouteHrefArgs<Id extends string> = keyof RouteIdParams<Id> extends never
  ? []
  : RouteIdParams<Id> extends Required<RouteIdParams<Id>>
    ? [params: RouteIdParams<Id>]
    : [params?: RouteIdParams<Id>]

/**
 * Builds the in-app path a route declaration's page is reachable at, from the
 * route ID that declares it and the values its parameters take.
 *
 * The ID is kit's route-ID grammar — `/shelves/[shelf]`, `/search/[[query]]`,
 * `/files/[...rest]` — which is also the file path that mounts the page. Values
 * are percent-encoded the way React Router's `generatePath` encodes them, so the
 * link equals the one React's bond builds for the same declaration.
 *
 * @param id - The route ID (the file path under `src/routes`, without its `+page.svelte`).
 * @param params - The parameter values the declaration names.
 * @returns The in-app path, without the app's base path.
 * @throws {I18nError} `routing.error.missingParam` when a required parameter has no value.
 * @example
 * ```ts
 * routeHref('/shelves/[shelf]', { shelf: 'reference/maps #1' })
 * // '/shelves/reference%2Fmaps%20%231'
 * ```
 */
export function routeHref<const Id extends string>(id: Id, ...params: RouteHrefArgs<Id>): string
export function routeHref(id: string, ...params: object[]): string {
  const values: Record<string, unknown> = { ...(params[0] ?? {}) }
  const segments = id
    .split('/')
    .map((segment) => {
      const param = segmentParam(segment)
      if (!param) return segment
      const value = values[param.name]
      if (typeof value !== 'string' || value === '') {
        if (param.optional) return ''
        throw new I18nError(
          'routing.error.missingParam',
          { name: param.name, pattern: id },
          'Missing param "{{name}}" for path "{{pattern}}"',
        )
      }
      return param.rest ? encodeRest(value) : encodePathParam(value)
    })
    // An empty leading segment keeps the path absolute; a segment that held only
    // an optional parameter left out drops with it.
    .filter((segment, index) => index === 0 || segment !== '')
  return segments.join('/') || '/'
}

/**
 * The parameter a route-id segment declares, from its runtime text.
 *
 * @param segment - One segment of a route ID, such as `[shelf]` or `[[query]]`.
 * @returns The name and whether it may be left out, or `null` for a static segment.
 */
function segmentParam(segment: string): { name: string; optional: boolean; rest: boolean } | null {
  const rest = /^\[{1,2}\.\.\.([\w-]+)(?:=[\w]+)?\]{1,2}$/.exec(segment)
  if (rest) return { name: rest[1], optional: segment.startsWith('[['), rest: true }
  const named = /^\[{1,2}([\w-]+)(?:=[\w]+)?\]{1,2}$/.exec(segment)
  if (named) return { name: named[1], optional: segment.startsWith('[['), rest: false }
  return null
}
