import { type RouteDefinition as SolidRouteDefinition, useParams } from '@solidjs/router'
import type { JSX } from 'solid-js'

import type { SolidRouteParams } from './types.js'

/**
 * Decode one URL segment, leaving it as written when it is not valid percent-encoding.
 *
 * @param value - A parameter value as Solid Router matched it.
 * @returns The decoded text.
 */
function decodeParam(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch (_error) {
    // Not valid percent-encoding: the text is already what the URL meant.
    return value
  }
}

/**
 * Register a literal Solid Router path and give its page the params that path declares.
 *
 * Create the route at module scope and pass it to a router's `children` or `routes`.
 * The render callback runs once when the page mounts and returns its JSX. Read
 * params inside JSX or an effect so the page follows URL changes. The params object
 * is Solid's reactive one, so reading it outside a tracking scope does not update.
 * Values arrive percent-decoded, as they do in the other routing bonds, although
 * Solid Router itself hands out the raw URL text.
 *
 * @param path - A route path, including any named parameters.
 * @param render - Builds the page from the parameters named in that path.
 * @returns The path and component for Solid Router's route table.
 */
export function defineRoute<const Path extends string>(
  path: Path,
  render: (params: NoInfer<SolidRouteParams<Path>>) => JSX.Element,
): SolidRouteDefinition<Path> & { path: Path } {
  /**
   * Read the matched route from Solid Router.
   *
   * @returns The page with decoded route parameters.
   */
  function Page(): JSX.Element {
    const raw = useParams()
    // Solid Router supplies string or undefined for every key. The path narrows
    // the callback's keys while the proxy keeps the router's reactive values.
    const decoded = new Proxy(raw, {
      get: (target, key) => {
        const value = typeof key === 'string' ? target[key] : undefined
        return value === undefined ? undefined : decodeParam(value)
      },
    })
    return render(decoded as SolidRouteParams<Path>)
  }

  return { path, component: Page }
}
