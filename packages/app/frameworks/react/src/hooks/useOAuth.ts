/**
 * React hook for OAuth authentication.
 *
 * @module
 */

import { useCallback, useEffect, useMemo } from 'react'

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
 * Automatically handles OAuth callbacks by detecting `code` and `state`
 * URL parameters and exchanging them for a session.
 *
 * @param config - Optional OAuth configuration override.
 * @param config.baseURL - Base URL for the API server (e.g. "https://api.example.com").
 * @param config.oauthProviders - List of supported OAuth provider names (e.g. ["google", "github"]).
 * @param config.oauthEndpoint - Path prefix for OAuth routes (defaults to "/oauth").
 * @param config.loginEndpoint - Path for the OAuth login POST endpoint (defaults to "/users/log-in/oauth").
 * @param config.onSuccess - Callback after successful OAuth login.
 * @param config.onError - Callback on OAuth login failure.
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
  loginEndpoint?: string
  onSuccess?: () => void
  onError?: (error: string) => void
}): UseOAuthReturn {
  useAuthClient()

  const providers = useMemo(() => config?.oauthProviders ?? [], [config?.oauthProviders])
  const baseURL = config?.baseURL ?? ''
  const oauthEndpoint = config?.oauthEndpoint ?? '/oauth'
  const loginEndpoint = config?.loginEndpoint ?? '/users/log-in/oauth'

  const getOAuthUrl = useCallback(
    (provider: string): string => {
      return `${baseURL}${oauthEndpoint}/${provider}`
    },
    [baseURL, oauthEndpoint],
  )

  const redirect = useCallback(
    (provider: string): void => {
      // Store which provider initiated the flow for callback handling
      try {
        sessionStorage.setItem('oauth_provider', provider)
      } catch {
        /* SSR-safe */
      }
      window.location.href = getOAuthUrl(provider)
    },
    [getOAuthUrl],
  )

  // Handle OAuth callback — detect code + state in URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    const state = params.get('state')

    if (!code) return

    // Retrieve the provider that initiated the flow
    let provider: string | null = null
    try {
      provider = sessionStorage.getItem('oauth_provider')
    } catch {
      /* SSR-safe */
    }
    if (!provider) return

    // Clean up URL (remove code/state params) and sessionStorage
    const cleanUrl = new URL(window.location.href)
    cleanUrl.searchParams.delete('code')
    cleanUrl.searchParams.delete('state')
    window.history.replaceState({}, '', cleanUrl.toString())
    try {
      sessionStorage.removeItem('oauth_provider')
    } catch {
      /* SSR-safe */
    }

    // Exchange code for session
    const exchangeCode = async (): Promise<void> => {
      try {
        const response = await fetch(`${baseURL}${loginEndpoint}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include', // Send cookies (oauth_state) for state validation
          body: JSON.stringify({
            server: provider,
            code,
            state: state || undefined,
            redirect_uri: window.location.origin,
          }),
        })

        if (!response.ok) {
          const data = await response.json().catch(() => ({ error: 'OAuth login failed' }))
          config?.onError?.(data.error || 'OAuth login failed')
          return
        }

        await response.json()
        // Store the token from the response
        const authHeader =
          response.headers.get('authorization') || response.headers.get('set-authorization')
        if (authHeader) {
          const token = authHeader.replace('Bearer ', '')
          try {
            localStorage.setItem('molecule:auth:accessToken', token)
          } catch {
            /* SSR-safe */
          }
        }

        config?.onSuccess?.()
      } catch (err) {
        config?.onError?.(err instanceof Error ? err.message : 'OAuth login failed')
      }
    }

    exchangeCode()
  }, [baseURL, loginEndpoint, config])

  return {
    providers,
    getOAuthUrl,
    redirect,
  }
}
