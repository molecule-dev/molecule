/**
 * Angular service for authentication.
 *
 * @module
 */

import { Inject, Injectable, type OnDestroy } from '@angular/core'
import { BehaviorSubject, distinctUntilChanged, map, type Observable } from 'rxjs'

import type {
  AuthClient,
  AuthResult,
  AuthState,
  LoginCredentials,
  RegisterData,
} from '@molecule/app-auth'

import { AUTH_CLIENT } from '../tokens.js'

/**
 * Angular service for authentication.
 *
 * Wraps molecule auth client and exposes state as RxJS observables.
 *
 * @example
 * ```typescript
 * @Component({
 *   selector: 'app-user-menu',
 *   template: `
 *     <div *ngIf="isAuthenticated$ | async">
 *       <span>{{ (user$ | async)?.name }}</span>
 *       <button (click)="logout()">Logout</button>
 *     </div>
 *   `
 * })
 * export class UserMenuComponent {
 *   user$ = this.authService.user$
 *   isAuthenticated$ = this.authService.isAuthenticated$
 *
 *   constructor(private authService: MoleculeAuthService) {}
 *
 *   logout() {
 *     this.authService.logout()
 *   }
 * }
 * ```
 */
@Injectable({
  providedIn: 'root',
})
export class MoleculeAuthService<T = unknown> implements OnDestroy {
  private stateSubject: BehaviorSubject<AuthState<T>>
  private unsubscribe: (() => void) | null = null

  /**
   * Observable of the full auth state.
   */
  state$: Observable<AuthState<T>>

  /**
   * Observable of the authenticated user.
   */
  user$: Observable<T | null>

  /**
   * Observable of authentication status.
   */
  isAuthenticated$: Observable<boolean>

  /**
   * Observable of loading status.
   */
  isLoading$: Observable<boolean>

  constructor(@Inject(AUTH_CLIENT) private client: AuthClient<T>) {
    this.stateSubject = new BehaviorSubject<AuthState<T>>(client.getState())

    this.unsubscribe = client.onAuthChange(() => {
      this.stateSubject.next(client.getState())
    })

    this.state$ = this.stateSubject.asObservable()

    this.user$ = this.state$.pipe(
      map((state) => state.user),
      distinctUntilChanged(),
    )

    this.isAuthenticated$ = this.state$.pipe(
      map((state) => state.authenticated),
      distinctUntilChanged(),
    )

    this.isLoading$ = this.state$.pipe(
      map((state) => state.loading),
      distinctUntilChanged(),
    )
  }

  /**
   * Get the current auth state snapshot.
   * @returns The current authentication state including user, loading, and authenticated flags.
   */
  get state(): AuthState<T> {
    return this.client.getState()
  }

  /**
   * Get the current user snapshot.
   * @returns The authenticated user object, or `null` if not authenticated.
   */
  get user(): T | null {
    return this.state.user
  }

  /**
   * Check if user is currently authenticated.
   * @returns `true` if the user is authenticated, `false` otherwise.
   */
  get isAuthenticated(): boolean {
    return this.state.authenticated
  }

  /**
   * Login with credentials.
   *
   * @param credentials - The email/password or provider-specific login credentials.
   * @returns A promise that resolves to the authentication result with user data and tokens.
   */
  login(credentials: LoginCredentials): Promise<AuthResult<T>> {
    return this.client.login(credentials)
  }

  /**
   * Logout the current user.
   * @returns A promise that resolves when the user has been logged out.
   */
  logout(): Promise<void> {
    return this.client.logout()
  }

  /**
   * Register a new user.
   *
   * @param data - The registration payload including email, password, and profile fields.
   * @returns A promise that resolves to the authentication result for the newly registered user.
   */
  register(data: RegisterData): Promise<AuthResult<T>> {
    return this.client.register(data)
  }

  /**
   * Refresh the authentication token.
   * @returns A promise that resolves to the authentication result with refreshed tokens.
   */
  refresh(): Promise<AuthResult<T>> {
    return this.client.refresh()
  }

  /**
   * Clean up auth state subscription on service destruction.
   */
  ngOnDestroy(): void {
    this.unsubscribe?.()
    this.stateSubject.complete()
  }
}
