/**
 * `useConsumedSearchParam` over the Angular Router: a thin wrapper over
 * `@molecule/app-routing`'s `createConsumedSearchParam` and the bond's molecule router,
 * under React's hook name.
 *
 * @module
 */

import { afterNextRender, DestroyRef, inject } from '@angular/core'

import { createConsumedSearchParam } from '@molecule/app-routing'

import { useMoleculeRouter } from './hooks.js'

/**
 * Consume a credential query parameter into component state and remove only that
 * parameter from the address through the Angular Router. The value survives local
 * rerenders, failed-submit retries and later query-only navigation; a newly arriving
 * value on the same mounted route is consumed too. Path, hash, unrelated query values
 * and router location state are retained.
 *
 * The bond's router owns the URL replacement, so the Angular Router's location and
 * `window.location` agree. Its replace keeps the entry's app-owned state fields, including
 * ones Angular Router does not model: the bond reads every non-Angular key into the
 * location's state and carries it back on the replace (React Router drops those keys,
 * which is why React's hook re-adds them itself).
 *
 * Call it in an injection context (a component field initializer or constructor).
 *
 * @param name - The credential query key to consume, for example `token` or `code`.
 * @returns The consumed value and its setter, in the same tuple shape
 *   `@molecule/app-angular`'s `useConsumedSearchParam` returns: index 0 is the value
 *   (`''` before first consumption, kept current in place) and index 1 sets it.
 * @example
 * ```ts
 * @Component({ selector: 'app-reset', template: '<form></form>' })
 * export class ResetComponent {
 *   readonly token = useConsumedSearchParam('token')
 *   // Read token[0] where a value is used; token[1]('') clears it after a successful submit.
 * }
 * ```
 */
export function useConsumedSearchParam(name: string): readonly [string, (value: string) => void] {
  const router = useMoleculeRouter()
  const param = createConsumedSearchParam(router, name)
  // The tuple is the mounted result for this component's whole lifetime and its state
  // member is updated in place, exactly as `@molecule/app-angular`'s hook does (React
  // re-renders a new value into the same tuple, this port writes it into the same member).
  const tuple: [string, (value: string) => void] = [param.get(), (value) => param.set(value)]
  const stopFollowing = param.subscribe((value) => {
    tuple[0] = value
  })
  inject(DestroyRef).onDestroy(stopFollowing)
  // Like React's effect, the parameter is consumed once the component has rendered.
  let disconnect: (() => void) | null = null
  afterNextRender(() => {
    disconnect = param.connect()
  })
  inject(DestroyRef).onDestroy(() => {
    disconnect?.()
    disconnect = null
  })
  return tuple
}
