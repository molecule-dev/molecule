/**
 * Angular service for storage.
 *
 * @module
 */

import { Inject, Injectable } from '@angular/core'
import { BehaviorSubject, from, type Observable } from 'rxjs'

import type { StorageProvider } from '@molecule/app-storage'

import { STORAGE_PROVIDER } from '../tokens.js'

/**
 * State for a storage value.
 */
export interface StorageValueState<T> {
  value: T | undefined
  loading: boolean
  error: Error | null
}

/**
 * Angular service for storage.
 *
 * Wraps molecule storage provider and returns RxJS observables.
 *
 * @example
 * ```typescript
 * @Component({
 *   selector: 'app-settings',
 *   template: `
 *     <div *ngIf="themeState$ | async as state">
 *       <select
 *         [value]="state.value"
 *         (change)="setTheme($event.target.value)"
 *         [disabled]="state.loading"
 *       >
 *         <option value="light">Light</option>
 *         <option value="dark">Dark</option>
 *       </select>
 *     </div>
 *   `
 * })
 * export class SettingsComponent implements OnInit {
 *   themeState$ = new BehaviorSubject<StorageValueState<string>>({
 *     value: 'light',
 *     loading: true,
 *     error: null
 *   })
 *
 *   constructor(private storageService: MoleculeStorageService) {}
 *
 *   ngOnInit() {
 *     this.storageService.get<string>('theme').subscribe(value => {
 *       this.themeState$.next({ value: value ?? 'light', loading: false, error: null })
 *     })
 *   }
 *
 *   setTheme(theme: string) {
 *     this.storageService.set('theme', theme).subscribe()
 *   }
 * }
 * ```
 */
@Injectable({
  providedIn: 'root',
})
/**
 * Molecule Storage Service class.
 */
export class MoleculeStorageService {
  constructor(@Inject(STORAGE_PROVIDER) private provider: StorageProvider) {}

  /**
   * Get a value from storage.
   *
   * @param key - Storage key
   * @returns Observable of the value
   */
  get<T>(key: string): Observable<T | null> {
    return from(this.provider.get<T>(key))
  }

  /**
   * Set a value in storage.
   *
   * @param key - Storage key
   * @param value - Value to store
   * @returns Observable that completes when done
   */
  set<T>(key: string, value: T): Observable<void> {
    return from(this.provider.set(key, value))
  }

  /**
   * Remove a value from storage.
   *
   * @param key - Storage key
   * @returns Observable that completes when done
   */
  remove(key: string): Observable<void> {
    return from(this.provider.remove(key))
  }

  /**
   * Clear all values from storage.
   *
   * @returns Observable that completes when done
   */
  clear(): Observable<void> {
    return from(this.provider.clear())
  }

  /**
   * Get all keys in storage.
   *
   * @returns Observable of key array
   */
  keys(): Observable<string[]> {
    return from(this.provider.keys())
  }

  /**
   * Create a reactive storage value with auto-loading.
   *
   * @param key - Storage key
   * @param defaultValue - Default value if not found
   * @returns BehaviorSubject that syncs with storage
   */
  createValue<T>(key: string, defaultValue: T): BehaviorSubject<StorageValueState<T>> {
    const state = new BehaviorSubject<StorageValueState<T>>({
      value: defaultValue,
      loading: true,
      error: null,
    })

    // Load initial value
    this.get<T>(key).subscribe({
      next: (value) => {
        state.next({
          value: value ?? defaultValue,
          loading: false,
          error: null,
        })
      },
      error: (error) => {
        state.next({
          value: defaultValue,
          loading: false,
          error,
        })
      },
    })

    return state
  }

  /**
   * Update a reactive storage value.
   *
   * @param key - Storage key
   * @param value - New value
   * @param state - State subject to update
   */
  updateValue<T>(key: string, value: T, state: BehaviorSubject<StorageValueState<T>>): void {
    state.next({ ...state.value, loading: true })

    this.set(key, value).subscribe({
      next: () => {
        state.next({ value, loading: false, error: null })
      },
      error: (error) => {
        state.next({ ...state.value, loading: false, error })
      },
    })
  }
}
