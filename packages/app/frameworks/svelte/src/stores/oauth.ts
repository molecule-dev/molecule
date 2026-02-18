/**
 * Svelte OAuth helpers.
 *
 * @module
 */

import { type Readable, readable } from 'svelte/store'

/**
 * OAuth configuration options.
 */
export interface OAuthOptions {
  baseURL?: string
  oauthProviders?: string[]
  oauthEndpoint?: string
}

/**
 * OAuth helpers returned by {@link createOAuthHelpers}.
 */
export interface OAuthHelpers {
  providers: Readable<string[]>
  getOAuthUrl: (provider: string) => string
  redirect: (provider: string) => void
}

/**
 * Creates OAuth helpers for provider-based authentication flows.
 *
 * @param options - OAuth configuration including base URL, providers, and endpoint path.
 * @returns An object containing a readable providers store, URL builder, and redirect function.
 */
export function createOAuthHelpers(options?: OAuthOptions): OAuthHelpers {
  const baseURL = options?.baseURL ?? ''
  const oauthEndpoint = options?.oauthEndpoint ?? '/oauth'

  const providers = readable(options?.oauthProviders ?? [])

  const getOAuthUrl = (provider: string): string => {
    return `${baseURL}${oauthEndpoint}/${provider}`
  }

  const redirect = (provider: string): void => {
    window.location.href = getOAuthUrl(provider)
  }

  return {
    providers,
    getOAuthUrl,
    redirect,
  }
}
