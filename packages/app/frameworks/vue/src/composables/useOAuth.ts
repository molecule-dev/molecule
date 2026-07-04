/**
 * Vue composable for OAuth authentication.
 *
 * Provides helpers to build OAuth URLs and start a login via a full-page
 * redirect, and automatically handles the OAuth callback by detecting `code`
 * and `state` URL parameters and exchanging them for a session (when used
 * inside a component; see {@link UseOAuthReturn.handleCallback} for manual use).
 *
 * @module
 */

import { computed, type ComputedRef, getCurrentInstance, inject, onMounted } from 'vue'

import type { AuthClient } from '@molecule/app-auth'

import { AuthKey } from '../injection-keys.js'

/**
 * OAuth configuration options.
 */
export interface UseOAuthOptions {
  /** Base URL for the API server (e.g. `https://api.example.com`). */
  baseURL?: string
  /** List of supported OAuth provider names (e.g. `['google', 'github']`). */
  oauthProviders?: string[]
  /** Path prefix for OAuth initiation routes. Defaults to `/oauth`. */
  oauthEndpoint?: string
  /** Path for the OAuth login POST endpoint. Defaults to `/users/log-in/oauth`. */
  loginEndpoint?: string
  /** Callback fired after a successful OAuth login. */
  onSuccess?: () => void
  /** Callback fired with an error message when the OAuth login fails. */
  onError?: (error: string) => void
  /**
   * Explicit auth client used to establish the session after the callback
   * exchange. Defaults to the injected client ({@link AuthKey}) when the
   * composable runs during component setup — pass one explicitly for
   * callers/tests outside an auth provider.
   */
  authClient?: AuthClient<unknown>
}

/**
 * Return type for the {@link useOAuth} composable.
 */
export interface UseOAuthReturn {
  /** Available OAuth provider names. */
  providers: ComputedRef<string[]>
  /** Builds the OAuth initiation URL for a provider. */
  getOAuthUrl: (provider: string) => string
  /** Full-page redirect to the provider's OAuth initiation endpoint. */
  redirect: (provider: string) => void
  /**
   * Handles an OAuth callback: when the current URL carries a `code` param and
   * a provider was stashed by {@link redirect}, exchanges the code for a
   * session. A guarded no-op otherwise. Runs automatically on mount when the
   * composable is used inside a component; exposed for manual invocation
   * outside components (e.g. tests or custom callback screens).
   */
  handleCallback: () => Promise<void>
}

/**
 * Composable for OAuth authentication.
 *
 * Reads OAuth configuration from the provided options and provides helpers to
 * build OAuth URLs and start a login. When used inside a component, it
 * automatically handles OAuth callbacks on mount by detecting `code` and
 * `state` URL parameters and exchanging them for a session.
 *
 * Session establishment: the exchange result is applied to the resolved auth
 * client (an explicit `options.authClient`, else the injected {@link AuthKey}
 * client when running during component setup). When NO client is available,
 * the server has already established the httpOnly-cookie session via the
 * exchange, so a user-carrying response still counts as success —
 * `options.onSuccess` fires; a response with no user fires `options.onError`.
 *
 * @param options - OAuth configuration (base URL, providers, endpoint paths, callbacks, auth client).
 * @returns Available providers, a URL builder, a redirect method, and a callback handler.
 */
export function useOAuth(options?: UseOAuthOptions): UseOAuthReturn {
  const baseURL = options?.baseURL ?? ''
  const oauthEndpoint = options?.oauthEndpoint ?? '/oauth'
  const loginEndpoint = options?.loginEndpoint ?? '/users/log-in/oauth'

  // Resolve the auth client AT CREATION TIME — `inject` only works during
  // component setup, never inside the async callback. An explicit
  // `options.authClient` wins; the `getCurrentInstance()` guard keeps the
  // composable callable outside components (where injection is unavailable).
  const injectedClient = getCurrentInstance() ? inject(AuthKey, null) : null
  const authClient: AuthClient<unknown> | null = options?.authClient ?? injectedClient

  const providers = computed(() => options?.oauthProviders ?? [])

  const getOAuthUrl = (provider: string): string => {
    // Encode the provider as a single path segment so a (future) caller passing an
    // untrusted value can never inject a path/query/scheme into the opened URL —
    // defense-in-depth on top of the upstream static provider allowlist. Plain
    // provider names ('github', 'google') pass through unchanged.
    return `${baseURL}${oauthEndpoint}/${encodeURIComponent(provider)}`
  }

  /** Stash which provider initiated the flow so the callback knows it's ours. */
  const stashProvider = (provider: string): void => {
    try {
      sessionStorage.setItem('oauth_provider', provider)
    } catch (_error) {
      /* SSR-safe — sessionStorage is unavailable in SSR/sandboxed environments */
    }
  }

  /**
   * Append the current page's PATH as `redirect_to` so the api's initiation
   * endpoint (`GET /users/oauth/:provider`) builds a provider `redirect_uri`
   * that lands the callback back on THIS page — the one with `useOAuth`
   * mounted (e.g. `/login`) — instead of the app root, where nothing may be
   * listening for the `code` param. Path only (no origin/query): the server
   * validates it as a same-origin absolute path, so it can never become an
   * open redirect. Servers that predate the param simply ignore it.
   */
  const withReturnPath = (url: string): string => {
    const path = typeof window !== 'undefined' ? window.location.pathname : ''
    if (!path || path === '/') return url
    return `${url}${url.includes('?') ? '&' : '?'}redirect_to=${encodeURIComponent(path)}`
  }

  const redirect = (provider: string): void => {
    stashProvider(provider)
    window.location.href = withReturnPath(getOAuthUrl(provider))
  }

  const handleCallback = async (): Promise<void> => {
    if (typeof window === 'undefined') return

    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    const state = params.get('state')

    if (!code) return

    // Retrieve the provider that initiated the flow
    let provider: string | null = null
    try {
      provider = sessionStorage.getItem('oauth_provider')
    } catch (_error) {
      /* SSR-safe — sessionStorage is unavailable in SSR/sandboxed environments */
    }
    if (!provider) return

    // Clean up URL (remove code/state params) and sessionStorage
    const cleanUrl = new URL(window.location.href)
    cleanUrl.searchParams.delete('code')
    cleanUrl.searchParams.delete('state')
    window.history.replaceState({}, '', cleanUrl.toString())
    try {
      sessionStorage.removeItem('oauth_provider')
    } catch (_error) {
      /* SSR-safe — sessionStorage is unavailable in SSR/sandboxed environments */
    }

    // Exchange code for session
    try {
      const response = await fetch(`${baseURL}${loginEndpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Send cookies (oauth_state/oauth_verifier) for state validation
        body: JSON.stringify({
          server: provider,
          code,
          state: state || undefined,
          redirect_uri: window.location.origin,
        }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: 'OAuth login failed' }))
        options?.onError?.(data.error || 'OAuth login failed')
        return
      }

      const data: unknown = await response.json().catch(() => null)
      // Store the token from the response
      const authHeader =
        response.headers.get('authorization') || response.headers.get('set-authorization')
      const token = authHeader ? authHeader.replace('Bearer ', '') : null

      // The authenticated user is `props` (molecule resource convention) or `user`
      // (generic AuthResult).
      const user =
        data && typeof data === 'object'
          ? ((data as { props?: unknown; user?: unknown }).props ??
            (data as { props?: unknown; user?: unknown }).user ??
            null)
          : null

      if (authClient) {
        // Seed the token + user via the auth client and let `initialize()` flip
        // `authenticated` — mirrors what `authClient.login()` does for password
        // login. A result with no user is not a real session.
        if (token) authClient.setAccessToken(token)
        if (user && typeof user === 'object') {
          authClient.setUser(user)
          await authClient.initialize()
          options?.onSuccess?.()
        } else {
          options?.onError?.('OAuth login failed')
        }
      } else if (user && typeof user === 'object') {
        // No auth client available: the server has already established the
        // httpOnly-cookie session via the exchange, so a user-carrying response
        // still counts as success.
        options?.onSuccess?.()
      } else {
        options?.onError?.('OAuth login failed')
      }
    } catch (err) {
      options?.onError?.(err instanceof Error && err.message ? err.message : 'OAuth login failed')
    }
  }

  // Auto-handle the OAuth callback when used inside a component. The
  // `getCurrentInstance()` guard keeps the composable callable outside
  // components (e.g. tests), where `handleCallback` can be invoked manually.
  if (getCurrentInstance()) {
    onMounted(() => {
      void handleCallback()
    })
  }

  return {
    providers,
    getOAuthUrl,
    redirect,
    handleCallback,
  }
}
