/**
 * Angular functions for the auth flows, mirroring `useLogin`, `useSignup`,
 * `useChangePassword`, `usePasswordReset` and `useOAuth` from
 * `@molecule/app-react`.
 *
 * The state fields of the tracked hooks are LIVE getters over the underlying
 * `usePromise` state object: the result object is built once per instance (an
 * Angular instantiation runs once), and every later read must show the
 * current state, which React re-renders into a fresh result object.
 *
 * @module
 */

import { DestroyRef, inject } from '@angular/core'

import type {
  AuthResult,
  LoginCredentials,
  PasswordResetConfirm,
  PasswordResetRequest,
  RegisterData,
  RegisterExtraShape,
} from '@molecule/app-auth'
import { t } from '@molecule/app-i18n'

import { usePromise, type UsePromiseState } from './use-async.js'
import { useAuthClient } from './use-auth.js'

/**
 * Return type for {@link useLogin}.
 *
 * @template T - The user profile the API returns.
 */
export interface UseLoginReturn<T = unknown> {
  /** The login state: `'idle'`, `'pending'`, `'resolved'` or `'rejected'`. */
  readonly status: UsePromiseState<AuthResult<T>>['status']
  /** The resolved session, `null` before the first resolution. */
  readonly value: UsePromiseState<AuthResult<T>>['value']
  /** The failure of the latest login. */
  readonly error: UsePromiseState<AuthResult<T>>['error']
  /**
   * Runs one tracked login.
   *
   * @param credentials - The credentials to sign in with.
   * @returns The session.
   */
  login: (credentials: LoginCredentials) => Promise<AuthResult<T>>
  /** Returns the state to idle. */
  reset: () => void
}

/**
 * Login with async state tracking. Call it in an injection context.
 *
 * Registration is available through `const { register } = useAuth()`;
 * call `register({ email, password, name })` to create an account. There is
 * no separate `useRegister` hook. Use `usePromise(register)` when the form
 * needs the same pending/error tracking as this login hook.
 *
 * @returns Login state and action.
 */
export function useLogin<T = unknown>(): UseLoginReturn<T> {
  const client = useAuthClient<T>()

  const loginFn = (credentials: LoginCredentials): Promise<AuthResult<T>> =>
    client.login(credentials)

  const [state, call] = usePromise(loginFn)

  return {
    get status() {
      return state.status
    },
    get value() {
      return state.value
    },
    get error() {
      return state.error
    },
    login: call,
    reset: state.reset,
  }
}

/**
 * Return type for {@link useSignup}.
 *
 * @template T - The user profile the API returns.
 * @template TRegister - The app's own registration fields (the second generic
 *   of `createJWTAuthClient<T, TRegister>`), so `signup()` is typed like the
 *   client's `register()`.
 */
export interface UseSignupReturn<
  T = unknown,
  TRegister extends RegisterExtraShape<TRegister> = Record<never, never>,
> {
  /** The signup state. */
  readonly status: UsePromiseState<AuthResult<T>>['status']
  /** The resolved session, `null` before the first resolution. */
  readonly value: UsePromiseState<AuthResult<T>>['value']
  /** The failure of the latest signup. */
  readonly error: UsePromiseState<AuthResult<T>>['error']
  /**
   * Runs one tracked registration (and signs the account in).
   *
   * @param data - The registration data.
   * @returns The session.
   */
  signup: (data: RegisterData<TRegister>) => Promise<AuthResult<T>>
  /** Returns the state to idle. */
  reset: () => void
}

/**
 * Registration with async state tracking. Call it in an injection context.
 *
 * @returns Signup state and action.
 */
export function useSignup<
  T = unknown,
  TRegister extends RegisterExtraShape<TRegister> = Record<never, never>,
>(): UseSignupReturn<T, TRegister> {
  const client = useAuthClient<T, TRegister>()

  const registerFn = (data: RegisterData<TRegister>): Promise<AuthResult<T>> =>
    client.register(data)

  const [state, call] = usePromise(registerFn)

  return {
    get status() {
      return state.status
    },
    get value() {
      return state.value
    },
    get error() {
      return state.error
    },
    signup: call,
    reset: state.reset,
  }
}

/**
 * Return type for {@link useChangePassword}.
 */
export interface UseChangePasswordReturn {
  /** The change state. */
  readonly status: UsePromiseState<void>['status']
  /** The failure of the latest change. */
  readonly error: UsePromiseState<void>['error']
  /**
   * Runs one tracked password change.
   *
   * @param oldPassword - The current password.
   * @param newPassword - The new password.
   * @returns Resolves once changed.
   */
  changePassword: (oldPassword: string, newPassword: string) => Promise<void>
  /** Returns the state to idle. */
  reset: () => void
}

/**
 * Changing a password with async state tracking. Call it in an injection
 * context.
 *
 * @returns Change-password state and action.
 */
export function useChangePassword(): UseChangePasswordReturn {
  const client = useAuthClient()

  const changeFn = (oldPassword: string, newPassword: string): Promise<void> =>
    client.changePassword(oldPassword, newPassword)

  const [state, call] = usePromise(changeFn)

  return {
    get status() {
      return state.status
    },
    get error() {
      return state.error
    },
    changePassword: call,
    reset: state.reset,
  }
}

/**
 * Return type for {@link usePasswordReset}.
 */
export interface UsePasswordResetReturn {
  /** The request half's state. */
  readonly requestStatus: UsePromiseState<void>['status']
  /** The request half's failure. */
  readonly requestError: UsePromiseState<void>['error']
  /** The confirm half's state. */
  readonly confirmStatus: UsePromiseState<void>['status']
  /** The confirm half's failure. */
  readonly confirmError: UsePromiseState<void>['error']
  /**
   * Sends the reset email.
   *
   * @param data - The request data.
   * @returns Resolves once sent.
   */
  requestReset: (data: PasswordResetRequest) => Promise<void>
  /**
   * Submits the token and the new password.
   *
   * @param data - The confirm data.
   * @returns Resolves once confirmed.
   */
  confirmReset: (data: PasswordResetConfirm) => Promise<void>
  /** Returns both halves to idle. */
  reset: () => void
}

/**
 * The password reset flow with async state tracking, one tracker per step.
 * Call it in an injection context.
 *
 * @returns Password reset state and actions.
 */
export function usePasswordReset(): UsePasswordResetReturn {
  const client = useAuthClient()

  const requestFn = (data: PasswordResetRequest): Promise<void> => client.requestPasswordReset(data)

  const confirmFn = (data: PasswordResetConfirm): Promise<void> => client.confirmPasswordReset(data)

  const [requestState, requestCall] = usePromise(requestFn)
  const [confirmState, confirmCall] = usePromise(confirmFn)

  return {
    get requestStatus() {
      return requestState.status
    },
    get requestError() {
      return requestState.error
    },
    get confirmStatus() {
      return confirmState.status
    },
    get confirmError() {
      return confirmState.error
    },
    requestReset: requestCall,
    confirmReset: confirmCall,
    reset: () => {
      requestState.reset()
      confirmState.reset()
    },
  }
}

/** What `onError` gets when the server gives no reason of its own. */
const oauthFailed = (): string =>
  t('angular.error.oauthFailed', undefined, { defaultValue: 'OAuth login failed' })

/**
 * `window.open` name for the OAuth popup. The callback page relays its result
 * to the opener ONLY when its own `window.name` equals this AND
 * `window.opener` exists — so a normal (full-page) callback never takes the
 * relay path.
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
 * Return type for {@link useOAuth}.
 */
export interface UseOAuthReturn {
  /** The supported provider names. */
  providers: string[]
  /**
   * Builds the initiation URL for one provider.
   *
   * @param provider - The provider name.
   * @returns The URL.
   */
  getOAuthUrl: (provider: string) => string
  /**
   * Full-page redirect to the provider (default). The opener page navigates
   * away.
   *
   * @param provider - The provider name.
   */
  redirect: (provider: string) => void
  /**
   * Open the provider in a popup so the opener page does NOT navigate. On
   * success the session is established in the opener in place and
   * `config.onSuccess` fires; on failure `config.onError` fires. Falls back to
   * a full-page {@link redirect} when the popup is blocked.
   *
   * @param provider - The provider name.
   */
  loginViaPopup: (provider: string) => void
}

/**
 * OAuth authentication. Call it in an injection context.
 *
 * Reads OAuth configuration from the provided config and provides helpers to
 * build OAuth URLs and start a login (full-page or popup). Automatically
 * handles OAuth callbacks by detecting `code` and `state` URL parameters and
 * exchanging them for a session — and, when the callback is running inside a
 * popup we opened, relaying the result to the opener instead.
 *
 * Unmounting does not cancel a flow that has started. A popup result or a
 * callback exchange that settles afterwards still establishes the session on
 * the shared auth client, because the user did sign in. `onSuccess` and
 * `onError` are not called after unmount: they belong to the unmounted view.
 *
 * @param config - Optional OAuth configuration override.
 * @param config.baseURL - Base URL for the API server (e.g. "https://api.example.com").
 * @param config.oauthProviders - List of supported OAuth provider names (e.g. ["google", "github"]).
 * @param config.oauthEndpoint - Path prefix for OAuth routes (defaults to "/oauth").
 * @param config.loginEndpoint - Path for the OAuth login POST endpoint (defaults to "/users/log-in/oauth").
 * @param config.onSuccess - Callback after successful OAuth login.
 * @param config.onError - Callback on OAuth login failure.
 * @param config.navigate - How the page leaves for the provider: {@link UseOAuthReturn.redirect}
 *   and the blocked-popup fallback call it with the provider URL. Defaults to a
 *   full-page navigation (`window.location.href = url`); pass an in-app browser
 *   opener on native, or a router's external navigation.
 * @returns OAuth helpers: providers, getOAuthUrl, redirect, and loginViaPopup.
 */
export function useOAuth(config?: {
  baseURL?: string
  oauthProviders?: string[]
  oauthEndpoint?: string
  loginEndpoint?: string
  onSuccess?: () => void
  onError?: (error: string) => void
  navigate?: (url: string) => void
}): UseOAuthReturn {
  const authClient = useAuthClient()

  // Whether the host is mounted, read when a flow settles (an Angular
  // instantiation is never re-run, so one DestroyRef flag mirrors React's
  // mounted ref).
  const destroyRef = inject(DestroyRef)
  let mounted = true
  destroyRef.onDestroy(() => {
    mounted = false
  })

  const providers = config?.oauthProviders ?? []
  const baseURL = config?.baseURL ?? ''
  const oauthEndpoint = config?.oauthEndpoint ?? '/oauth'
  const loginEndpoint = config?.loginEndpoint ?? '/users/log-in/oauth'

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

  /**
   * Establish the authenticated session from an exchange result: seed the
   * access token + user and let `initialize()` flip `authenticated`. Mirrors
   * what `authClient.login()` does for password login. Returns whether a user
   * was set (a result with no user is not a real session).
   */
  const establishSession = async (
    token: string | null | undefined,
    user: unknown,
  ): Promise<boolean> => {
    // Seed the token via the auth client's configured token storage adapter
    // (in-memory by default) — NOT localStorage directly. Writing the bearer
    // token to localStorage violates the in-memory-default storage contract and
    // makes it JS-readable (XSS-exfiltratable).
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
    // `window.opener` to relay its result back. The window only ever navigates
    // to OUR api → the trusted provider → OUR origin, so this is the standard
    // OAuth-popup trade-off (a malicious *provider* could touch `window.opener`,
    // which is out of scope; we don't open attacker-controlled URLs here).
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
          if (ok) config?.onSuccess?.()
          else config?.onError?.(oauthFailed())
        })
      } else if (mounted) {
        config?.onError?.(typeof data.error === 'string' ? data.error : oauthFailed())
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

  // Handle OAuth callback — detect code + state in URL params.
  {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    const state = params.get('state')

    if (!code) {
      return { providers, getOAuthUrl, redirect, loginViaPopup }
    }

    // Retrieve the provider that initiated the flow.
    let provider: string | null = null
    try {
      provider = sessionStorage.getItem('oauth_provider')
    } catch (_error) {
      /* SSR-safe — sessionStorage is unavailable in SSR/sandboxed environments */
    }
    if (!provider) {
      return { providers, getOAuthUrl, redirect, loginViaPopup }
    }

    // Are we the OAuth popup we opened? Relay the result to the opener instead of
    // establishing the session in this (about-to-close) window. Gated on BOTH the
    // window name AND window.opener so a normal full-page callback never relays.
    const inPopup =
      typeof window !== 'undefined' && !!window.opener && window.name === OAUTH_POPUP_WINDOW_NAME

    // Clean up URL (remove code/state params) and sessionStorage.
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

    // Exchange code for session.
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
          const data = await response.json().catch((_error: unknown) => ({ error: oauthFailed() }))
          const error = data.error || oauthFailed()
          if (inPopup) {
            relayToOpener({ type: OAUTH_RESULT_MESSAGE_TYPE, ok: false, error })
            return
          }
          if (mounted) config?.onError?.(error)
          return
        }

        // A body that is not JSON carries no user; the token comes from the header.
        const data: unknown = await response.json().catch((_error: unknown) => null)
        // Store the token from the response.
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

  return { providers, getOAuthUrl, redirect, loginViaPopup }
}
