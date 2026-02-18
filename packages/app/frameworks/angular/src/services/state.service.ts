/**
 * Angular service for state management.
 *
 * @module
 */

import { Inject, Injectable, type OnDestroy } from '@angular/core'
import { BehaviorSubject, distinctUntilChanged, map, type Observable } from 'rxjs'

import type { StateProvider, Store } from '@molecule/app-state'

import { STATE_PROVIDER } from '../tokens.js'

/**
 * Angular service for state management.
 *
 * Wraps molecule state stores and exposes them as RxJS observables.
 *
 * @example
 * ```typescript
 * @Component({
 *   selector: 'app-counter',
 *   template: `
 *     <div>Count: {{ count$ | async }}</div>
 *     <button (click)="increment()">Increment</button>
 *   `
 * })
 * export class CounterComponent {
 *   count$ = this.stateService.select(counterStore, s => s.count)
 *
 *   constructor(private stateService: MoleculeStateService) {}
 *
 *   increment() {
 *     counterStore.setState(s => ({ count: s.count + 1 }))
 *   }
 * }
 * ```
 */
@Injectable({
  providedIn: 'root',
})
/**
 * Molecule State Service class.
 */
export class MoleculeStateService implements OnDestroy {
  private subscriptions = new Map<Store<unknown>, () => void>()
  private subjects = new Map<Store<unknown>, BehaviorSubject<unknown>>()

  constructor(@Inject(STATE_PROVIDER) private provider: StateProvider) {}

  /**
   * Get an observable of the full store state.
   *
   * @param store - The store to observe
   * @returns Observable of the store state
   */
  observe<T>(store: Store<T>): Observable<T> {
    return this.getOrCreateSubject(store).asObservable() as Observable<T>
  }

  /**
   * Select a piece of state from a store.
   *
   * @param store - The store to select from
   * @param selector - Selector function
   * @returns Observable of the selected state
   */
  select<T, S>(store: Store<T>, selector: (state: T) => S): Observable<S> {
    return this.observe(store).pipe(map(selector), distinctUntilChanged())
  }

  /**
   * Get the current snapshot of a store's state.
   *
   * @param store - The store
   * @returns The result.
   */
  snapshot<T>(store: Store<T>): T {
    return store.getState()
  }

  /**
   * Update a store's state.
   *
   * @param store - The store to update
   * @param partial - Partial state or updater function
   */
  update<T>(store: Store<T>, partial: Partial<T> | ((state: T) => Partial<T>)): void {
    store.setState(partial)
  }

  /**
   * Gets or creates a BehaviorSubject for the given store.
   * @param store - The data store to observe.
   * @returns The BehaviorSubject tracking the store state.
   */
  private getOrCreateSubject<T>(store: Store<T>): BehaviorSubject<T> {
    let subject = this.subjects.get(store as Store<unknown>) as BehaviorSubject<T> | undefined

    if (!subject) {
      subject = new BehaviorSubject<T>(store.getState())
      this.subjects.set(store as Store<unknown>, subject as BehaviorSubject<unknown>)

      const unsubscribe = store.subscribe(() => {
        subject!.next(store.getState())
      })
      this.subscriptions.set(store as Store<unknown>, unsubscribe)
    }

    return subject
  }

  /**
   * Cleans up all store subscriptions and completes subjects on service destruction.
   */
  ngOnDestroy(): void {
    // Clean up all subscriptions
    this.subscriptions.forEach((unsubscribe) => unsubscribe())
    this.subscriptions.clear()

    // Complete all subjects
    this.subjects.forEach((subject) => subject.complete())
    this.subjects.clear()
  }
}
