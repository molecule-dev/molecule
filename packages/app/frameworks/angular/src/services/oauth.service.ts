/**
 * Angular utility for OAuth authentication.
 *
 * @module
 */

import { BehaviorSubject, type Observable } from 'rxjs'

/**
 * OAuth configuration options.
 */
export interface OAuthOptions {
  baseURL?: string
  oauthProviders?: string[]
  oauthEndpoint?: string
}

/**
 * OAuth state manager.
 */
export interface OAuthStateManager {
  providers$: Observable<string[]>
  getProviders: () => string[]
  getOAuthUrl: (provider: string) => string
  redirect: (provider: string) => void
  destroy: () => void
}

/**
 * Creates an OAuth state manager.
 *
 * @param options - OAuth configuration
 *
 * @example
 * ```typescript
 * const oauthManager = createOAuthState({
 *   baseURL: 'https://api.example.com',
 *   oauthProviders: ['github', 'google'],
 * })
 *
 * oauthManager.providers$.subscribe(providers => {
 *   console.log(providers) // ['github', 'google']
 * })
 *
 * const url = oauthManager.getOAuthUrl('github')
 * ```
 * @returns The created instance.
 */
export function createOAuthState(options?: OAuthOptions): OAuthStateManager {
  const baseURL = options?.baseURL ?? ''
  const oauthEndpoint = options?.oauthEndpoint ?? '/oauth'
  const providersList = options?.oauthProviders ?? []

  const subject = new BehaviorSubject<string[]>(providersList)

  const getOAuthUrl = (provider: string): string => {
    return `${baseURL}${oauthEndpoint}/${provider}`
  }

  const redirect = (provider: string): void => {
    window.location.href = getOAuthUrl(provider)
  }

  return {
    providers$: subject.asObservable(),
    getProviders: () => providersList,
    getOAuthUrl,
    redirect,
    destroy: () => subject.complete(),
  }
}
