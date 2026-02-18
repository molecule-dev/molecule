/**
 * React hook for OAuth authentication.
 *
 * @module
 */

import { useCallback, useMemo } from 'react'

import { useAuthClient } from './useAuth.js'

/**
 * Return type for useOAuth hook.
 */
export interface UseOAuthReturn {
  providers: string[]
  getOAuthUrl: (provider: string) => string
  redirect: (provider: string) => void
}

/**
 * Hook for OAuth authentication.
 *
 * Reads OAuth configuration from the provided config and provides
 * helpers to build OAuth URLs and redirect to providers.
 *
 * @param config - Optional OAuth configuration override.
 * @param config.baseURL - Base URL for the API server (e.g. "https://api.example.com").
 * @param config.oauthProviders - List of supported OAuth provider names (e.g. ["google", "github"]).
 * @param config.oauthEndpoint - Path prefix for OAuth routes (defaults to "/oauth").
 *
 * @example
 * ```tsx
 * const { providers, redirect } = useOAuth()
 *
 * return (
 *   <div>
 *     {providers.map(provider => (
 *       <button key={provider} onClick={() => redirect(provider)}>
 *         Login with {provider}
 *       </button>
 *     ))}
 *   </div>
 * )
 * ```
 * @returns OAuth helpers: available providers list, getOAuthUrl builder, and redirect function.
 */
export function useOAuth(config?: {
  baseURL?: string
  oauthProviders?: string[]
  oauthEndpoint?: string
}): UseOAuthReturn {
  useAuthClient()

  const providers = useMemo(() => config?.oauthProviders ?? [], [config?.oauthProviders])
  const baseURL = config?.baseURL ?? ''
  const oauthEndpoint = config?.oauthEndpoint ?? '/oauth'

  const getOAuthUrl = useCallback(
    (provider: string): string => {
      return `${baseURL}${oauthEndpoint}/${provider}`
    },
    [baseURL, oauthEndpoint],
  )

  const redirect = useCallback(
    (provider: string): void => {
      window.location.href = getOAuthUrl(provider)
    },
    [getOAuthUrl],
  )

  return {
    providers,
    getOAuthUrl,
    redirect,
  }
}
