/**
 * React hook for OAuth authentication.
 *
 * Supports two initiation modes that share ONE callback path:
 *   - {@link UseOAuthReturn.redirect} — full-page redirect (the default; unchanged).
 *   - {@link UseOAuthReturn.loginViaPopup} — opens the provider in a popup so the
 *     opener page never navigates (used by in-app auth modals). On completion the
 *     popup relays the result to the opener via a STRICTLY-validated `postMessage`
 *     and closes itself; the opener establishes the session in place.
 *
 * Security model for the popup relay (see inline notes at each gate):
 *   - The popup posts ONLY to its own origin (`targetOrigin = location.origin`),
 *     never `'*'`, so the bearer token can never be delivered to another origin.
 *   - The opener accepts a result ONLY when ALL hold: `event.origin === location.origin`,
 *     `event.source === thePopupWindowWeOpened`, and `event.data.type` matches our
 *     private message type. Anything else is ignored — a forged cross-origin (or
 *     wrong-window) message cannot inject a session.
 *   - The popup-relay path is gated on `window.name === OAUTH_POPUP_WINDOW_NAME`
 *     AND `window.opener`, so an ordinary full-page callback is completely
 *     unaffected (it still establishes the session inline as before).
 *   - The opener tears down its listener + timers on result, on user-close, and on
 *     a hard timeout, so no stale handler lingers.
 *
 * @module
 */

import { useCallback, useEffect, useMemo, useRef } from 'react'

import { useAuthClient } from './useAuth.js'

/**
 * `window.open` name for the OAuth popup. The callback page relays its result to
 * the opener ONLY when its own `window.name` equals this AND `window.opener`
 * exists — so a normal (full-page) callback never takes the relay path.
 */
const OAUTH_POPUP_WINDOW_NAME = 'molecule-oauth-popup'

/** Private `postMessage` type for the popup→opener result relay. */
const OAUTH_RESULT_MESSAGE_TYPE = 'molecule:oauth-result'

/** Hard cap on how long the opener waits for the popup before giving up. */
const OAUTH_POPUP_TIMEOUT_MS = 5 * 60 * 1000

/** Shape of the result the popup relays to the opener. */
interface OAuthRelayMessage {
  /** Private discriminator — the opener ignores any message without this exact type. */
  type: typeof OAUTH_RESULT_MESSAGE_TYPE
  /** Whether the exchange succeeded. */
  ok: boolean
  /** Bearer token from the exchange (relayed same-origin only), when `ok`. */
  token?: string | null
  /** The authenticated user, when `ok`. */
  user?: unknown
  /** Failure message, when not `ok`. */
  error?: string
}

/**
 * Return type for useOAuth hook.
 */
export interface UseOAuthReturn {
  providers: string[]
  getOAuthUrl: (provider: string) => string
  /** Full-page redirect to the provider (default). The opener page navigates away. */
  redirect: (provider: string) => void
  /**
   * Open the provider in a popup so the opener page does NOT navigate. On success
   * the session is established in the opener in place and `config.onSuccess` fires;
   * on failure `config.onError` fires. Falls back to a full-page {@link redirect}
   * when the popup is blocked.
   */
  loginViaPopup: (provider: string) => void
}

/**
 * Hook for OAuth authentication.
 *
 * Reads OAuth configuration from the provided config and provides
 * helpers to build OAuth URLs and start a login (full-page or popup).
 * Automatically handles OAuth callbacks by detecting `code` and `state`
 * URL parameters and exchanging them for a session — and, when the callback is
 * running inside a popup we opened, relaying the result to the opener instead.
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
 * const { providers, redirect, loginViaPopup } = useOAuth()
 *
 * return (
 *   <div>
 *     {providers.map(provider => (
 *       <button key={provider} onClick={() => loginViaPopup(provider)}>
 *         Login with {provider}
 *       </button>
 *     ))}
 *   </div>
 * )
 * ```
 * @returns OAuth helpers: providers, getOAuthUrl, redirect, and loginViaPopup.
 */
export function useOAuth(config?: {
  baseURL?: string
  oauthProviders?: string[]
  oauthEndpoint?: string
  loginEndpoint?: string
  onSuccess?: () => void
  onError?: (error: string) => void
}): UseOAuthReturn {
  const authClient = useAuthClient()

  const providers = useMemo(() => config?.oauthProviders ?? [], [config?.oauthProviders])
  const baseURL = config?.baseURL ?? ''
  const oauthEndpoint = config?.oauthEndpoint ?? '/oauth'
  const loginEndpoint = config?.loginEndpoint ?? '/users/log-in/oauth'

  const getOAuthUrl = useCallback(
    (provider: string): string => {
      // Encode the provider as a single path segment so a (future) caller passing an
      // untrusted value can never inject a path/query/scheme into the opened URL —
      // defense-in-depth on top of the upstream static provider allowlist. Plain
      // provider names ('github', 'google') pass through unchanged.
      return `${baseURL}${oauthEndpoint}/${encodeURIComponent(provider)}`
    },
    [baseURL, oauthEndpoint],
  )

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

  /**
   * Establish the authenticated session from an exchange result: seed the access
   * token + user and let `initialize()` flip `authenticated`. Mirrors what
   * `authClient.login()` does for password login. Returns whether a user was set
   * (a result with no user is not a real session).
   */
  const establishSession = useCallback(
    async (token: string | null | undefined, user: unknown): Promise<boolean> => {
      // Seed the token via the auth client's configured token storage adapter
      // (in-memory by default) — NOT localStorage directly. Writing the bearer
      // token to localStorage violates the in-memory-default storage contract and
      // makes it JS-readable (XSS-exfiltratable). [P5FE-31 secure-by-default]
      if (token) authClient.setAccessToken(token)
      if (user && typeof user === 'object') {
        authClient.setUser(user)
        await authClient.initialize()
        return true
      }
      return false
    },
    [authClient],
  )

  const redirect = useCallback(
    (provider: string): void => {
      stashProvider(provider)
      window.location.href = withReturnPath(getOAuthUrl(provider))
    },
    [getOAuthUrl],
  )

  // The currently-open OAuth popup, so a second click focuses it instead of
  // stacking a second flow (the relay gates already fail safe, but one window is
  // cleaner and avoids an orphaned listener until the timeout reaps it).
  const activePopupRef = useRef<Window | null>(null)

  const loginViaPopup = useCallback(
    (provider: string): void => {
      // A flow is already open — focus it rather than starting another.
      if (activePopupRef.current && !activePopupRef.current.closed) {
        try {
          activePopupRef.current.focus()
        } catch (_error) {
          /* best-effort focus */
        }
        return
      }
      stashProvider(provider)
      const url = withReturnPath(getOAuthUrl(provider))

      // A named popup. We intentionally do NOT pass `noopener` — the popup needs
      // `window.opener` to relay its result back. The window only ever navigates
      // to OUR api → the trusted provider → OUR origin, so this is the standard
      // OAuth-popup trade-off (a malicious *provider* could touch `window.opener`,
      // which is out of scope; we don't open attacker-controlled URLs here).
      const features = 'popup=yes,width=520,height=680,menubar=no,toolbar=no,location=yes'
      const popup = window.open(url, OAUTH_POPUP_WINDOW_NAME, features)

      // Popup blocked (or unavailable) → fall back to a full-page redirect so login
      // still works. No listener is registered in this branch.
      if (!popup) {
        window.location.href = url
        return
      }
      activePopupRef.current = popup

      let settled = false
      const timers: {
        closed?: ReturnType<typeof setInterval>
        timeout?: ReturnType<typeof setTimeout>
      } = {}

      const cleanup = (): void => {
        window.removeEventListener('message', onMessage)
        if (timers.closed) clearInterval(timers.closed)
        if (timers.timeout) clearTimeout(timers.timeout)
        if (activePopupRef.current === popup) activePopupRef.current = null
      }

      const onMessage = (event: MessageEvent): void => {
        // SECURITY — accept the result ONLY from our own origin, ONLY from the exact
        // popup window we opened, and ONLY when it carries our private type. Any one
        // failing means a forged / unrelated message: ignore it silently. This is
        // what prevents a malicious page from injecting a session.
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
          /* already closed — nothing to do */
        }
        if (data.ok) {
          void establishSession(data.token, data.user).then((ok) => {
            if (ok) config?.onSuccess?.()
            else config?.onError?.('OAuth login failed')
          })
        } else {
          config?.onError?.(typeof data.error === 'string' ? data.error : 'OAuth login failed')
        }
      }

      window.addEventListener('message', onMessage)

      // The user closed the popup without completing — silently stop waiting (no
      // error toast for a deliberate cancel) and release the listener.
      timers.closed = setInterval(() => {
        if (popup.closed && !settled) {
          settled = true
          cleanup()
        }
      }, 500)

      // Hard safety timeout so a wedged popup never leaks a listener forever.
      timers.timeout = setTimeout(() => {
        if (!settled) {
          settled = true
          cleanup()
          try {
            popup.close()
          } catch (_error) {
            /* best-effort */
          }
        }
      }, OAUTH_POPUP_TIMEOUT_MS)
    },
    [getOAuthUrl, establishSession, config],
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
    } catch (_error) {
      /* SSR-safe — sessionStorage is unavailable in SSR/sandboxed environments */
    }
    if (!provider) return

    // Are we the OAuth popup we opened? Relay the result to the opener instead of
    // establishing the session in this (about-to-close) window. Gated on BOTH the
    // window name AND window.opener so a normal full-page callback never relays.
    const inPopup =
      typeof window !== 'undefined' && !!window.opener && window.name === OAUTH_POPUP_WINDOW_NAME

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

    /** Relay a result to the opener (popup path) — origin-pinned, never `'*'`. */
    const relayToOpener = (message: OAuthRelayMessage): void => {
      try {
        // targetOrigin is our OWN origin: the browser delivers the message (and the
        // token it carries) ONLY if the opener is still on this origin. Never '*'.
        window.opener?.postMessage(message, window.location.origin)
      } catch (_error) {
        /* opener gone / cross-origin — the opener's close-poll will recover */
      }
      try {
        window.close()
      } catch (_error) {
        /* best-effort */
      }
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
          const error = data.error || 'OAuth login failed'
          if (inPopup) {
            relayToOpener({ type: OAUTH_RESULT_MESSAGE_TYPE, ok: false, error })
            return
          }
          config?.onError?.(error)
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

        if (inPopup) {
          // Relay to the opener — it (same origin) establishes the session in place.
          // Do NOT establish it here; this window is about to close.
          relayToOpener({ type: OAUTH_RESULT_MESSAGE_TYPE, ok: true, token, user })
          return
        }

        // Full-page callback: establish the session here, then fire onSuccess —
        // unchanged behavior.
        const ok = await establishSession(token, user)
        if (ok) config?.onSuccess?.()
        else config?.onError?.('OAuth login failed')
      } catch (err) {
        const error = err instanceof Error ? err.message : 'OAuth login failed'
        if (inPopup) {
          relayToOpener({ type: OAUTH_RESULT_MESSAGE_TYPE, ok: false, error })
          return
        }
        config?.onError?.(error)
      }
    }

    exchangeCode()
  }, [baseURL, loginEndpoint, config, establishSession])

  return {
    providers,
    getOAuthUrl,
    redirect,
    loginViaPopup,
  }
}
