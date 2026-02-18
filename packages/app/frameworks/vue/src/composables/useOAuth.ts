/**
 * Vue composable for OAuth authentication.
 *
 * @module
 */

import { computed, type ComputedRef } from 'vue'

/**
 * OAuth configuration options.
 */
export interface UseOAuthOptions {
  baseURL?: string
  oauthProviders?: string[]
  oauthEndpoint?: string
}

/**
 * Return type for the {@link useOAuth} composable.
 */
export interface UseOAuthReturn {
  providers: ComputedRef<string[]>
  getOAuthUrl: (provider: string) => string
  redirect: (provider: string) => void
}

/**
 * Composable for OAuth authentication.
 *
 * @param options - OAuth configuration (base URL, providers, endpoint path).
 * @returns Available providers, a URL builder, and a redirect method for OAuth flows.
 */
export function useOAuth(options?: UseOAuthOptions): UseOAuthReturn {
  const baseURL = options?.baseURL ?? ''
  const oauthEndpoint = options?.oauthEndpoint ?? '/oauth'

  const providers = computed(() => options?.oauthProviders ?? [])

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
