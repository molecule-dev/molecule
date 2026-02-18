/**
 * Angular service for HTTP requests.
 *
 * @module
 */

import { Inject, Injectable } from '@angular/core'
import { BehaviorSubject, from, type Observable } from 'rxjs'
import { catchError, map, tap } from 'rxjs/operators'

import type { HttpClient, HttpResponse, RequestConfig } from '@molecule/app-http'

import { HTTP_CLIENT } from '../tokens.js'

/**
 * State for HTTP requests.
 */
export interface HttpState<T> {
  data: T | null
  loading: boolean
  error: Error | null
}

/**
 * Angular service for HTTP requests.
 *
 * Wraps molecule HTTP client and returns RxJS observables.
 *
 * @example
 * ```typescript
 * @Component({
 *   selector: 'app-users',
 *   template: `
 *     <div *ngIf="loading$ | async">Loading...</div>
 *     <div *ngIf="error$ | async as error">Error: {{ error.message }}</div>
 *     <ul *ngIf="users$ | async as users">
 *       <li *ngFor="let user of users">{{ user.name }}</li>
 *     </ul>
 *   `
 * })
 * export class UsersComponent implements OnInit {
 *   users$ = this.httpService.get<User[]>('/api/users')
 *
 *   // Or with state management:
 *   private state = this.httpService.createState<User[]>()
 *   loading$ = this.state.pipe(map(s => s.loading))
 *   error$ = this.state.pipe(map(s => s.error))
 *   users$ = this.state.pipe(map(s => s.data))
 *
 *   constructor(private httpService: MoleculeHttpService) {}
 *
 *   ngOnInit() {
 *     this.httpService.getWithState('/api/users', this.state)
 *   }
 * }
 * ```
 */
@Injectable({
  providedIn: 'root',
})
/**
 * Molecule Http Service class.
 */
export class MoleculeHttpService {
  constructor(@Inject(HTTP_CLIENT) private client: HttpClient) {}

  /**
   * Make a GET request.
   *
   * @param url - Request URL
   * @param config - Request configuration
   * @returns Observable of response data
   */
  get<T>(url: string, config?: RequestConfig): Observable<T> {
    return from(this.client.get<T>(url, config)).pipe(map((res) => res.data))
  }

  /**
   * Make a POST request.
   *
   * @param url - Request URL
   * @param data - Request body
   * @param config - Request configuration
   * @returns Observable of response data
   */
  post<T>(url: string, data?: unknown, config?: RequestConfig): Observable<T> {
    return from(this.client.post<T>(url, data, config)).pipe(map((res) => res.data))
  }

  /**
   * Make a PUT request.
   *
   * @param url - Request URL
   * @param data - Request body
   * @param config - Request configuration
   * @returns Observable of response data
   */
  put<T>(url: string, data?: unknown, config?: RequestConfig): Observable<T> {
    return from(this.client.put<T>(url, data, config)).pipe(map((res) => res.data))
  }

  /**
   * Make a PATCH request.
   *
   * @param url - Request URL
   * @param data - Request body
   * @param config - Request configuration
   * @returns Observable of response data
   */
  patch<T>(url: string, data?: unknown, config?: RequestConfig): Observable<T> {
    return from(this.client.patch<T>(url, data, config)).pipe(map((res) => res.data))
  }

  /**
   * Make a DELETE request.
   *
   * @param url - Request URL
   * @param config - Request configuration
   * @returns Observable of response data
   */
  delete<T>(url: string, config?: RequestConfig): Observable<T> {
    return from(this.client.delete<T>(url, config)).pipe(map((res) => res.data))
  }

  /**
   * Get the full response (including headers, status, etc.).
   *
   * @param method - HTTP method
   * @param url - Request URL
   * @param config - Request configuration
   * @returns Observable of full response
   */
  request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    url: string,
    config?: RequestConfig,
  ): Observable<HttpResponse<T>> {
    const promise = (async () => {
      switch (method) {
        case 'GET':
          return this.client.get<T>(url, config)
        case 'POST':
          return this.client.post<T>(
            url,
            (config as RequestConfig & { data?: unknown })?.data,
            config,
          )
        case 'PUT':
          return this.client.put<T>(
            url,
            (config as RequestConfig & { data?: unknown })?.data,
            config,
          )
        case 'PATCH':
          return this.client.patch<T>(
            url,
            (config as RequestConfig & { data?: unknown })?.data,
            config,
          )
        case 'DELETE':
          return this.client.delete<T>(url, config)
      }
    })()

    return from(promise)
  }

  /**
   * Create a state subject for managing request state.
   *
   * @returns The created instance.
   */
  createState<T>(): BehaviorSubject<HttpState<T>> {
    return new BehaviorSubject<HttpState<T>>({
      data: null,
      loading: false,
      error: null,
    })
  }

  /**
   * Make a GET request with state management.
   *
   * @param url - Request URL
   * @param state - State subject to update
   * @param config - Request configuration
   */
  getWithState<T>(url: string, state: BehaviorSubject<HttpState<T>>, config?: RequestConfig): void {
    state.next({ ...state.value, loading: true, error: null })

    this.get<T>(url, config)
      .pipe(
        tap((data) => state.next({ data, loading: false, error: null })),
        catchError((error) => {
          state.next({ data: null, loading: false, error })
          throw error
        }),
      )
      .subscribe()
  }
}
