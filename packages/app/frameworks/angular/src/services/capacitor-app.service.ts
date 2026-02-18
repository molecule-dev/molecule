/**
 * Angular Capacitor app service with reactive state.
 *
 * @module
 */
import { BehaviorSubject, distinctUntilChanged, map, type Observable } from 'rxjs'

import type { CapacitorAppOptions, CapacitorAppState } from '@molecule/app-platform'
import { createCapacitorApp } from '@molecule/app-platform'

/**
 * Capacitor app manager interface.
 */
export interface CapacitorAppManager {
  state$: Observable<CapacitorAppState>
  ready$: Observable<boolean>
  initialize: () => Promise<void>
  destroy: () => void
}

/**
 * Creates an Angular Capacitor app service with reactive state.
 *
 * Wraps `createCapacitorApp` from `@molecule/app-platform` and exposes
 * state changes as RxJS observables.
 *
 * @param options - Capacitor app configuration options
 * @returns Capacitor app manager with observables and action methods
 *
 * @example
 * ```typescript
 * const capacitorApp = createCapacitorAppState({
 *   pushNotifications: true,
 *   deepLinks: true,
 *   onDeepLink: (url) => router.navigate(url),
 * })
 *
 * capacitorApp.state$.subscribe(state => {
 *   console.log('App state:', state)
 * })
 *
 * capacitorApp.ready$.subscribe(ready => {
 *   if (ready) console.log('App is ready!')
 * })
 *
 * await capacitorApp.initialize()
 * ```
 */
export const createCapacitorAppState = (options?: CapacitorAppOptions): CapacitorAppManager => {
  const app = createCapacitorApp(options)
  const stateSubject = new BehaviorSubject<CapacitorAppState>(app.getState())

  const unsubscribe = app.subscribe((state) => {
    stateSubject.next(state)
  })

  return {
    state$: stateSubject.asObservable(),
    ready$: stateSubject.pipe(
      map((state) => state.ready),
      distinctUntilChanged(),
    ),
    initialize: () => app.initialize(),
    destroy: () => {
      unsubscribe()
      app.destroy()
      stateSubject.complete()
    },
  }
}
