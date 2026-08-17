/**
 * In-app login / signup modal — authenticate WITHOUT leaving the page.
 *
 * Reuses the framework auth hooks (`useLogin` / `useSignup` / `useOAuth` /
 * `useAuth`) so behavior matches the standalone `/login` and `/signup` pages, but
 * on success it stays in place: it refreshes the session (so guards + plan are
 * current), runs an optional app `onAuthenticated` hook (e.g. claim guest work,
 * invalidate usage), and closes — no navigation, no reload. OAuth runs in a POPUP
 * (`loginViaPopup`) so social login never navigates the host either.
 *
 * Every app-specific concern is injected: the OAuth `oauthConfig`, an optional
 * `onBeforeAuth` (run before any login attempt — e.g. stash the guest id) and
 * `onAuthenticated` (run after success). With none of those it still works as a
 * plain email/password + OAuth login that refreshes and closes — the default for
 * the 133 flagship apps.
 *
 * @module
 */

import { type JSX, type ReactNode, useEffect, useState } from 'react'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { t } from '@molecule/app-i18n'
import { OAuthButtons, OAuthDivider } from '@molecule/app-oauth-buttons-react'
import { useAuth, useAuthClient, useI18nError, useLogin, useSignup } from '@molecule/app-react'
import { useOAuth } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Button, Icon, Modal } from '@molecule/app-ui-react'

import type { AuthModalMode } from './cta-intercept.js'

/**
 * Matches phones (narrow viewport) OR touch-first devices (coarse primary
 * pointer) — the contexts where a sub-16px input font makes iOS Safari zoom
 * the whole page on focus.
 */
const TOUCH_FIRST_QUERY = '(max-width: 767px), (pointer: coarse)'

/**
 * How long the "Signed up!" / "Logged in!" confirmation stays visible before
 * the modal closes. Long enough to register, short enough not to feel like a
 * wait — and the app's `onAuthenticated` work (claiming guest projects etc.)
 * runs concurrently, so the real delay is `max(this, onAuthenticated)`.
 */
const SUCCESS_DISPLAY_MS = 1000

/**
 * Whether {@link TOUCH_FIRST_QUERY} currently matches. SSR-safe (reports
 * `false` until mounted in a browser) and subscribes to media-query changes
 * (rotation, window resize across the breakpoint). Local to this package — it
 * must not import IDE feature packages for a two-line media-query hook.
 * @returns True on phone-width or touch-first devices.
 */
function useTouchFirstViewport(): boolean {
  const [matches, setMatches] = useState(
    () =>
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia(TOUCH_FIRST_QUERY).matches,
  )
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
    const mql = window.matchMedia(TOUCH_FIRST_QUERY)
    const onChange = (e: MediaQueryListEvent): void => setMatches(e.matches)
    setMatches(mql.matches)
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [])
  return matches
}

/** Props for {@link AuthModal}. */
export interface AuthModalProps {
  /** Whether the modal is open. */
  open: boolean
  /** Close without authenticating (backdrop / Escape / ✕). */
  onClose: () => void
  /** Which form to open on. Defaults to `'signup'`. */
  initialMode?: AuthModalMode
  /**
   * OAuth config consumed by `useOAuth()` — `{ baseURL, oauthProviders, oauthEndpoint }`
   * from the app's `config.ts`. Drives the popup OAuth buttons.
   */
  oauthConfig: Parameters<typeof useOAuth>[0]
  /**
   * Run synchronously BEFORE any login/signup/OAuth attempt — e.g. stash the guest
   * id so the new session can claim its work. Optional.
   */
  onBeforeAuth?: () => void
  /**
   * Run AFTER a successful login/signup/OAuth (the session is already refreshed),
   * still on the same page — e.g. claim guest projects, invalidate usage. Optional.
   */
  onAuthenticated?: () => void | Promise<void>
  /**
   * A human-verification challenge rendered inside the SIGNUP form, above the
   * submit button (e.g. the app's Turnstile/hCaptcha widget). Login is not
   * gated, so the slot is unmounted in login mode — which lets the widget clear
   * its own token when the user switches tabs and re-issue a fresh one on the
   * way back.
   *
   * The modal stays provider-agnostic: it renders the node and never inspects
   * it. An app whose signup API requires a challenge MUST pass
   * {@link AuthModalProps.captchaSolved} as well, or the form will submit
   * without a token and the API will reject it.
   *
   * Optional — omitted (the default for apps with no challenge) the signup form
   * is unchanged.
   */
  captchaSlot?: ReactNode
  /**
   * Whether the {@link AuthModalProps.captchaSlot} challenge is currently
   * solved. `false` disables the signup submit, so the form cannot POST a
   * missing/expired token. Defaults to `true` (no challenge → nothing to wait
   * for). Ignored in login mode.
   */
  captchaSolved?: boolean
}

/**
 * The in-app auth modal: login/signup tabs rendered in a Modal overlay — the user authenticates without leaving the current page (no navigation, no lost work). Usually rendered via `AuthModalMount`, not directly.
 *
 * @param props - {@link AuthModalProps}.
 * @returns The modal element (renders nothing when closed).
 */
export function AuthModal({
  open,
  onClose,
  initialMode = 'signup',
  oauthConfig,
  onBeforeAuth,
  onAuthenticated,
  captchaSlot,
  captchaSolved = true,
}: AuthModalProps): JSX.Element {
  const cm = getClassMap()
  const isTouchFirst = useTouchFirstViewport()
  const [mode, setMode] = useState<AuthModalMode>(initialMode)
  const { refresh } = useAuth()
  const authClient = useAuthClient()
  const { status: loginStatus, error: loginError, login } = useLogin()
  const { status: signupStatus, error: signupError, signup } = useSignup()
  const { fields, setField, clear } = useAuthFormState()
  const email = fields.email ?? ''
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [twoFactorToken, setTwoFactorToken] = useState('')
  const [oauthError, setOauthError] = useState<string | null>(null)
  // Post-auth confirmation ("Signed up!" / "Logged in!") shown briefly before
  // the modal closes — without it the modal just vanished, which read as
  // "nothing happened".
  const [succeeded, setSucceeded] = useState(false)

  const isSignup = mode === 'signup'
  const busy = isSignup ? signupStatus === 'pending' : loginStatus === 'pending'
  const errorMessage = useI18nError(isSignup ? signupError : loginError)

  // Universal post-auth: refresh the session (guards + plan current), show a
  // brief confirmation, run the app's hook, then close — all in place, no
  // navigation.
  const finishAuth = async (): Promise<void> => {
    try {
      await refresh()
    } catch (error) {
      // Every path into finishAuth (password login/signup response, OAuth popup
      // relay) has already established the session client-side, so the refresh
      // is a freshness pass — a failure here (e.g. an API with neither a
      // refresh endpoint nor cookie restore) must NOT strand an authenticated
      // user in the modal with their account already created. Only a genuinely
      // absent session is a real failure.
      if (!authClient.isAuthenticated()) throw error
    }
    setSucceeded(true)
    // Hold the confirmation on screen while the app hook runs; whichever
    // finishes last gates the close.
    const minDisplay = new Promise((resolve) => setTimeout(resolve, SUCCESS_DISPLAY_MS))
    await onAuthenticated?.()
    await minDisplay
    onClose()
  }

  // OAuth (popup): success/error land back on THIS page; wire them into the hook.
  const { providers, loginViaPopup } = useOAuth({
    ...oauthConfig,
    onSuccess: () => {
      // Surface a finishAuth failure (no session established) in the modal
      // instead of dying as an unhandled rejection.
      finishAuth().catch((error: unknown) => {
        setOauthError(error instanceof Error ? error.message : String(error))
      })
    },
    onError: (message: string) => setOauthError(message),
  })

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    onBeforeAuth?.()
    try {
      if (isSignup) await signup({ email, password, name: name || undefined })
      else await login({ email, password })
      clear()
      await finishAuth()
    } catch (_error) {
      // Auth errors are captured in the hook's error state and shown below; we
      // deliberately do NOT navigate or reload on failure or success.
    }
  }

  const fieldStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    borderRadius: 6,
    border: '1px solid var(--mol-color-border, rgba(127,127,127,0.3))',
    background: 'var(--mol-color-surface-secondary, rgba(127,127,127,0.06))',
    color: 'inherit',
    outline: 'none',
    // ≥16px on phones/touch — below 16px iOS Safari zooms the page when an
    // input gains focus, which wrecks the modal on the primary conversion flow.
    // Desktop keeps the compact 14px.
    fontSize: isTouchFirst ? 16 : 14,
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      title={
        isSignup
          ? t('auth.modal.signupTitle', undefined, { defaultValue: 'Create your account' })
          : t('auth.modal.loginTitle', undefined, { defaultValue: 'Log in' })
      }
      data-mol-id="auth-modal"
    >
      <div data-mol-id="auth-modal-body" style={{ display: 'flex', flexDirection: 'column' }}>
        {succeeded ? (
          (() => {
            // Who just authenticated — shown under the headline so the
            // confirmation names the account, not just the outcome.
            const profile = authClient.getUser() as {
              name?: string | null
              email?: string | null
              username?: string | null
            } | null
            const who = profile?.name || profile?.email || profile?.username || ''
            return (
              <div
                data-mol-id="auth-modal-success"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 10,
                  padding: '26px 0 18px',
                  textAlign: 'center',
                }}
              >
                <Icon name="check-circle" size={44} className={cm.textSuccess} aria-hidden="true" />
                <div style={{ fontSize: 17, fontWeight: 600 }}>
                  {isSignup
                    ? t('auth.modal.signedUp', undefined, { defaultValue: 'Signed up!' })
                    : t('auth.modal.loggedIn', undefined, { defaultValue: 'Logged in!' })}
                </div>
                {who && (
                  <div className={cm.textMuted} style={{ fontSize: 13 }}>
                    {t('auth.modal.loggedInAs', { who }, { defaultValue: `Logged in as ${who}` })}
                  </div>
                )}
              </div>
            )
          })()
        ) : (
          <>
            <div
              className={cm.textMuted}
              style={{ marginBottom: 12, fontSize: 13, lineHeight: 1.45 }}
            >
              {isSignup
                ? t('auth.modal.signupBlurb', undefined, {
                    defaultValue: 'Sign up to keep your work.',
                  })
                : t('auth.modal.loginBlurb', undefined, {
                    defaultValue: 'Log in to keep your work.',
                  })}
            </div>
            <form onSubmit={(e) => void handleSubmit(e)} style={{ display: 'grid', gap: 10 }}>
              {isSignup && (
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  data-mol-id="auth-modal-name"
                  placeholder={t('auth.signup.name', undefined, {
                    defaultValue: 'Name (optional)',
                  })}
                  style={fieldStyle}
                />
              )}
              <input
                type="email"
                value={email}
                onChange={(e) => setField('email', e.target.value)}
                autoComplete="email"
                autoFocus
                required
                data-mol-id="auth-modal-email"
                placeholder={t('auth.login.email', undefined, { defaultValue: 'Email' })}
                style={fieldStyle}
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={isSignup ? 'new-password' : 'current-password'}
                required
                data-mol-id="auth-modal-password"
                placeholder={t('auth.login.password', undefined, { defaultValue: 'Password' })}
                style={fieldStyle}
              />
              {!isSignup && (
                <input
                  type="text"
                  inputMode="numeric"
                  value={twoFactorToken}
                  onChange={(e) => setTwoFactorToken(e.target.value)}
                  autoComplete="one-time-code"
                  data-mol-id="auth-modal-2fa"
                  placeholder={t('auth.login.twoFactor', undefined, {
                    defaultValue: '2FA code (if enabled)',
                  })}
                  style={fieldStyle}
                />
              )}
              {/* Human-verification challenge — signup only (login is not gated). */}
              {isSignup && captchaSlot && (
                <div data-mol-id="auth-modal-captcha" style={{ display: 'grid', marginTop: 2 }}>
                  {captchaSlot}
                </div>
              )}
              <Button
                type="submit"
                size="lg"
                color="success"
                disabled={busy || (isSignup && !captchaSolved)}
                data-mol-id="auth-modal-submit"
                style={{ width: '100%', marginTop: 2 }}
              >
                {busy
                  ? t('auth.modal.working', undefined, { defaultValue: 'Just a moment…' })
                  : isSignup
                    ? t('auth.login.signUp', undefined, { defaultValue: 'Sign up' })
                    : t('auth.login.logIn', undefined, { defaultValue: 'Log in' })}
              </Button>
              {(errorMessage || oauthError) && (
                <div className={cm.authFormError}>{errorMessage || oauthError}</div>
              )}
            </form>

            {providers.length > 0 && (
              <div style={{ marginTop: 4 }}>
                <OAuthDivider />
                {/* Popup OAuth — never navigates the host. */}
                <OAuthButtons
                  providers={providers}
                  onSelect={(provider) => {
                    setOauthError(null)
                    onBeforeAuth?.()
                    loginViaPopup(provider)
                  }}
                />
              </div>
            )}

            <button
              type="button"
              data-mol-id="auth-modal-switch"
              onClick={() => setMode(isSignup ? 'login' : 'signup')}
              className={cm.cn(cm.button({ variant: 'ghost', size: 'sm' }))}
              style={{ marginTop: 12, alignSelf: 'center' }}
            >
              {isSignup
                ? t('auth.modal.haveAccount', undefined, {
                    defaultValue: 'Already have an account? Log in',
                  })
                : t('auth.modal.needAccount', undefined, {
                    defaultValue: "Don't have an account? Sign up",
                  })}
            </button>
          </>
        )}
      </div>
    </Modal>
  )
}

AuthModal.displayName = 'AuthModal'
