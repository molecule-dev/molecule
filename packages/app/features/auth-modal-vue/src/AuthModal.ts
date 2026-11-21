/**
 * In-app login / signup modal — authenticate WITHOUT leaving the page.
 *
 * Vue counterpart of `@molecule/app-auth-modal-react`'s `AuthModal`: the same
 * props (React names), the same ClassMap tokens, the same i18n keys, and the
 * same DOM for the same input.
 *
 * Reuses the Vue auth composables (`useLogin` / `useSignup` / `useOAuth` /
 * `useAuth`) so behavior matches the standalone `/login` and `/signup` pages, but
 * on success it stays in place: it refreshes the session (so guards + plan are
 * current), runs an optional app `onAuthenticated` hook (e.g. claim guest work,
 * invalidate usage), and closes — no navigation, no reload. OAuth runs in a POPUP
 * (`loginViaPopup`) so social login never navigates the host either.
 *
 * @module
 */

import {
  computed,
  defineComponent,
  h,
  nextTick,
  onMounted,
  onScopeDispose,
  type PropType,
  ref,
  type VNode,
  type VNodeChild,
  watch,
} from 'vue'

import { useAuthFormState } from '@molecule/app-auth-shell-vue'
import { OAuthButtons, OAuthDivider } from '@molecule/app-oauth-buttons-vue'
import { getClassMap } from '@molecule/app-ui'
import { Button, Icon, Modal } from '@molecule/app-ui-vue'
import {
  useAuth,
  useAuthClient,
  useI18nError,
  useLogin,
  useOAuth,
  type UseOAuthConfig,
  useSignup,
  useTranslation,
} from '@molecule/app-vue'

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
 * must not import IDE feature composables for a two-line media-query check.
 * @returns True on phone-width or touch-first devices.
 */
function useTouchFirstViewport(): RefImplBoolean {
  const matches = ref(
    typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia(TOUCH_FIRST_QUERY).matches,
  )
  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    const mql = window.matchMedia(TOUCH_FIRST_QUERY)
    // React's effect re-reads `mql.matches` on mount before subscribing; the
    // setup value above is that same read.
    matches.value = mql.matches
    const onChange = (e: MediaQueryListEvent): void => {
      matches.value = e.matches
    }
    mql.addEventListener('change', onChange)
    onScopeDispose(() => {
      mql.removeEventListener('change', onChange)
    })
  }
  return matches
}

/** The boolean ref {@link useTouchFirstViewport} returns. */
type RefImplBoolean = ReturnType<typeof ref<boolean>>

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
   * way back. Passed as a prop or as the same-named slot.
   *
   * The modal stays provider-agnostic: it renders the node and never inspects
   * it. An app whose signup API requires a challenge MUST pass
   * {@link AuthModalProps.captchaSolved} as well, or the form will submit
   * without a token and the API will reject it.
   *
   * Optional — omitted (the default for apps with no challenge) the signup form
   * is unchanged.
   */
  captchaSlot?: VNodeChild | null
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
 * @returns The modal component (renders nothing when closed).
 */
export const AuthModal = defineComponent({
  name: 'AuthModal',
  props: {
    open: { type: Boolean, default: false },
    onClose: Function as PropType<() => void>,
    initialMode: {
      type: String as PropType<AuthModalMode>,
      default: 'signup',
    },
    oauthConfig: null,
    onBeforeAuth: Function as PropType<() => void>,
    onAuthenticated: Function as PropType<() => void | Promise<void>>,
    captchaSlot: null,
    captchaSolved: { type: Boolean, default: true },
  },
  setup(props, { slots }) {
    const { t } = useTranslation()
    const cm = getClassMap()
    const isTouchFirst = useTouchFirstViewport()
    // React's `useState(initialMode)`: read once, then owned by the component.
    const mode = ref<AuthModalMode>(props.initialMode)
    const { refresh } = useAuth()
    const authClient = useAuthClient()
    const { status: loginStatus, error: loginError, login } = useLogin()
    const { status: signupStatus, error: signupError, signup } = useSignup()
    const { fields, setField, clear } = useAuthFormState()
    const password = ref('')
    const name = ref('')
    const twoFactorToken = ref('')
    const oauthError = ref<string | null>(null)
    // Post-auth confirmation ("Signed up!" / "Logged in!") shown briefly before
    // the modal closes — without it the modal just vanished, which read as
    // "nothing happened".
    const succeeded = ref(false)

    const isSignup = computed(() => mode.value === 'signup')
    const busy = computed(() =>
      isSignup.value ? signupStatus.value === 'pending' : loginStatus.value === 'pending',
    )
    const errorMessage = useI18nError(() => (isSignup.value ? signupError.value : loginError.value))

    // Dialog pattern (WAI-ARIA): when the modal opens, keyboard and
    // screen-reader users land on the form's primary field instead of on the
    // page behind the overlay. This replaces the `autofocus` attribute, which
    // jsx-a11y/no-autofocus bars: the attribute fires on EVERY mount of the
    // input (e.g. the brief remount after the mode switches), while these two
    // paths run exactly once per open transition — mount, and a later
    // open flip. The mount path runs after the Modal's own focus-trap
    // bookkeeping (child mounted hooks first, React's child-effects-first
    // ordering); the flip path resolves after it in the same flush. The email
    // field wins in both signup and login mode.
    const emailRef = ref<HTMLInputElement | null>(null)
    const focusEmail = (): void => {
      if (props.open) emailRef.value?.focus()
    }
    const focusEmailWhenPatched = (): void => {
      void nextTick(focusEmail)
    }
    watch(
      () => props.open,
      (open) => {
        if (open) focusEmailWhenPatched()
      },
    )
    onMounted(focusEmail)

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
      succeeded.value = true
      // Hold the confirmation on screen while the app hook runs; whichever
      // finishes last gates the close.
      const minDisplay = new Promise((resolve) => setTimeout(resolve, SUCCESS_DISPLAY_MS))
      await props.onAuthenticated?.()
      await minDisplay
      props.onClose?.()
    }

    // OAuth (popup): success/error land back on THIS page; wire them into the
    // composable. A getter keeps the closures current (React re-creates the
    // config object every render).
    const { providers, loginViaPopup } = useOAuth(() => ({
      ...props.oauthConfig,
      onSuccess: () => {
        // Surface a finishAuth failure (no session established) in the modal
        // instead of dying as an unhandled rejection.
        finishAuth().catch((error: unknown) => {
          oauthError.value = error instanceof Error ? error.message : String(error)
        })
      },
      onError: (message: string) => {
        oauthError.value = message
      },
    }))

    const handleSubmit = async (e: Event): Promise<void> => {
      e.preventDefault()
      props.onBeforeAuth?.()
      try {
        if (isSignup.value)
          await signup({
            email: fields.value.email ?? '',
            password: password.value,
            name: name.value || undefined,
          })
        else await login({ email: fields.value.email ?? '', password: password.value })
        clear()
        await finishAuth()
      } catch (_error) {
        // Auth errors are captured in the composable's error state and shown
        // below; we deliberately do NOT navigate or reload on failure or success.
      }
    }

    /**
     * Resolves a node-valued prop that may also arrive as a same-named slot.
     * @returns The captcha node(s), or an empty list when neither is present.
     */
    const captchaNodes = (): VNodeChild[] => {
      if (slots.captchaSlot) return slots.captchaSlot()
      return props.captchaSlot != null ? [props.captchaSlot] : []
    }

    return (): VNode => {
      const fieldStyle: Record<string, string | number> = {
        width: '100%',
        padding: '10px 12px',
        borderRadius: '6px',
        border: '1px solid var(--mol-color-border, rgba(127,127,127,0.3))',
        background: 'var(--mol-color-surface-secondary, rgba(127,127,127,0.06))',
        color: 'inherit',
        outline: 'none',
        // ≥16px on phones/touch — below 16px iOS Safari zooms the page when an
        // input gains focus, which wrecks the modal on the primary conversion
        // flow. Desktop keeps the compact 14px.
        fontSize: isTouchFirst.value ? '16px' : '14px',
      }
      return h(
        Modal,
        {
          open: props.open,
          onClose: () => props.onClose?.(),
          size: 'sm',
          title: isSignup.value
            ? t('auth.modal.signupTitle', undefined, { defaultValue: 'Create your account' })
            : t('auth.modal.loginTitle', undefined, { defaultValue: 'Log in' }),
          'data-mol-id': 'auth-modal',
        },
        {
          default: () => [
            h(
              'div',
              {
                'data-mol-id': 'auth-modal-body',
                style: { display: 'flex', flexDirection: 'column' },
              },
              succeeded.value
                ? [renderSuccess()]
                : [
                    h(
                      'div',
                      {
                        class: cm.textMuted,
                        style: { marginBottom: '12px', fontSize: '13px', lineHeight: 1.45 },
                      },
                      isSignup.value
                        ? t('auth.modal.signupBlurb', undefined, {
                            defaultValue: 'Sign up to keep your work.',
                          })
                        : t('auth.modal.loginBlurb', undefined, {
                            defaultValue: 'Log in to keep your work.',
                          }),
                    ),
                    h(
                      'form',
                      {
                        onSubmit: (e) => void handleSubmit(e),
                        style: { display: 'grid', gap: '10px' },
                      },
                      renderFormFields(fieldStyle),
                    ),
                    renderOAuth(),
                    h(
                      'button',
                      {
                        type: 'button',
                        'data-mol-id': 'auth-modal-switch',
                        onClick: () => {
                          mode.value = isSignup.value ? 'login' : 'signup'
                        },
                        class: cm.cn(cm.button({ variant: 'ghost', size: 'sm' })),
                        style: { marginTop: '12px', alignSelf: 'center' },
                      },
                      isSignup.value
                        ? t('auth.modal.haveAccount', undefined, {
                            defaultValue: 'Already have an account? Log in',
                          })
                        : t('auth.modal.needAccount', undefined, {
                            defaultValue: "Don't have an account? Sign up",
                          }),
                    ),
                  ],
            ),
          ],
        },
      )
    }

    /**
     * Who just authenticated — shown under the headline so the confirmation
     * names the account, not just the outcome.
     * @returns The success confirmation subtree.
     */
    function renderSuccess(): VNode {
      const profile = authClient.getUser() as SuccessProfile | null
      const who = profile?.name || profile?.email || profile?.username || ''
      return h(
        'div',
        {
          'data-mol-id': 'auth-modal-success',
          style: {
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '10px',
            padding: '26px 0 18px',
            textAlign: 'center',
          },
        },
        [
          h(Icon, { name: 'check-circle', size: 44, class: cm.textSuccess, 'aria-hidden': 'true' }),
          h(
            'div',
            { style: { fontSize: '17px', fontWeight: 600 } },
            isSignup.value
              ? t('auth.modal.signedUp', undefined, { defaultValue: 'Signed up!' })
              : t('auth.modal.loggedIn', undefined, { defaultValue: 'Logged in!' }),
          ),
          who
            ? h(
                'div',
                { class: cm.textMuted, style: { fontSize: '13px' } },
                t('auth.modal.loggedInAs', { who }, { defaultValue: 'Logged in as {{who}}' }),
              )
            : null,
        ],
      )
    }

    /**
     * The form fields for the current mode: name (signup), email, password,
     * two-factor token (login), the captcha challenge (signup only), the
     * submit button and the shown error.
     *
     * @param fieldStyle - The shared input inline style (already sized for the
     *   current viewport class).
     * @returns The field vnodes.
     */
    function renderFormFields(fieldStyle: Record<string, string | number>): VNodeChild[] {
      const nodes: VNodeChild[] = []
      if (isSignup.value) {
        nodes.push(
          h('input', {
            key: 'auth-modal-name',
            type: 'text',
            value: name.value,
            onInput: (e: Event) => {
              name.value = (e.target as HTMLInputElement).value
            },
            autocomplete: 'name',
            'data-mol-id': 'auth-modal-name',
            placeholder: t('auth.signup.name', undefined, {
              defaultValue: 'Name (optional)',
            }),
            style: fieldStyle,
          }),
        )
      }
      nodes.push(
        h('input', {
          key: 'auth-modal-email',
          type: 'email',
          value: fields.value.email ?? '',
          onInput: (e: Event) => {
            setField('email', (e.target as HTMLInputElement).value)
          },
          autocomplete: 'email',
          ref: emailRef,
          required: true,
          'data-mol-id': 'auth-modal-email',
          placeholder: t('auth.login.email', undefined, { defaultValue: 'Email' }),
          style: fieldStyle,
        }),
        h('input', {
          key: 'auth-modal-password',
          type: 'password',
          value: password.value,
          onInput: (e: Event) => {
            password.value = (e.target as HTMLInputElement).value
          },
          autocomplete: isSignup.value ? 'new-password' : 'current-password',
          required: true,
          'data-mol-id': 'auth-modal-password',
          placeholder: t('auth.login.password', undefined, { defaultValue: 'Password' }),
          style: fieldStyle,
        }),
      )
      if (!isSignup.value) {
        nodes.push(
          h('input', {
            key: 'auth-modal-2fa',
            type: 'text',
            inputmode: 'numeric',
            value: twoFactorToken.value,
            onInput: (e: Event) => {
              twoFactorToken.value = (e.target as HTMLInputElement).value
            },
            autocomplete: 'one-time-code',
            'data-mol-id': 'auth-modal-2fa',
            placeholder: t('auth.login.twoFactor', undefined, {
              defaultValue: 'Two-Factor Token (If enabled)',
            }),
            style: fieldStyle,
          }),
        )
      }
      // Human-verification challenge — signup only (login is not gated).
      const captcha = captchaNodes()
      if (isSignup.value && captcha.length > 0) {
        nodes.push(
          h(
            'div',
            { 'data-mol-id': 'auth-modal-captcha', style: { display: 'grid', marginTop: '2px' } },
            captcha,
          ),
        )
      }
      nodes.push(
        h(
          Button,
          {
            type: 'submit',
            size: 'lg',
            color: 'success',
            disabled: busy.value || (isSignup.value && !props.captchaSolved),
            'data-mol-id': 'auth-modal-submit',
            style: { width: '100%', marginTop: '2px' },
          },
          {
            default: () =>
              busy.value
                ? t('auth.modal.working', undefined, { defaultValue: 'Just a moment…' })
                : isSignup.value
                  ? t('auth.login.signUp', undefined, { defaultValue: 'Sign up' })
                  : t('auth.login.logIn', undefined, { defaultValue: 'Log in' }),
          },
        ),
      )
      const shownError = errorMessage.value || oauthError.value
      if (shownError) nodes.push(h('div', { class: cm.authFormError }, shownError))
      return nodes
    }

    /**
     * The popup OAuth section: divider + provider buttons (never navigates the
     * host), rendered only when the OAuth config lists providers.
     * @returns The section vnode, or null without providers.
     */
    function renderOAuth(): VNode | null {
      const list = providers.value
      if (list.length === 0) return null
      return h('div', { style: { marginTop: '4px' } }, [
        h(OAuthDivider),
        // Popup OAuth — never navigates the host.
        h(OAuthButtons, {
          providers: list,
          onSelect: (provider: string) => {
            oauthError.value = null
            props.onBeforeAuth?.()
            loginViaPopup(provider)
          },
        }),
      ])
    }
  },
})
