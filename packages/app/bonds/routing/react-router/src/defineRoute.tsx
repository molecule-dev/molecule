import type { ComponentType, ReactNode } from 'react'
import { type Params, type PathParam, type RouteObject, useParams } from 'react-router'

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
 * @param path - A route path, including any named parameters.
 * @param page - A component receiving `params`, or a function building the page element.
 * @returns The path and element for React Router's route table.
 */
export function defineRoute<const Path extends string>(
  path: Path,
  page:
    | ((params: NoInfer<Params<PathParam<Path>>>) => ReactNode)
    | { Component: ComponentType<{ params: NoInfer<Params<PathParam<Path>>> }> },
): Pick<RouteObject, 'element'> & { path: Path } {
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

  return { path, element: <Page /> }
}
