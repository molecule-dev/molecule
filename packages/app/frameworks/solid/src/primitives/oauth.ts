/**
 * Solid.js primitive for OAuth authentication.
 *
 * @module
 */

import type { Accessor } from 'solid-js'

/**
 * OAuth configuration options.
 */
export interface CreateOAuthOptions {
  baseURL?: string
  oauthProviders?: string[]
  oauthEndpoint?: string
}

/**
 * Return type for createOAuth primitive.
 */
export interface CreateOAuthReturn {
  providers: Accessor<string[]>
  getOAuthUrl: (provider: string) => string
  redirect: (provider: string) => void
}

/**
 * Creates OAuth helpers.
 *
 * @param options - OAuth configuration
 *
 * @example
 * ```tsx
 * const { providers, getOAuthUrl, redirect } = createOAuth({
 *   baseURL: 'https://api.example.com',
 *   oauthProviders: ['github', 'google'],
 * })
 *
 * return (
 *   <For each={providers()}>
 *     {(provider) => (
 *       <button onClick={() => redirect(provider)}>
 *         Login with {provider}
 *       </button>
 *     )}
 *   </For>
 * )
 * ```
 * @returns The created instance.
 */
export function createOAuth(options?: CreateOAuthOptions): CreateOAuthReturn {
  const baseURL = options?.baseURL ?? ''
  const oauthEndpoint = options?.oauthEndpoint ?? '/oauth'
  const providersList = options?.oauthProviders ?? []

  const providers: Accessor<string[]> = () => providersList

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
