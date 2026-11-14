/**
 * Svelte hook for OAuth authentication, porting React's `useOAuth`.
 *
 * Supports two initiation modes that share ONE callback path:
 *   - {@link UseOAuthReturn.redirect} — full-page redirect (the default).
 *   - {@link UseOAuthReturn.loginViaPopup} — opens the provider in a popup so the
 *     opener page never navigates. On completion the popup relays the result to
 *     the opener via a STRICTLY-validated `postMessage` and closes itself; the
 *     opener establishes the session in place.
 *
 * Security model for the popup relay (see inline notes at each gate):
 *   - The popup posts ONLY to its own origin (`targetOrigin = location.origin`),
 *     never `'*'`, so the bearer token can never be delivered to another origin.
 *   - The opener accepts a result ONLY when ALL hold: `event.origin === location.origin`,
 *     `event.source === thePopupWindowWeOpened`, and `event.data.type` matches our
 *     private message type. Anything else is ignored.
 *   - The popup-relay path is gated on `window.name === OAUTH_POPUP_WINDOW_NAME`
 *     AND `window.opener`, so an ordinary full-page callback is completely
 *     unaffected.
 *   - The opener tears down its listener + timers on result, on user-close, and on
 *     a hard timeout, so no stale handler lingers.
 *
 * Unmounting does not cancel a flow that has started. A popup result or a
 * callback exchange that settles afterwards still establishes the session on
 * the shared auth client, because the user did sign in. `onSuccess` and
 * `onError` are not called after unmount: they belong to the unmounted view.
 *
 * @module
 */

import { onDestroy } from 'svelte'
import { createSubscriber } from 'svelte/reactivity'
import { get } from 'svelte/store'

import { t } from '@molecule/app-i18n'

import { useAuthClient } from '../context.js'
import { type MaybeReadable, toReadable } from './maybe-readable.js'

/** What `onError` gets when the server gives no reason of its own. */
const oauthFailed = (): string =>
  t('svelte.error.oauthFailed', undefined, { defaultValue: 'OAuth login failed' })

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
  /**
   * The configured provider names (React's `string[]`), read live: each read
   * returns the list the current config holds, and a read in markup or
   * `$derived` re-runs when a config store changes. Read it off the result
   * (`oauth.providers`); a destructured copy keeps the list of the moment it
   * was taken.
   */
  readonly providers: string[]
  /** Builds the provider's initiation URL (provider encoded as one path segment). */
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
 * OAuth configuration override options.
 */
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
  /**
   * How the page leaves for the provider: {@link UseOAuthReturn.redirect} and the
   * blocked-popup fallback call it with the provider URL. Defaults to a full-page
   * navigation (`window.location.href = url`); pass an in-app browser opener on
   * native, or a router's external navigation.
   */
  navigate?: (url: string) => void
}

/**
 * OAuth authentication, React's `useOAuth` in Svelte's idiom: call it during
 * component init under `setMoleculeContext({ auth })`. Reads OAuth
 * configuration and provides helpers to build OAuth URLs and start a login
 * (full-page or popup). Automatically handles OAuth callbacks by detecting
 * `code` and `state` URL parameters and exchanging them for a session — and,
 * when the callback is running inside a popup we opened, relaying the result
 * to the opener instead.
 *
 * The config may be a plain value or a readable store of one (a store holding
 * `undefined` means no config): every field — the provider list, the URL
 * pieces, the callbacks, the `navigate` option — is read at the moment it is
 * used, so setting the store retargets the next `getOAuthUrl`/`redirect`/popup
 * flow on the same component, the way React's re-render does. `providers` is
 * React's `string[]`, read live (see {@link UseOAuthReturn.providers}). The
 * callback exchange, when it finds a `code` in the URL, runs once with the
 * config the hook was called with.
 *
 * @param config - Optional OAuth configuration override (or a store of it).
 * @returns OAuth helpers: providers, getOAuthUrl, redirect, and loginViaPopup.
 * @example
 * ```svelte
 * <script>
 *   import { useOAuth } from '@molecule/app-svelte'
 *   const oauth = useOAuth()
 * </script>
 *
 * {#each oauth.providers as provider}
 *   <button onclick={() => oauth.loginViaPopup(provider)}>Login with {provider}</button>
 * {/each}
 * ```
 */
export function useOAuth(config?: MaybeReadable<UseOAuthConfig | undefined>): UseOAuthReturn {
  const authClient = useAuthClient()
  const configStore = toReadable(config)
  const current = (): UseOAuthConfig | undefined => get(configStore)

  // Whether the component is mounted, read when a flow settles.
  let mounted = true
  onDestroy(() => {
    mounted = false
  })

  // `providers` is read live, like React's re-rendered array: a read inside markup or an
  // effect subscribes the config store (a plain config's constant store never notifies),
  // so a changed config re-runs it. The store's synchronous first call is the value the
  // read already returns, not a change.
  const trackConfig = createSubscriber((update) => {
    let started = false
    const unsubscribe = configStore.subscribe(() => {
      if (started) update()
    })
    started = true
    return unsubscribe
  })

  const getOAuthUrl = (provider: string): string => {
    const now = current()
    const baseURL = now?.baseURL ?? ''
    const oauthEndpoint = now?.oauthEndpoint ?? '/oauth'
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

  /**
   * Establish the authenticated session from an exchange result: seed the access
   * token + user and let `initialize()` flip `authenticated`. Mirrors what
   * `authClient.login()` does for password login. Returns whether a user was set
   * (a result with no user is not a real session).
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

  /** Leaves the page for the provider: the `navigate` option, else a full-page navigation. */
  const leaveFor = (url: string): void => {
    const navigateOption = current()?.navigate
    if (navigateOption) navigateOption(url)
    else window.location.href = url
  }

  const redirect = (provider: string): void => {
    stashProvider(provider)
    leaveFor(withReturnPath(getOAuthUrl(provider)))
  }

  // The currently-open OAuth popup, so a second click focuses it instead of
  // stacking a second flow (the relay gates already fail safe, but one window is
  // cleaner and avoids an orphaned listener until the timeout reaps it).
  let activePopup: Window | null = null

  const loginViaPopup = (provider: string): void => {
    // A flow is already open — focus it rather than starting another.
    if (activePopup && !activePopup.closed) {
      try {
        activePopup.focus()
      } catch (_error) {
        /* best-effort focus */
      }
      return
    }
    stashProvider(provider)
    const url = withReturnPath(getOAuthUrl(provider))

    // A named popup. We intentionally do NOT pass `noopener` — the popup needs
    // `window.opener` to relay its result back.
    const features = 'popup=yes,width=520,height=680,menubar=no,toolbar=no,location=yes'
    const popup = window.open(url, OAUTH_POPUP_WINDOW_NAME, features)

    // Popup blocked (or unavailable) → fall back to a full-page redirect so login
    // still works. No listener is registered in this branch.
    if (!popup) {
      leaveFor(url)
      return
    }
    activePopup = popup

    let settled = false
    const timers: {
      closed?: ReturnType<typeof setInterval>
      timeout?: ReturnType<typeof setTimeout>
    } = {}

    const cleanup = (): void => {
      window.removeEventListener('message', onMessage)
      if (timers.closed) clearInterval(timers.closed)
      if (timers.timeout) clearTimeout(timers.timeout)
      if (activePopup === popup) activePopup = null
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
          if (!mounted) return
          if (ok) current()?.onSuccess?.()
          else current()?.onError?.(oauthFailed())
        })
      } else if (mounted) {
        current()?.onError?.(typeof data.error === 'string' ? data.error : oauthFailed())
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
  }

  // Handle OAuth callback — detect code + state in URL params (React's mount
  // effect; the exchange starts at init and outlives the component).
  {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    const state = params.get('state')

    if (code) {
      // Retrieve the provider that initiated the flow
      let provider: string | null = null
      try {
        provider = sessionStorage.getItem('oauth_provider')
      } catch (_error) {
        /* SSR-safe — sessionStorage is unavailable in SSR/sandboxed environments */
      }
      if (provider) {
        // Are we the OAuth popup we opened? Relay the result to the opener instead of
        // establishing the session in this (about-to-close) window. Gated on BOTH the
        // window name AND window.opener so a normal full-page callback never relays.
        const inPopup =
          typeof window !== 'undefined' &&
          !!window.opener &&
          window.name === OAUTH_POPUP_WINDOW_NAME

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

        // Exchange code for session, with the config the hook was called with
        // (React's mount effect reads its config once).
        const configNow = current()
        const baseURL = configNow?.baseURL ?? ''
        const loginEndpoint = configNow?.loginEndpoint ?? '/users/log-in/oauth'
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
              // A body that is not JSON: report the generic failure.
              const data = await response
                .json()
                .catch((_error: unknown) => ({ error: oauthFailed() }))
              const error = data.error || oauthFailed()
              if (inPopup) {
                relayToOpener({ type: OAUTH_RESULT_MESSAGE_TYPE, ok: false, error })
                return
              }
              if (mounted) configNow?.onError?.(error)
              return
            }

            // A body that is not JSON carries no user; the token comes from the header.
            const data: unknown = await response.json().catch((_error: unknown) => null)
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

            if (inPopup) {
              // Relay to the opener — it (same origin) establishes the session in place.
              // Do NOT establish it here; this window is about to close.
              relayToOpener({ type: OAUTH_RESULT_MESSAGE_TYPE, ok: true, token, user })
              return
            }

            // Full-page callback: establish the session here, then fire onSuccess.
            const ok = await establishSession(token, user)
            if (!mounted) return
            if (ok) configNow?.onSuccess?.()
            else configNow?.onError?.(oauthFailed())
          } catch (err) {
            const error = err instanceof Error ? err.message : oauthFailed()
            if (inPopup) {
              relayToOpener({ type: OAUTH_RESULT_MESSAGE_TYPE, ok: false, error })
              return
            }
            if (mounted) configNow?.onError?.(error)
          }
        }

        void exchangeCode()
      }
    }
  }

  return {
    get providers() {
      trackConfig()
      return current()?.oauthProviders ?? []
    },
    getOAuthUrl,
    redirect,
    loginViaPopup,
  }
}
