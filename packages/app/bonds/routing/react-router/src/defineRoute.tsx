import type { ComponentType, ReactNode } from 'react'
import {
  generatePath,
  type Params,
  type PathParam,
  type RouteObject,
  useParams,
} from 'react-router'

type RequiredLinkKey<Path extends string> = Path extends `${infer Segment}/${infer Rest}`
  ? RequiredLinkKey<Segment> | RequiredLinkKey<Rest>
  : Path extends `:${string}?${string}`
    ? never
    : PathParam<Path>

type LinkParams<Path extends string> = Record<RequiredLinkKey<Path>, string> &
  Partial<Record<Exclude<PathParam<Path>, RequiredLinkKey<Path>>, string | null>>

type LinkArgs<Path extends string> = string extends Path
  ? [params?: Record<string, string | null | undefined>]
  : [PathParam<Path>] extends [never]
    ? []
    : [RequiredLinkKey<Path>] extends [never]
      ? [params?: LinkParams<Path>]
      : [params: LinkParams<Path>]

let encodesNamedParams: boolean | undefined
let encodesSplats: boolean | undefined

/**
 * Interpolate with React Router's own grammar. Older peers leave params unescaped.
 * @param path - The declared route path.
 * @param params - Bare parameter values from the caller.
 * @returns The interpolated route path.
 */
function linkPath(path: string, params?: Record<string, string | null | undefined>): string {
  if (!params) return generatePath(path)
  encodesNamedParams ??= generatePath('/:value', { value: '?' }) === '/%3F'
  encodesSplats ??= generatePath('/*', { '*': '?' }) === '/%3F'
  const encoded = Object.fromEntries(
    Object.entries(params).map(([key, value]) => {
      if (value == null) return [key, value]
      if (key === '*') {
        return [key, encodesSplats ? value : value.split('/').map(encodeURIComponent).join('/')]
      }
      return [key, encodesNamedParams ? value : encodeURIComponent(value)]
    }),
  )
  return generatePath(path, encoded)
}

/**
 * Register a literal React Router path and give its page the params that path declares.
 *
 * Create the route at module scope, then add it to the table passed to `useRoutes`
 * or spread it into a `Route`. Pass `{ Component: EditPage }` to give the page a
 * typed `params` prop automatically. A render callback can also supply app-owned
 * props, such as a view selected by a literal suffix. Keep page hooks inside the
 * page component. In nested routes, layout components own the params declared on
 * their own paths.
 *
 * Use the returned `href` for links and post-save navigation. It builds the
 * destination from the same path that mounts the page, with the parameter names
 * required by that path. Pass values from the saved response when identity can change.
 *
 * @param path - A route path, including any named parameters.
 * @param page - A component receiving `params`, or a function building the page element.
 * @returns The route table entry and a function that builds a link to it.
 */
export function defineRoute<const Path extends string>(
  path: Path,
  page:
    | ((params: NoInfer<Params<PathParam<Path>>>) => ReactNode)
    | { Component: ComponentType<{ params: NoInfer<Params<PathParam<Path>>> }> },
): Pick<RouteObject, 'element'> & { path: Path; href: (...args: LinkArgs<Path>) => string } {
  /**
   * Read the matched route from React Router.
   *
   * @returns The page with decoded route parameters.
   */
  function Page(): ReactNode {
    // React Router supplies string or undefined for every key. The path narrows
    // the callback's keys while useParams keeps the router's decoded values.
    const params = useParams() as Params<PathParam<Path>>
    if (typeof page === 'function') return page(params)
    const { Component } = page
    return <Component params={params} />
  }

  return {
    path,
    element: <Page />,
    href: (...[params]: LinkArgs<Path>) => linkPath(path, params),
  }
}
