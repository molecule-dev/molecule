import type { ReactNode } from 'react'
import { type Params, type PathParam, type RouteObject, useParams } from 'react-router'

/**
 * Register a literal React Router path and give its page the params that path declares.
 *
 * Create the route at module scope, then add it to the table passed to `useRoutes`
 * or spread it into a `Route`. The render callback returns a page element. Put that
 * page's hooks inside the page component. In nested routes, layout components
 * own the params declared on their own paths.
 *
 * @param path - A route path, including any named parameters.
 * @param render - Builds the page from the parameters named in that path.
 * @returns The path and element for React Router's route table.
 */
export function defineRoute<const Path extends string>(
  path: Path,
  render: (params: NoInfer<Params<PathParam<Path>>>) => ReactNode,
): Pick<RouteObject, 'element'> & { path: Path } {
  /**
   * Read the matched route from React Router.
   *
   * @returns The page with decoded route parameters.
   */
  function Page(): ReactNode {
    // React Router supplies string or undefined for every key. The path narrows
    // the callback's keys while useParams keeps the router's decoded values.
    return render(useParams() as Params<PathParam<Path>>)
  }

  return { path, element: <Page /> }
}
