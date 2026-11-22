/**
 * The hand-off the binding cases (`binding-router.test.ts`) make with the test app: the case
 * resets the record on `window` BEFORE kit starts (`startKit` resets the module registry, so
 * module state would not survive), and the root layout and the probe pages write what they
 * read into it.
 *
 * @module
 */

import type { RouteDefinition, RouteParams, Router } from '@molecule/app-routing'

/** What the params page read at one update. */
export interface ParamsReading {
  /** `useMoleculeRouter().getParams()`. */
  router: RouteParams
  /** `@molecule/app-svelte`'s `useParams()`. */
  binding: RouteParams
}

/** Everything the binding cases hand to the test app and read back. */
export interface BindingProbe {
  /** Whether the root layout renders the binding readers below its provider. */
  readers: boolean
  /** Each router `@molecule/app-svelte`'s `useRouterInstance()` returned to the readers. */
  bindingRouters: Router[]
  /** The routes the inner provider page passes its provider. */
  innerRoutes?: RouteDefinition[]
  /** Each router the inner provider passed to `onRouterReady`. */
  innerReady: Router[]
  /** What the params page read, one entry per update. */
  params: ParamsReading[]
  /** Each router `useMoleculeRouter()` returned on the shares page. */
  returned: Router[]
  /**
   * The last error kit's client `handleError` received (`src/hooks.client.ts`): kit hands a
   * `<svelte:boundary>` only the transformed `{ message }`.
   */
  clientError?: unknown
}

declare global {
  interface Window {
    /** The binding cases' record. */
    __moleculeBindingProbe?: BindingProbe
  }
}

/**
 * Starts a fresh record for the next started app.
 *
 * @param readers - Whether the root layout renders the binding readers.
 * @returns The record the app writes into.
 */
export const resetBindingProbe = (readers = false): BindingProbe => {
  window.__moleculeBindingProbe = {
    readers,
    bindingRouters: [],
    innerReady: [],
    params: [],
    returned: [],
  }
  return window.__moleculeBindingProbe
}

/**
 * The current record, started empty when no case reset one.
 *
 * @returns The record.
 */
export const bindingProbe = (): BindingProbe => window.__moleculeBindingProbe ?? resetBindingProbe()
