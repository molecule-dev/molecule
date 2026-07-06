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

import { type JSX, useState } from 'react'

import { useAuthFormState } from '@molecule/app-auth-shell-react'
import { t } from '@molecule/app-i18n'
import { OAuthButtons, OAuthDivider } from '@molecule/app-oauth-buttons-react'
import { useAuth, useI18nError, useLogin, useSignup } from '@molecule/app-react'
import { useOAuth } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Button, Modal } from '@molecule/app-ui-react'

import type { AuthModalMode } from './cta-intercept.js'

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
}

/**
 * The in-app auth modal. See the module doc for the no-navigation contract.
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
}: AuthModalProps): JSX.Element {
  const cm = getClassMap()
  const [mode, setMode] = useState<AuthModalMode>(initialMode)
  const { refresh } = useAuth()
  const { status: loginStatus, error: loginError, login } = useLogin()
  const { status: signupStatus, error: signupError, signup } = useSignup()
  const { fields, setField, clear } = useAuthFormState()
  const email = fields.email ?? ''
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [twoFactorToken, setTwoFactorToken] = useState('')
  const [oauthError, setOauthError] = useState<string | null>(null)

  const isSignup = mode === 'signup'
  const busy = isSignup ? signupStatus === 'pending' : loginStatus === 'pending'
  const errorMessage = useI18nError(isSignup ? signupError : loginError)

  // Universal post-auth: refresh the session (guards + plan current), run the app's
  // hook, then close — all in place, no navigation.
  const finishAuth = async (): Promise<void> => {
    await refresh()
    await onAuthenticated?.()
    onClose()
  }

  // OAuth (popup): success/error land back on THIS page; wire them into the hook.
  const { providers, loginViaPopup } = useOAuth({
    ...oauthConfig,
    onSuccess: () => void finishAuth(),
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
    fontSize: 14,
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
        <div className={cm.textMuted} style={{ marginBottom: 12, fontSize: 13, lineHeight: 1.45 }}>
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
              placeholder={t('auth.signup.name', undefined, { defaultValue: 'Name (optional)' })}
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
          <Button
            type="submit"
            size="lg"
            color="success"
            disabled={busy}
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
      </div>
    </Modal>
  )
}

AuthModal.displayName = 'AuthModal'
