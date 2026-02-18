/**
 * Angular version service for reactive version/update state.
 *
 * @module
 */
import { BehaviorSubject, distinctUntilChanged, map, type Observable } from 'rxjs'

import type { UpdateCheckOptions, VersionEvent, VersionState } from '@molecule/app-version'
import { getProvider } from '@molecule/app-version'

/**
 * Version service interface.
 */
export interface VersionService {
  state$: Observable<VersionState>
  isUpdateAvailable$: Observable<boolean>
  isChecking$: Observable<boolean>
  isServiceWorkerWaiting$: Observable<boolean>
  newVersion$: Observable<string | undefined>
  getState: () => VersionState
  checkForUpdates: () => Promise<boolean>
  applyUpdate: (options?: { force?: boolean }) => void
  dismissUpdate: () => void
  startPeriodicChecks: (options?: UpdateCheckOptions) => void
  stopPeriodicChecks: () => void
  destroy: () => void
}

const VERSION_EVENTS: VersionEvent[] = [
  'update-available',
  'service-worker-waiting',
  'service-worker-activated',
  'check-start',
  'check-complete',
  'check-error',
]

/**
 * Creates an Angular version service with reactive state.
 *
 *
 * @example
 * ```typescript
 * const version = createVersionService()
 *
 * version.isUpdateAvailable$.subscribe(available => {
 *   if (available) console.log('Update available!')
 * })
 *
 * await version.checkForUpdates()
 * ```
 * @returns The created instance.
 */
export const createVersionService = (): VersionService => {
  const provider = getProvider()
  const subject = new BehaviorSubject<VersionState>(provider.getState())
  const unsubscribers: (() => void)[] = []

  const onEvent = (): void => {
    subject.next(provider.getState())
  }

  for (const event of VERSION_EVENTS) {
    unsubscribers.push(provider.on(event, onEvent))
  }

  const state$ = subject.asObservable()

  return {
    state$,
    isUpdateAvailable$: state$.pipe(
      map((s) => s.isUpdateAvailable),
      distinctUntilChanged(),
    ),
    isChecking$: state$.pipe(
      map((s) => s.isChecking),
      distinctUntilChanged(),
    ),
    isServiceWorkerWaiting$: state$.pipe(
      map((s) => s.isServiceWorkerWaiting),
      distinctUntilChanged(),
    ),
    newVersion$: state$.pipe(
      map((s) => s.newVersion),
      distinctUntilChanged(),
    ),
    getState: () => provider.getState(),
    checkForUpdates: () => provider.checkForUpdates(),
    applyUpdate: (options?) => provider.applyUpdate(options),
    dismissUpdate: () => provider.dismissUpdate(),
    startPeriodicChecks: (options?) => provider.startPeriodicChecks(options),
    stopPeriodicChecks: () => provider.stopPeriodicChecks(),
    destroy: () => {
      for (const unsub of unsubscribers) {
        unsub()
      }
      subject.complete()
    },
  }
}
