import { type RouteDefinition as SolidRouteDefinition, useParams } from '@solidjs/router'
import { createComponent, type JSX } from 'solid-js'

import { decodeParam } from './decode-param.js'
import type { SolidLinkArgs, SolidRouteParams } from './types.js'

/**
 * Percent escapes React Router leaves as the literal character in a path segment, because
 * RFC 3986 allows `$ & + , ; = : @` in a path. The same rules as React Router's
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
 * Encodes one parameter value for a path segment: `encodeURIComponent`, then the
 * characters a path segment may carry literally are restored.
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
 * Encodes a splat value segment by segment, keeping its `/` separators.
 *
 * @param value - The raw splat value.
 * @returns The value with each segment encoded.
 */
function encodeSplat(value: string): string {
  return value.split('/').map(encodeURIComponent).join('/')
}

/**
 * Builds a link from a route path and its parameter values, with React Router's
 * `generatePath` rules: a required parameter that has no value throws, an optional
 * `:name?` segment is dropped when its value is absent, a trailing `*` takes the splat
 * value, and every value is encoded for a path segment.
 *
 * @param path - The declared route path.
 * @param params - The parameter values from the caller.
 * @returns The interpolated link.
 */
function linkPath(path: string, params?: Record<string, string | null | undefined>): string {
  // React Router treats a trailing `*` that does not follow a `/` as if it did.
  const expanded =
    path.endsWith('*') && path !== '*' && !path.endsWith('/*') ? path.replace(/\*$/, '/*') : path
  const prefix = expanded.startsWith('/') ? '/' : ''
  const values = params ?? {}
  const segments = expanded
    .split(/\/+/)
    .map((segment, index, all) => {
      if (index === all.length - 1 && segment === '*') {
        return values['*'] == null ? '' : encodeSplat(values['*'])
      }
      const named = segment.match(/^:([\w-]+)(\??)(.*)/)
      if (named) {
        const name = named[1]
        const optional = named[2]
        const suffix = named[3]
        const value = values[name]
        if (optional !== '?' && value == null) throw new Error(`Missing ":${name}" param`)
        return encodePathParam(value == null ? '' : value) + suffix
      }
      return segment.replace(/\?$/g, '')
    })
    .filter((segment) => segment !== '')
  return prefix + segments.join('/')
}

/**
 * Register a literal Solid Router path and give its page the params that path declares.
 *
 * Create the route at module scope and pass it to a router's `children` or `routes`.
 * A render callback builds the page from the params, or pass `{ Component: EditPage }`
 * to give the page a typed `params` prop automatically. The render callback runs once
 * when the page mounts and returns its JSX. Read params inside JSX or an effect so the
 * page follows URL changes. The params object is Solid's reactive one, so reading it
 * outside a tracking scope does not update. Values arrive percent-decoded, as they do
 * in the other routing bonds, although Solid Router itself hands out the raw URL text.
 *
 * Use the returned `href` for links and post-save navigation. It builds the destination
 * from the same path that mounts the page, with the parameter names required by that
 * path, exactly as React Router's bond builds it. Pass values from the saved response
 * when identity can change.
 *
 * @param path - A route path, including any named parameters.
 * @param page - A render callback building the page, or an object with the page's `Component`.
 * @returns The Solid Router route definition and a function that builds a link to it.
 */
export function defineRoute<const Path extends string>(
  path: Path,
  page:
    | ((params: NoInfer<SolidRouteParams<Path>>) => JSX.Element)
    | {
        Component: (props: { params: NoInfer<SolidRouteParams<Path>> }) => JSX.Element
      },
): SolidRouteDefinition<Path> & { path: Path; href: (...args: SolidLinkArgs<Path>) => string } {
  /**
   * Read the matched route from Solid Router.
   *
   * @returns The page with decoded route parameters.
   */
  function Page(): JSX.Element {
    const raw = useParams()
    // Solid Router supplies string or undefined for every key. The path narrows the
    // callback's keys while the proxy keeps the router's reactive values.
    const decoded = new Proxy(raw, {
      get: (target, key) => {
        const value = typeof key === 'string' ? target[key] : undefined
        return value === undefined ? undefined : decodeParam(value)
      },
    })
    const params = decoded as SolidRouteParams<Path>
    if (typeof page === 'function') return page(params)
    // What `<Component params={params} />` compiles to: written out, this module needs no JSX
    // build and keeps the `dist/define-route.js` path 1.1.0 published.
    return createComponent(page.Component, { params })
  }

  return { path, component: Page, href: (...[params]) => linkPath(path, params) }
}
