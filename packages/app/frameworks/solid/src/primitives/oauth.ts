/**
 * Solid.js primitive for OAuth authentication.
 *
 * Builds provider initiation URLs, starts the full-page redirect flow, and
 * automatically handles the OAuth callback: when the page loads with a `code`
 * (+ optional `state`) URL parameter and a stashed provider, the code is
 * exchanged for a session via `POST {baseURL}{loginEndpoint}`.
 *
 * Session establishment prefers an auth client — an explicit
 * {@link CreateOAuthOptions.authClient} override, else the surrounding
 * `MoleculeProvider`'s client. Without any client, the code exchange itself
 * has already established the httpOnly-cookie session server-side, so a
 * user-carrying response still counts as a successful login.
 *
 * @module
 */

import type { Accessor } from 'solid-js'
import { getOwner, onMount } from 'solid-js'

import type { AuthClient } from '@molecule/app-auth'

import { getAuthClient } from '../context.js'

/**
 * OAuth configuration options.
 */
export interface CreateOAuthOptions {
  /** Base URL for the API server (e.g. `https://api.example.com`). */
  baseURL?: string
  /** List of supported OAuth provider names (e.g. `['github', 'google']`). */
  oauthProviders?: string[]
  /** Path prefix for OAuth initiation routes. Defaults to `/oauth`. */
  oauthEndpoint?: string
  /** Path for the OAuth login POST endpoint. Defaults to `/users/log-in/oauth`. */
  loginEndpoint?: string
  /** Called after a successful OAuth login (session established). */
  onSuccess?: () => void
  /** Called with a failure message when the OAuth login fails. */
  onError?: (error: string) => void
  /**
   * Auth client used to establish the session after the code exchange.
   * Overrides context resolution — when omitted, the client is resolved from
   * the surrounding `MoleculeProvider` (tolerated when absent; see the
   * cookie-session fallback documented on
   * {@link CreateOAuthReturn.handleCallback}).
   */
  authClient?: AuthClient<unknown>
}

/**
 * Return type for createOAuth primitive.
 */
export interface CreateOAuthReturn {
  /** Accessor for the configured OAuth provider names. */
  providers: Accessor<string[]>
  /** Builds the OAuth initiation URL for a provider. */
  getOAuthUrl: (provider: string) => string
  /** Starts the full-page redirect flow for a provider. */
  redirect: (provider: string) => void
  /**
   * Handles the OAuth callback: exchanges the `code` URL parameter for a
   * session. Invoked automatically at creation (see {@link createOAuth});
   * exposed for callers that need to re-run it manually. No-ops unless
   * running in a browser with a `code` URL parameter and a stashed provider.
   *
   * When an auth client is available (explicit option or context), the
   * session is established locally (`setAccessToken` + `setUser` +
   * `initialize`). When no client is available, the server has already
   * established the httpOnly-cookie session during the exchange, so a
   * user-carrying response still counts as success.
   */
  handleCallback: () => Promise<void>
}

/**
 * Creates OAuth helpers.
 *
 * Automatically handles OAuth callbacks by detecting `code` and `state` URL
 * parameters and exchanging them for a session:
 *   - Inside a Solid owner (component setup / `createRoot`), the callback
 *     handling is deferred to `onMount` so it runs client-side after mount.
 *   - Outside an owner (a plain function call, e.g. bootstrap code), it runs
 *     immediately at creation, browser-guarded.
 *
 * @param options - OAuth configuration
 *
 * @example
 * ```tsx
 * const { providers, getOAuthUrl, redirect } = createOAuth({
 *   baseURL: 'https://api.example.com',
 *   oauthProviders: ['github', 'google'],
 *   onSuccess: () => navigate('/dashboard'),
 *   onError: (error) => setErrorMessage(error),
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
  const loginEndpoint = options?.loginEndpoint ?? '/users/log-in/oauth'
  const providersList = options?.oauthProviders ?? []

  const providers: Accessor<string[]> = () => providersList

  // Resolve the auth client once at creation: an explicit override wins;
  // otherwise fall back to the surrounding MoleculeProvider context.
  let authClient: AuthClient<unknown> | null = options?.authClient ?? null
  if (!authClient) {
    try {
      authClient = getAuthClient()
    } catch (_error) {
      // Intentional noop: created outside a MoleculeProvider (or without auth
      // configured). The helper still works — handleCallback falls back to the
      // server-established httpOnly-cookie session (see its JSDoc).
      authClient = null
    }
  }

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
   * that lands the callback back on THIS page — the one with `createOAuth`
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

  /** Surface a failure message to the configured error callback. */
  const surfaceError = (error: string): void => {
    options?.onError?.(error)
  }

  /**
   * Establish the authenticated session from an exchange result: seed the
   * access token + user and let `initialize()` flip `authenticated`. Mirrors
   * what `authClient.login()` does for password login. Returns whether a user
   * was set (a result with no user is not a real session).
   */
  const establishSession = async (
    client: AuthClient<unknown>,
    token: string | null,
    user: unknown,
  ): Promise<boolean> => {
    // Seed the token via the auth client's configured token storage adapter
    // (in-memory by default) — NOT localStorage directly. Writing the bearer
    // token to localStorage violates the in-memory-default storage contract and
    // makes it JS-readable (XSS-exfiltratable).
    if (token) client.setAccessToken(token)
    if (user && typeof user === 'object') {
      client.setUser(user)
      await client.initialize()
      return true
    }
    return false
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
        credentials: 'include', // Send cookies (oauth_state) for state validation
        body: JSON.stringify({
          server: provider,
          code,
          state: state || undefined,
          redirect_uri: window.location.origin,
        }),
      })

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: unknown } | null
        surfaceError(
          data && typeof data.error === 'string' && data.error ? data.error : 'OAuth login failed',
        )
        return
      }

      const data: unknown = await response.json().catch(() => null)
      // Store the token from the response
      const authHeader =
        response.headers.get('authorization') || response.headers.get('set-authorization')
      const token = authHeader ? authHeader.replace('Bearer ', '') : null

      // The authenticated user is `props` (molecule resource convention) or `user`
      // (generic AuthResult). OAuth issues no refresh token, so we carry the token +
      // user to whoever will own the session.
      const user =
        data && typeof data === 'object'
          ? ((data as { props?: unknown; user?: unknown }).props ??
            (data as { props?: unknown; user?: unknown }).user ??
            null)
          : null

      if (authClient) {
        const ok = await establishSession(authClient, token, user)
        if (ok) options?.onSuccess?.()
        else surfaceError('OAuth login failed')
        return
      }

      // No auth client available: the server already established the
      // httpOnly-cookie session during the code exchange, so a user-carrying
      // response still counts as a successful login. A response with no user
      // means no session was established — surface the failure.
      if (user && typeof user === 'object') options?.onSuccess?.()
      else surfaceError('OAuth login failed')
    } catch (err) {
      surfaceError(err instanceof Error && err.message ? err.message : 'OAuth login failed')
    }
  }

  // Auto-handle the OAuth callback:
  //   - Inside a Solid owner (component setup / createRoot), defer to onMount
  //     so the exchange runs client-side after the component mounts.
  //   - Outside an owner (plain function call — e.g. bootstrap code), run
  //     immediately, browser-guarded. handleCallback itself no-ops unless the
  //     URL carries a `code` param and a provider was stashed.
  if (getOwner()) {
    onMount(() => {
      void handleCallback()
    })
  } else if (typeof window !== 'undefined') {
    void handleCallback()
  }

  return {
    providers,
    getOAuthUrl,
    redirect,
    handleCallback,
  }
}
