import { computed, inject, type Signal, type Type } from '@angular/core'
import { toSignal } from '@angular/core/rxjs-interop'
import { ActivatedRoute, type Route } from '@angular/router'

import { generatePath } from '@molecule/app-routing/bond-utilities'

import type { AngularRouteParams } from './types.js'

/** The parameter names one path segment declares as a required link value. */
type SegmentLinkKey<Segment extends string> = Segment extends `:${infer Name}`
  ? Name extends `${string}?`
    ? never
    : Name
  : Segment extends '*' | '**'
    ? '*'
    : never

/** The parameter names one path segment declares, an optional one included. */
type SegmentLinkParam<Segment extends string> = Segment extends `:${infer Name}`
  ? Name extends `${infer Required}?`
    ? Required
    : Name
  : Segment extends '*' | '**'
    ? '*'
    : never

/** The parameter names a path requires in a link, in any segment. */
type RequiredLinkKey<Path extends string> = Path extends `${infer Segment}/${infer Rest}`
  ? SegmentLinkKey<Segment> | RequiredLinkKey<Rest>
  : SegmentLinkKey<Path>

/** The parameter names a path declares in a link, in any segment. */
type LinkPathParam<Path extends string> = Path extends `${infer Segment}/${infer Rest}`
  ? SegmentLinkParam<Segment> | LinkPathParam<Rest>
  : SegmentLinkParam<Path>

/** The link parameters a declared path takes: required names, then its optional ones. */
type LinkParams<Path extends string> = Record<RequiredLinkKey<Path>, string> &
  Partial<Record<Exclude<LinkPathParam<Path>, RequiredLinkKey<Path>>, string | null>>

/** The arguments `href` takes for a declared path. */
type LinkArgs<Path extends string> = string extends Path
  ? [params?: Record<string, string | null | undefined>]
  : [LinkPathParam<Path>] extends [never]
    ? []
    : [RequiredLinkKey<Path>] extends [never]
      ? [params?: LinkParams<Path>]
      : [params: LinkParams<Path>]

/** The path Angular's route table matches: the declared path without its leading slash. */
type RouteTablePath<Path extends string> = Path extends `/${infer Rest}` ? Rest : Path

/**
 * Removes the leading slash Angular's route table forbids.
 *
 * The argument is a literal route path, so removing a `/` prefix is the
 * `RouteTablePath` transform itself; the assertion states that runtime fact.
 *
 * @param path - The declared route path.
 * @returns The path Angular's route table matches.
 */
function stripLeadingSlash<Path extends string>(path: Path): RouteTablePath<Path> {
  return path.replace(/^\/+/, '') as RouteTablePath<Path>
}

/**
 * Builds the URL a link to a declared path points at.
 *
 * `:name` is required and percent-encoded, `:name?` is left out when its value is
 * missing, and `*` / `**` puts a splat value in place, encoding each of its segments.
 *
 * @param path - The declared route path, with a leading slash.
 * @param params - The values the path's parameters take.
 * @returns The interpolated path.
 * @throws {I18nError} `routing.error.missingParam` when a required parameter is missing.
 */
function linkPath(path: string, params?: Record<string, string | null | undefined>): string {
  const segments: string[] = []
  for (const segment of path.split('/')) {
    if (segment === '*' || segment === '**') {
      const value = params?.['*']
      segments.push(value == null ? '' : String(value).split('/').map(encodeURIComponent).join('/'))
      continue
    }
    if (segment.startsWith(':')) {
      const optional = segment.endsWith('?')
      const name = segment.slice(1, optional ? segment.length - 1 : undefined)
      if (params?.[name] == null) {
        if (optional) continue
        // Leave the required parameter in place so `generatePath` reports it.
        segments.push(segment)
        continue
      }
      segments.push(`:${name}`)
      continue
    }
    segments.push(segment)
  }
  const pattern = segments.join('/')
  if (params === undefined) return pattern
  const values: Record<string, string> = {}
  for (const [key, value] of Object.entries(params)) if (value != null) values[key] = String(value)
  return generatePath(pattern, values)
}

/**
 * Register a literal Angular Router path and the component that renders it.
 *
 * Create the route at module scope and add it to the routes passed to `provideRouter`.
 * Pass the component directly or as `{ Component }`. The declared path may keep the
 * leading slash every other routing bond uses (`/shelves/:shelf`): it is accepted here
 * and removed for Angular's route table, so one string serves the route, `href` and
 * `ListRouteNav`. Angular paths have no optional parameters and no splat. Inside the
 * component, call {@link injectRouteParams} with the same path to read its parameters.
 *
 * Use the returned `href` for links and post-save navigation. It builds the destination
 * from the same path that mounts the page, with the parameter names that path requires.
 * Pass values from the saved response when identity can change.
 *
 * @param path - A route path, with or without a leading slash, including any `:name` parameters.
 * @param page - The page component class, or `{ Component: page }`.
 * @returns The path for Angular's route table, the component, and a function building a link to it.
 */
export function defineRoute<const Path extends string>(
  path: Path,
  page: Type<unknown> | { Component: Type<unknown> },
): Route & {
  path: RouteTablePath<Path>
  href: (...args: LinkArgs<Path>) => string
} {
  const component = typeof page === 'function' ? page : page.Component
  const link = path.startsWith('/') ? path : `/${path}`
  return {
    path: stripLeadingSlash(path),
    component,
    href: (...[params]: LinkArgs<Path>) => linkPath(link, params),
  }
}

/**
 * Read the parameters a route path declares, as a signal that follows URL changes.
 *
 * Call it in a field initializer or constructor of the page component, where Angular's
 * injection context is active, and name the same path that `defineRoute` registered:
 * `params = injectRouteParams<'/shelves/:shelf'>()`. Values are percent-decoded.
 *
 * @returns A signal of the declared parameters; a parameter missing from the URL is `undefined`.
 */
export function injectRouteParams<Path extends string>(): Signal<AngularRouteParams<Path>> {
  const paramMap = toSignal(inject(ActivatedRoute).paramMap, { requireSync: true })
  return computed(() => {
    const current = paramMap()
    const params: Record<string, string | undefined> = {}
    for (const name of current.keys) {
      params[name] = current.get(name) ?? undefined
    }
    // Angular supplies string or undefined for every key. The path narrows the
    // keys while the values stay the router's decoded ones.
    return params as AngularRouteParams<Path>
  })
}
