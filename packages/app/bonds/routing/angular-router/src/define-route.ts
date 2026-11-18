import { computed, inject, type Signal, type Type } from '@angular/core'
import { toSignal } from '@angular/core/rxjs-interop'
import { ActivatedRoute, type Route } from '@angular/router'

import type { AngularRouteParams } from './types.js'

/**
 * Register a literal Angular Router path and the component that renders it.
 *
 * Create the route at module scope and add it to the routes passed to `provideRouter`.
 * Angular paths have no leading slash and no optional parameters. Inside the
 * component, call {@link injectRouteParams} with the same path to read the parameters.
 *
 * @param path - A route path, including any `:name` parameters.
 * @param component - The page component class.
 * @returns The path and component for Angular's route table.
 */
export function defineRoute<const Path extends string>(
  path: Path,
  component: Type<unknown>,
): Route & { path: Path } {
  return { path, component }
}

/**
 * Read the parameters a route path declares, as a signal that follows URL changes.
 *
 * Call it in a field initializer or constructor of the page component, where Angular's
 * injection context is active, and name the same path that `defineRoute` registered:
 * `params = injectRouteParams<'shelves/:shelf'>()`. Values are percent-decoded.
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
