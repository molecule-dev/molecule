/**
 * OAuth authentication, under React's hook name.
 *
 * Supports two initiation modes that share ONE callback path: `redirect` (the
 * full-page redirect, the default) and `loginViaPopup` (opens the provider in
 * a popup so the opener page never navigates; on completion the popup relays
 * the result to the opener via a STRICTLY-validated `postMessage` and closes
 * itself; the opener establishes the session in place).
 *
 * Unmounting does not cancel a flow that has started. A popup result or a
 * callback exchange that settles afterwards still establishes the session on
 * the shared auth client, because the user did sign in. `onSuccess` and
 * `onError` are not called after unmount: they belong to the unmounted view.
 *
 * @module
 */

import { onCleanup, onMount } from 'solid-js'

import { t } from '@molecule/app-i18n'

import { useAuthClient } from './auth.js'

/** What `onError` gets when the server gives no reason of its own. */
const oauthFailed = (): string =>
  t('solid.error.oauthFailed', undefined, { defaultValue: 'OAuth login failed' })

/** `window.open` name for the OAuth popup. */
const OAUTH_POPUP_WINDOW_NAME = 'molecule-oauth-popup'

/** Private `postMessage` type for the popup→opener result relay. */
const OAUTH_RESULT_MESSAGE_TYPE = 'molecule:oauth-result'

/** Hard cap on how long the opener waits for the popup before giving up. */
const OAUTH_POPUP_TIMEOUT_MS = 5 * 60 * 1000

/** Shape of the result the popup relays to the opener. */
interface OAuthRelayMessage {
  type: typeof OAUTH_RESULT_MESSAGE_TYPE
  ok: boolean
  token?: string | null
  user?: unknown
  error?: string
}

/** What {@link useOAuth} returns (the same names React returns). */
export interface UseOAuthReturn {
  providers: string[]
  getOAuthUrl: (provider: string) => string
  /** Full-page redirect to the provider (default). The opener page navigates away. */
  redirect: (provider: string) => void
  /**
   * Open the provider in a popup so the opener page does NOT navigate; falls
   * back to a full-page redirect when the popup is blocked.
   */
  loginViaPopup: (provider: string) => void
}

/** Configuration override for {@link useOAuth}. */
export interface UseOAuthConfig {
  /** Base URL for the API server (e.g. "https://api.example.com"). */
  baseURL?: string
  /** List of supported OAuth provider names (e.g. ["google", "github"]). */
  oauthProviders?: string[]
  /** Path prefix for OAuth routes (defaults to "/oauth"). */
  oauthEndpoint?: string
  /** Path for the OAuth login POST endpoint (defaults to "/users/log-in/oauth"). */
  loginEndpoint?: string
  /** Callback after successful OAuth login. */
  onSuccess?: () => void
  /** Callback on OAuth login failure. */
  onError?: (error: string) => void
  /** How the page leaves for the provider; defaults to a full-page navigation. */
  navigate?: (url: string) => void
}

/**
 * OAuth authentication helpers, under React's hook name: builds the provider
 * URLs, starts a login (full-page or popup), and automatically handles OAuth
 * callbacks by detecting `code` and `state` URL parameters and exchanging them
 * for a session — relaying to the opener when running inside a popup we
 * opened.
 *
 * @param config - Optional OAuth configuration override.
 * @returns providers, getOAuthUrl, redirect, and loginViaPopup.
 * @throws {Error} When no `MoleculeProvider` above configures `auth`.
 */
export function useOAuth(config?: UseOAuthConfig): UseOAuthReturn {
  const authClient = useAuthClient()

  // Whether the component is mounted, read when a flow settles.
  let mounted = false
  onMount(() => {
    mounted = true
  })
  onCleanup(() => {
    mounted = false
  })

  const providers = config?.oauthProviders ?? []
  const baseURL = config?.baseURL ?? ''
  const oauthEndpoint = config?.oauthEndpoint ?? '/oauth'
  const loginEndpoint = config?.loginEndpoint ?? '/users/log-in/oauth'

  const getOAuthUrl = (provider: string): string => {
    // Encode the provider as a single path segment so an untrusted value can
    // never inject a path/query/scheme into the opened URL.
    return `${baseURL}${oauthEndpoint}/${encodeURIComponent(provider)}`
  }

  /** Stash which provider initiated the flow so the callback knows it's ours. */
  const stashProvider = (provider: string): void => {
    try {
      sessionStorage.setItem('oauth_provider', provider)
    } catch (_error) {
      // SSR-safe — sessionStorage is unavailable in SSR/sandboxed environments.
    }
  }

  /**
   * Append the current page's PATH as `redirect_to` so the api's initiation
   * endpoint lands the callback back on THIS page. Path only (no origin/query):
   * the server validates it as a same-origin absolute path.
   */
  const withReturnPath = (url: string): string => {
    const path = typeof window !== 'undefined' ? window.location.pathname : ''
    if (!path || path === '/') return url
    return `${url}${url.includes('?') ? '&' : '?'}redirect_to=${encodeURIComponent(path)}`
  }

  /**
   * Establish the authenticated session from an exchange result: seed the
   * access token + user and let `initialize()` flip `authenticated`.
   */
  const establishSession = async (
    token: string | null | undefined,
    user: unknown,
  ): Promise<boolean> => {
    // Seed the token via the auth client's configured token storage adapter
    // (in-memory by default) — NOT localStorage directly.
    if (token) authClient.setAccessToken(token)
    if (user && typeof user === 'object') {
      authClient.setUser(user)
      await authClient.initialize()
      return true
    }
    return false
  }

  const navigateOption = config?.navigate
  /** Leaves the page for the provider: the `navigate` option, else a full-page navigation. */
  const leaveFor = (url: string): void => {
    if (navigateOption) navigateOption(url)
    else window.location.href = url
  }

  const redirect = (provider: string): void => {
    stashProvider(provider)
    leaveFor(withReturnPath(getOAuthUrl(provider)))
  }

  // The currently-open OAuth popup, so a second click focuses it instead of
  // stacking a second flow.
  let activePopup: Window | null = null

  const loginViaPopup = (provider: string): void => {
    // A flow is already open — focus it rather than starting another.
    if (activePopup && !activePopup.closed) {
      try {
        activePopup.focus()
      } catch (_error) {
        // best-effort focus
      }
      return
    }
    stashProvider(provider)
    const url = withReturnPath(getOAuthUrl(provider))

    // A named popup; the popup needs `window.opener` to relay its result back.
    const features = 'popup=yes,width=520,height=680,menubar=no,toolbar=no,location=yes'
    const popup = window.open(url, OAUTH_POPUP_WINDOW_NAME, features)

    // Popup blocked (or unavailable) → fall back to a full-page redirect.
    if (!popup) {
      leaveFor(url)
      return
    }
    activePopup = popup

    let settled = false
    let closedTimer: ReturnType<typeof setInterval> | null = null
    let timeoutTimer: ReturnType<typeof setTimeout> | null = null

    const cleanup = (): void => {
      window.removeEventListener('message', onMessage)
      if (closedTimer !== null) clearInterval(closedTimer)
      if (timeoutTimer !== null) clearTimeout(timeoutTimer)
      if (activePopup === popup) activePopup = null
    }

    const onMessage = (event: MessageEvent): void => {
      // Accept the result ONLY from our own origin, ONLY from the exact popup
      // window we opened, and ONLY when it carries our private type.
      if (event.origin !== window.location.origin) return
      if (event.source !== popup) return
      const data = event.data as OAuthRelayMessage | null
      if (!data || typeof data !== 'object' || data.type !== OAUTH_RESULT_MESSAGE_TYPE) return
      if (settled) return
      settled = true
      cleanup()
      try {
        popup.close()
      } catch (_error) {
        // already closed — nothing to do
      }
      if (data.ok) {
        void establishSession(data.token, data.user).then((ok) => {
          if (!mounted) return
          if (ok) config?.onSuccess?.()
          else config?.onError?.(oauthFailed())
        })
      } else if (mounted) {
        config?.onError?.(typeof data.error === 'string' ? data.error : oauthFailed())
      }
    }

    window.addEventListener('message', onMessage)

    // The user closed the popup without completing — silently stop waiting.
    closedTimer = setInterval(() => {
      if (popup.closed && !settled) {
        settled = true
        cleanup()
      }
    }, 500)

    // Hard safety timeout so a wedged popup never leaks a listener forever.
    timeoutTimer = setTimeout(() => {
      if (!settled) {
        settled = true
        cleanup()
        try {
          popup.close()
        } catch (_error) {
          // best-effort
        }
      }
    }, OAUTH_POPUP_TIMEOUT_MS)
  }

  // Handle OAuth callback — detect code + state in URL params. React runs this
  // in its mount effect; `onMount` is Solid's equivalent, so the exchange never
  // starts while the component is still rendering.
  onMount(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    const state = params.get('state')

    if (code) {
      // Retrieve the provider that initiated the flow.
      let provider: string | null = null
      try {
        provider = sessionStorage.getItem('oauth_provider')
      } catch (_error) {
        // SSR-safe — sessionStorage is unavailable in SSR/sandboxed environments.
      }

      if (provider) {
        // Are we the OAuth popup we opened? Relay the result to the opener
        // instead of establishing the session in this (about-to-close) window.
        const inPopup =
          typeof window !== 'undefined' &&
          !!window.opener &&
          window.name === OAUTH_POPUP_WINDOW_NAME

        // Clean up URL (remove code/state params) and sessionStorage.
        const cleanUrl = new URL(window.location.href)
        cleanUrl.searchParams.delete('code')
        cleanUrl.searchParams.delete('state')
        window.history.replaceState({}, '', cleanUrl.toString())
        try {
          sessionStorage.removeItem('oauth_provider')
        } catch (_error) {
          // SSR-safe — sessionStorage is unavailable in SSR/sandboxed environments.
        }

        /** Relay a result to the opener (popup path) — origin-pinned, never `'*'`. */
        const relayToOpener = (message: OAuthRelayMessage): void => {
          try {
            window.opener?.postMessage(message, window.location.origin)
          } catch (_error) {
            // opener gone / cross-origin — the opener's close-poll will recover.
          }
          try {
            window.close()
          } catch (_error) {
            // best-effort
          }
        }

        // Exchange code for session.
        const exchangeCode = async (): Promise<void> => {
          try {
            const response = (await fetch(`${baseURL}${loginEndpoint}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include', // Send cookies (oauth_state) for state validation
              body: JSON.stringify({
                server: provider,
                code,
                state: state || undefined,
                redirect_uri: window.location.origin,
              }),
            })) as Response

            if (!response.ok) {
              // A body that is not JSON: report the generic failure.
              const data = await response
                .json()
                .catch((_error: unknown) => ({ error: oauthFailed() }))
              const error = (data as { error?: string }).error || oauthFailed()
              if (inPopup) {
                relayToOpener({ type: OAUTH_RESULT_MESSAGE_TYPE, ok: false, error })
                return
              }
              if (mounted) config?.onError?.(error)
              return
            }

            // A body that is not JSON carries no user; the token comes from the header.
            const data: unknown = await response.json().catch((_error: unknown) => null)
            const authHeader =
              response.headers.get('authorization') || response.headers.get('set-authorization')
            const token = authHeader ? authHeader.replace('Bearer ', '') : null

            // The authenticated user is `props` (molecule resource convention)
            // or `user` (generic AuthResult).
            const user =
              data && typeof data === 'object'
                ? ((data as { props?: unknown }).props ?? (data as { user?: unknown }).user ?? null)
                : null

            if (inPopup) {
              // Relay to the opener — it (same origin) establishes the session.
              relayToOpener({ type: OAUTH_RESULT_MESSAGE_TYPE, ok: true, token, user })
              return
            }

            // Full-page callback: establish the session here, then fire onSuccess.
            const ok = await establishSession(token, user)
            if (!mounted) return
            if (ok) config?.onSuccess?.()
            else config?.onError?.(oauthFailed())
          } catch (err) {
            const error = err instanceof Error ? err.message : oauthFailed()
            if (inPopup) {
              relayToOpener({ type: OAUTH_RESULT_MESSAGE_TYPE, ok: false, error })
              return
            }
            if (mounted) config?.onError?.(error)
          }
        }

        void exchangeCode()
      }
    }
  })

  return {
    providers,
    getOAuthUrl,
    redirect,
    loginViaPopup,
  }
}
