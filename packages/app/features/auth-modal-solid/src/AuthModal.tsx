/**
 * In-app login / signup modal — authenticate WITHOUT leaving the page.
 *
 * Solid counterpart of `@molecule/app-auth-modal-react`'s `AuthModal`: the
 * same props (React names), the same ClassMap tokens, the same i18n keys, and
 * the same DOM for the same input.
 *
 * Reuses the Solid auth primitives (`useLogin` / `useSignup` / `useOAuth` /
 * `useAuth`) so behavior matches the standalone `/login` and `/signup` pages,
 * but on success it stays in place: it refreshes the session (so guards + plan
 * are current), runs an optional app `onAuthenticated` hook (e.g. claim guest
 * work, invalidate usage), and closes — no navigation, no reload. OAuth runs
 * in a POPUP (`loginViaPopup`) so social login never navigates the host
 * either.
 *
 * @module
 */

import type { JSX } from 'solid-js'
import {
  type Component,
  createEffect,
  createRenderEffect,
  createSignal,
  on,
  onCleanup,
  onMount,
  Show,
} from 'solid-js'

import { useAuthFormState } from '@molecule/app-auth-shell-solid'
import { OAuthButtons, OAuthDivider } from '@molecule/app-oauth-buttons-solid'
import {
  useAuth,
  useAuthClient,
  useI18nError,
  useLogin,
  useOAuth,
  type UseOAuthConfig,
  useSignup,
  useTranslation,
} from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'
import { Button, Icon, Modal } from '@molecule/app-ui-solid'

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

/** The signed-in profile fields the success view reads off the auth client. */
interface SuccessProfile {
  name?: string | null
  email?: string | null
  username?: string | null
}

/**
 * Whether {@link TOUCH_FIRST_QUERY} currently matches. SSR-safe (reports
 * `false` until mounted in a browser) and subscribes to media-query changes
 * (rotation, window resize across the breakpoint). Local to this package — it
 * must not import IDE feature packages for a two-line media-query check.
 * @returns True on phone-width or touch-first devices.
 */
function useTouchFirstViewport(): () => boolean {
  const [matches, setMatches] = createSignal(
    typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia(TOUCH_FIRST_QUERY).matches,
  )
  onMount(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
    const mql = window.matchMedia(TOUCH_FIRST_QUERY)
    const onChange = (e: MediaQueryListEvent): void => {
      setMatches(e.matches)
    }
    setMatches(mql.matches)
    mql.addEventListener('change', onChange)
    onCleanup(() => {
      mql.removeEventListener('change', onChange)
    })
  })
  return matches
}

/** Props for {@link AuthModal}. */
export interface AuthModalProps {
  /** Whether the modal is open. */
  open: boolean
  /** Close without authenticating (backdrop / Escape / ✕). */
  onClose?: () => void
  /** Which form to open on. Defaults to `'signup'`. */
  initialMode?: AuthModalMode
  /**
   * OAuth config consumed by `useOAuth()` — `{ baseURL, oauthProviders, oauthEndpoint }`
   * from the app's `config.ts`. Drives the popup OAuth buttons.
   */
  oauthConfig: UseOAuthConfig
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
  captchaSlot?: JSX.Element
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
export const AuthModal: Component<AuthModalProps> = (props) => {
  const { t } = useTranslation()
  const cm = getClassMap()
  const isTouchFirst = useTouchFirstViewport()
  // React's `useState(initialMode)`: read once, then owned by the component.
  const [mode, setMode] = createSignal<AuthModalMode>(props.initialMode ?? 'signup')
  const { refresh } = useAuth()
  const authClient = useAuthClient()
  const { status: loginStatus, error: loginError, login } = useLogin()
  const { status: signupStatus, error: signupError, signup } = useSignup()
  const { fields, setField, clear } = useAuthFormState()
  const [password, setPassword] = createSignal('')
  const [name, setName] = createSignal('')
  const [twoFactorToken, setTwoFactorToken] = createSignal('')
  const [oauthError, setOauthError] = createSignal<string | null>(null)
  // Post-auth confirmation ("Signed up!" / "Logged in!") shown briefly before
  // the modal closes — without it the modal just vanished, which read as
  // "nothing happened".
  const [succeeded, setSucceeded] = createSignal(false)

  const isSignup = (): boolean => mode() === 'signup'
  const busy = (): boolean => (isSignup() ? signupStatus() : loginStatus()) === 'pending'
  const errorMessage = useI18nError(() => (isSignup() ? signupError() : loginError()))

  // Dialog pattern (WAI-ARIA): when the modal opens, keyboard and
  // screen-reader users land on the form's primary field instead of on the
  // page behind the overlay. This replaces the `autoFocus` prop, which
  // jsx-a11y/no-autofocus bars: the prop fires on EVERY mount of the input
  // (e.g. the brief remount after the mode switches), while this effect runs
  // exactly once per open transition. Solid creates the parent's effects
  // before the Modal child's own focus-trap effect and both defer one
  // microtask, so this defers two — the email field then wins in both signup
  // and login mode (React's child-effects-first ordering).
  let emailRef!: HTMLInputElement
  const focusEmail = (): void => {
    if (props.open) emailRef?.focus()
  }
  createEffect(
    on(
      () => props.open,
      (open) => {
        if (open) queueMicrotask(() => queueMicrotask(focusEmail))
      },
      { defer: true },
    ),
  )
  onMount(() => {
    if (props.open) queueMicrotask(() => queueMicrotask(focusEmail))
  })

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
    await props.onAuthenticated?.()
    await minDisplay
    props.onClose?.()
  }

  // OAuth (popup): success/error land back on THIS page; wire them into the
  // primitive. An accessor keeps the closures current (React re-creates the
  // config object every render).
  const oauth = useOAuth(() => ({
    ...props.oauthConfig,
    onSuccess: () => {
      // Surface a finishAuth failure (no session established) in the modal
      // instead of dying as an unhandled rejection.
      finishAuth().catch((error: unknown) => {
        setOauthError(error instanceof Error ? error.message : String(error))
      })
    },
    onError: (message: string) => {
      setOauthError(message)
    },
  }))

  const handleSubmit = async (e: SubmitEvent): Promise<void> => {
    e.preventDefault()
    props.onBeforeAuth?.()
    try {
      if (isSignup())
        await signup({
          email: fields().email ?? '',
          password: password(),
          name: name() || undefined,
        })
      else await login({ email: fields().email ?? '', password: password() })
      clear()
      await finishAuth()
    } catch (_error) {
      // Auth errors are captured in the primitive's error state and shown
      // below; we deliberately do NOT navigate or reload on failure or success.
    }
  }

  /** The shared input inline style, sized for the current viewport class. */
  const fieldStyle = (): JSX.CSSProperties => ({
    width: '100%',
    padding: '10px 12px',
    'border-radius': '6px',
    border: '1px solid var(--mol-color-border, rgba(127,127,127,0.3))',
    background: 'var(--mol-color-surface-secondary, rgba(127,127,127,0.06))',
    color: 'inherit',
    outline: 'none',
    // ≥16px on phones/touch — below 16px iOS Safari zooms the page when an
    // input gains focus, which wrecks the modal on the primary conversion
    // flow. Desktop keeps the compact 14px.
    'font-size': isTouchFirst() ? '16px' : '14px',
  })

  /**
   * react-dom writes a controlled value through BOTH the live property and the
   * `value` attribute; Solid's `value` binding writes only the property. The
   * ref callback (same pattern as `@molecule/app-amount-input-solid`) keeps
   * both current for the element's lifetime.
   *
   * @param text - Accessor of the controlled value.
   * @returns The ref callback to attach.
   */
  const syncInput =
    (text: () => string) =>
    (el: HTMLInputElement): void => {
      createRenderEffect(() => {
        const next = text()
        if (el.value !== next) el.value = next
        if (el.getAttribute('value') !== next) el.setAttribute('value', next)
      })
    }

  return (
    <Modal
      open={props.open}
      onClose={() => props.onClose?.()}
      size="sm"
      title={
        isSignup()
          ? t('auth.modal.signupTitle', undefined, { defaultValue: 'Create your account' })
          : t('auth.modal.loginTitle', undefined, { defaultValue: 'Log in' })
      }
      data-mol-id="auth-modal"
    >
      <div data-mol-id="auth-modal-body" style={{ display: 'flex', 'flex-direction': 'column' }}>
        <Show
          when={succeeded()}
          fallback={
            <>
              <div
                class={cm.textMuted}
                style={{ 'margin-bottom': '12px', 'font-size': '13px', 'line-height': '1.45' }}
              >
                {isSignup()
                  ? t('auth.modal.signupBlurb', undefined, {
                      defaultValue: 'Sign up to keep your work.',
                    })
                  : t('auth.modal.loginBlurb', undefined, {
                      defaultValue: 'Log in to keep your work.',
                    })}
              </div>
              <form onSubmit={(e) => void handleSubmit(e)} style={{ display: 'grid', gap: '10px' }}>
                <Show when={isSignup()}>
                  <input
                    type="text"
                    ref={syncInput(name)}
                    onInput={(e) => setName(e.currentTarget.value)}
                    autocomplete="name"
                    data-mol-id="auth-modal-name"
                    placeholder={t('auth.signup.name', undefined, {
                      defaultValue: 'Name (optional)',
                    })}
                    style={fieldStyle()}
                  />
                </Show>
                <input
                  type="email"
                  onInput={(e) => setField('email', e.currentTarget.value)}
                  autocomplete="email"
                  ref={(el: HTMLInputElement) => {
                    emailRef = el
                    syncInput(() => fields().email ?? '')(el)
                  }}
                  required
                  data-mol-id="auth-modal-email"
                  placeholder={t('auth.login.email', undefined, { defaultValue: 'Email' })}
                  style={fieldStyle()}
                />
                <input
                  type="password"
                  ref={syncInput(password)}
                  onInput={(e) => setPassword(e.currentTarget.value)}
                  autocomplete={isSignup() ? 'new-password' : 'current-password'}
                  required
                  data-mol-id="auth-modal-password"
                  placeholder={t('auth.login.password', undefined, { defaultValue: 'Password' })}
                  style={fieldStyle()}
                />
                <Show when={!isSignup()}>
                  <input
                    type="text"
                    inputmode="numeric"
                    ref={syncInput(twoFactorToken)}
                    onInput={(e) => setTwoFactorToken(e.currentTarget.value)}
                    autocomplete="one-time-code"
                    data-mol-id="auth-modal-2fa"
                    placeholder={t('auth.login.twoFactor', undefined, {
                      defaultValue: 'Two-Factor Token (If enabled)',
                    })}
                    style={fieldStyle()}
                  />
                </Show>
                {/* Human-verification challenge — signup only (login is not gated). */}
                <Show when={isSignup() && props.captchaSlot}>
                  <div
                    data-mol-id="auth-modal-captcha"
                    style={{ display: 'grid', 'margin-top': '2px' }}
                  >
                    {props.captchaSlot}
                  </div>
                </Show>
                <Button
                  type="submit"
                  size="lg"
                  color="success"
                  disabled={busy() || (isSignup() && !(props.captchaSolved ?? true))}
                  data-mol-id="auth-modal-submit"
                  style={{ width: '100%', 'margin-top': '2px' }}
                >
                  {busy()
                    ? t('auth.modal.working', undefined, { defaultValue: 'Just a moment…' })
                    : isSignup()
                      ? t('auth.login.signUp', undefined, { defaultValue: 'Sign up' })
                      : t('auth.login.logIn', undefined, { defaultValue: 'Log in' })}
                </Button>
                {(errorMessage() || oauthError()) && (
                  <div class={cm.authFormError}>{errorMessage() || oauthError()}</div>
                )}
              </form>
              <Show when={oauth.providers.length > 0}>
                <div style={{ 'margin-top': '4px' }}>
                  <OAuthDivider />
                  {/* Popup OAuth — never navigates the host. */}
                  <OAuthButtons
                    providers={oauth.providers}
                    onSelect={(provider) => {
                      setOauthError(null)
                      props.onBeforeAuth?.()
                      oauth.loginViaPopup(provider)
                    }}
                  />
                </div>
              </Show>
              <button
                type="button"
                data-mol-id="auth-modal-switch"
                onClick={() => setMode(isSignup() ? 'login' : 'signup')}
                class={cm.cn(cm.button({ variant: 'ghost', size: 'sm' }))}
                style={{ 'margin-top': '12px', 'align-self': 'center' }}
              >
                {isSignup()
                  ? t('auth.modal.haveAccount', undefined, {
                      defaultValue: 'Already have an account? Log in',
                    })
                  : t('auth.modal.needAccount', undefined, {
                      defaultValue: "Don't have an account? Sign up",
                    })}
              </button>
            </>
          }
        >
          <div
            data-mol-id="auth-modal-success"
            style={{
              display: 'flex',
              'flex-direction': 'column',
              'align-items': 'center',
              gap: '10px',
              // Written as cssstyle's own normalized form: React assigns the
              // shorthand through the CSSOM property (which expands `0` to
              // `0px`), Solid's setProperty keeps the string verbatim.
              padding: '26px 0px 18px',
              'text-align': 'center',
            }}
          >
            <Icon name="check-circle" size={44} className={cm.textSuccess} aria-hidden="true" />
            <div style={{ 'font-size': '17px', 'font-weight': '600' }}>
              {isSignup()
                ? t('auth.modal.signedUp', undefined, { defaultValue: 'Signed up!' })
                : t('auth.modal.loggedIn', undefined, { defaultValue: 'Logged in!' })}
            </div>
            <Who />
          </div>
        </Show>
      </div>
    </Modal>
  )

  /**
   * Who just authenticated — shown under the headline so the confirmation
   * names the account, not just the outcome. Rendered only with the success
   * view; reads the client synchronously (React reads it in the same render).
   * @returns The muted "Logged in as …" line, or nothing.
   */
  function Who(): JSX.Element {
    const profile = authClient.getUser() as SuccessProfile | null
    const who = profile?.name || profile?.email || profile?.username || ''
    return (
      <Show when={who !== ''}>
        <div class={cm.textMuted} style={{ 'font-size': '13px' }}>
          {t('auth.modal.loggedInAs', { who }, { defaultValue: 'Logged in as {{who}}' })}
        </div>
      </Show>
    )
  }
}
