import { type Component, defineComponent, h, type VNodeChild } from 'vue'
import {
  createRouterMatcher,
  type RouteParamValueRaw,
  type RouteRecordRaw,
  type RouterMatcher,
  useRoute,
} from 'vue-router'

import type { VueRouteLinkNames } from './link-params.js'
import type { VueRouteParams } from './types.js'

/** One declared route's native path parser, as Vue Router exposes it from its matcher. */
type NativePathMatcher = ReturnType<RouterMatcher['getRoutes']>[number]

/**
 * Flattens one Vue Router parameter value into a string.
 *
 * @param value - A string, a repeated parameter's array, or nothing.
 * @returns The string, the array joined with `/`, or `undefined` when empty.
 */
function paramToString(value: RouteParamValueRaw | readonly string[]): string | undefined {
  const text = Array.isArray(value) ? value.join('/') : value
  return text === undefined || text === null || text === '' ? undefined : String(text)
}

/** The parameter names a link must supply for a declared path. */
type RequiredLinkKey<Path extends string> = VueRouteLinkNames<Path>['required']

/** The parameter names a link may leave out for a declared path. */
type OptionalLinkKey<Path extends string> = VueRouteLinkNames<Path>['optional']

/** The values a link needs, with the optional names left free. */
type LinkParams<Path extends string> = Record<RequiredLinkKey<Path>, string> &
  Partial<Record<OptionalLinkKey<Path>, string | undefined>>

/** The arguments `href` accepts for a declared path. */
type LinkArgs<Path extends string> = string extends Path
  ? [params?: Record<string, string | null | undefined>]
  : [RequiredLinkKey<Path> | OptionalLinkKey<Path>] extends [never]
    ? []
    : [RequiredLinkKey<Path>] extends [never]
      ? [params?: LinkParams<Path>]
      : [params: LinkParams<Path>]

/** The page a route declares: a render callback, or a component receiving `params`. */
type RoutePage<Path extends string> =
  | ((params: NoInfer<VueRouteParams<Path>>) => VNodeChild)
  | { Component: Component<{ params: NoInfer<VueRouteParams<Path>> }> }

/**
 * Encodes one parameter value the way Vue Router writes it into a URL path.
 *
 * @param text - A raw parameter value.
 * @returns The value with `?`, `#` and `/` escaped, as Vue Router escapes a parameter.
 */
function encodeParam(text: string): string {
  return encodeURI(text)
    .replace(/%7C/g, '|')
    .replace(/%5B/g, '[')
    .replace(/%5D/g, ']')
    .replace(/#/g, '%23')
    .replace(/\?/g, '%3F')
    .replace(/\//g, '%2F')
}

/**
 * Builds a URL path from the route's own native matcher, so the link has exactly the
 * path Vue Router matches and mounts.
 *
 * @param matcher - The route's native path parser.
 * @param params - Bare parameter values from the caller.
 * @returns The URL path for the declared route.
 */
function linkPath(
  matcher: NativePathMatcher,
  params: Record<string, string | null | undefined> | undefined,
): string {
  const values: Record<string, string> = {}
  for (const [name, value] of Object.entries(params ?? {})) {
    if (value === null || value === undefined) continue
    const repeatable = matcher.keys.some((key) => key.name === name && key.repeatable)
    values[name] = repeatable ? value.split('/').map(encodeParam).join('/') : encodeParam(value)
  }
  return matcher.stringify(values)
}

/**
 * Creates the native path parser for one declared route.
 *
 * @param path - A declared route path.
 * @returns The route's native matcher, used to build its links.
 */
function createLinkMatcher(path: string): NativePathMatcher {
  const absolute = path.startsWith('/') ? path : `/${path}`
  const matcher = createRouterMatcher(
    [{ path: absolute, component: defineComponent({ render: () => null }) }],
    {},
  )
  return matcher.getRoutes()[0]
}

/**
 * Register a literal Vue Router path and give its page the params that path declares.
 *
 * Create the route at module scope and add it to the `routes` passed to
 * `createRouter`. The render callback returns the page's vnodes and runs again
 * when the params change. Pass `{ Component: EditPage }` to give the page a typed
 * `params` prop automatically. A render callback can also supply app-owned props,
 * such as a view selected by a literal suffix. Keep page hooks inside the page
 * component. In nested routes, layout components own the params declared on their
 * own paths.
 *
 * Use the returned `href` for links and post-save navigation. It builds the
 * destination from the same path that mounts the page, with the parameter names
 * required by that path, and writes it the way Vue Router writes a URL. Pass
 * values from the saved response when identity can change. A repeated parameter
 * (`:name+`, `:name*`) takes one string joined with `/`, and an omitted optional
 * parameter is left out of the link.
 *
 * @param path - A route path, including any named parameters.
 * @param page - A component receiving `params`, or a function building the page's vnodes.
 * @returns The route table entry and a function that builds a link to it.
 */
export function defineRoute<const Path extends string>(
  path: Path,
  page: RoutePage<Path>,
): RouteRecordRaw & { path: Path; href: (...[params]: LinkArgs<Path>) => string } {
  const Page = defineComponent({
    /**
     * Read the matched route from Vue Router.
     *
     * @returns A render function that renders the page with the current params.
     */
    setup() {
      const route = useRoute()
      return () => {
        const params: Record<string, string | undefined> = {}
        for (const [name, value] of Object.entries(route.params)) {
          params[name] = paramToString(value)
        }
        // Vue Router supplies string or undefined for every key. The path narrows
        // the page's keys while the values stay the router's decoded ones.
        const typed = params as VueRouteParams<Path>
        return typeof page === 'function' ? page(typed) : h(page.Component, { params: typed })
      }
    },
  })

  let linkMatcher: NativePathMatcher | undefined

  return {
    path,
    component: Page,
    href: (...[params]: LinkArgs<Path>): string => {
      linkMatcher ??= createLinkMatcher(path)
      return linkPath(linkMatcher, params)
    },
  }
}
