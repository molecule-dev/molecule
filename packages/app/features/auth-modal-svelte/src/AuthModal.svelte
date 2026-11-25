<!--
  AuthModal: the Svelte counterpart of `@molecule/app-auth-modal-react`'s
  `AuthModal` — in-app login / signup tabs rendered in a Modal overlay, so the
  user authenticates without leaving the page. Same props (React names), same
  ClassMap tokens, same i18n keys, and the same DOM for the same input; the
  auth hooks (`useLogin` / `useSignup` / `useOAuth` / `useAuth`) come from
  `@molecule/app-svelte`, and OAuth runs in a popup so social login never
  navigates the host either.
-->
<script lang="ts">
  import { untrack } from 'svelte'
  import { writable } from 'svelte/store'

  import { useAuthFormState } from '@molecule/app-auth-shell-svelte'
  import { OAuthButtons, OAuthDivider } from '@molecule/app-oauth-buttons-svelte'
  import {
    PresentWhileContent,
    useAuth,
    useAuthClient,
    useI18nError,
    useLogin,
    useOAuth,
    useSignup,
    useTranslation,
  } from '@molecule/app-svelte'
  import { getClassMap, type OverlayTarget } from '@molecule/app-ui'
  import { Button, Icon, Modal } from '@molecule/app-ui-svelte'

  import type { AuthModalMode } from './cta-intercept.js'
  import type { AuthModalProps } from './types.js'
  import { reactInputValue } from './value.js'

  let {
    open,
    onClose,
    initialMode = 'signup',
    oauthConfig,
    onBeforeAuth,
    onAuthenticated,
    captchaSlot,
    captchaSolved = true,
  }: AuthModalProps = $props()

  const cm = $derived(getClassMap())
  const { t } = useTranslation()

  /**
   * Matches phones (narrow viewport) OR touch-first devices (coarse primary
   * pointer) — the contexts where a sub-16px input font makes iOS Safari zoom
   * the whole page on focus. SSR-safe (`false` until mounted) and subscribes
   * to media-query changes, like React's local hook.
   */
  let isTouchFirst = $state(false)
  $effect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
    const mql = window.matchMedia('(max-width: 767px), (pointer: coarse)')
    const onChange = (e: MediaQueryListEvent): void => {
      isTouchFirst = e.matches
    }
    isTouchFirst = mql.matches
    mql.addEventListener('change', onChange)
    return () => {
      mql.removeEventListener('change', onChange)
    }
  })

  // React's `useState(initialMode)`: read once, then owned by the component.
  let mode = $state<AuthModalMode>(untrack(() => initialMode))
  const { refresh } = useAuth()
  const authClient = useAuthClient()
  const { status: loginStatus, error: loginError, login } = useLogin()
  const { status: signupStatus, error: signupError, signup } = useSignup()
  const { fields, setField, clear } = useAuthFormState()
  let password = $state('')
  let name = $state('')
  let twoFactorToken = $state('')
  let oauthError = $state<string | null>(null)
  // Post-auth confirmation ("Signed up!" / "Logged in!") shown briefly before
  // the modal closes — without it the modal just vanished, which read as
  // "nothing happened".
  let succeeded = $state(false)
  // The email input element, for the dialog focus pattern below.
  let emailEl = $state<HTMLInputElement | null>(null)

  const isSignup = $derived(mode === 'signup')
  const busy = $derived((isSignup ? $signupStatus : $loginStatus) === 'pending')
  const email = $derived($fields.email ?? '')
  // Universal post-auth state: every label below reads a `$derived`, so a
  // locale switch re-runs it the way React's render-time `t` call does.
  const signupTitle = $derived(
    t('auth.modal.signupTitle', undefined, { defaultValue: 'Create your account' }),
  )
  const loginTitle = $derived(t('auth.modal.loginTitle', undefined, { defaultValue: 'Log in' }))
  const signupBlurb = $derived(
    t('auth.modal.signupBlurb', undefined, { defaultValue: 'Sign up to keep your work.' }),
  )
  const loginBlurb = $derived(
    t('auth.modal.loginBlurb', undefined, { defaultValue: 'Log in to keep your work.' }),
  )
  const namePlaceholder = $derived(
    t('auth.signup.name', undefined, { defaultValue: 'Name (optional)' }),
  )
  const emailPlaceholder = $derived(t('auth.login.email', undefined, { defaultValue: 'Email' }))
  const passwordPlaceholder = $derived(
    t('auth.login.password', undefined, { defaultValue: 'Password' }),
  )
  const twoFactorPlaceholder = $derived(
    t('auth.login.twoFactor', undefined, { defaultValue: 'Two-Factor Token (If enabled)' }),
  )
  const workingLabel = $derived(
    t('auth.modal.working', undefined, { defaultValue: 'Just a moment…' }),
  )
  const signUpLabel = $derived(t('auth.login.signUp', undefined, { defaultValue: 'Sign up' }))
  const logInLabel = $derived(t('auth.login.logIn', undefined, { defaultValue: 'Log in' }))
  const signedUpLabel = $derived(
    t('auth.modal.signedUp', undefined, { defaultValue: 'Signed up!' }),
  )
  const loggedInLabel = $derived(
    t('auth.modal.loggedIn', undefined, { defaultValue: 'Logged in!' }),
  )
  const loggedInAs = $derived(
    t(
      'auth.modal.loggedInAs',
      { who: whoJustAuthenticated() },
      { defaultValue: 'Logged in as {{who}}' },
    ),
  )
  const haveAccountLabel = $derived(
    t('auth.modal.haveAccount', undefined, { defaultValue: 'Already have an account? Log in' }),
  )
  const needAccountLabel = $derived(
    t('auth.modal.needAccount', undefined, { defaultValue: "Don't have an account? Sign up" }),
  )

  // The i18n-translated error text (React's `useI18nError`). `MaybeReadable`
  // takes a store: this one mirrors whichever hook error the current mode
  // shows, re-pushed by the effect when the mode or the errors change.
  const selectedError = writable<Error | null | undefined>(null)
  $effect(() => {
    selectedError.set(isSignup ? $signupError : $loginError)
  })
  const i18nError = useI18nError(selectedError)
  const errorMessage = $derived($i18nError)

  /**
   * Who just authenticated — shown under the headline so the confirmation
   * names the account, not just the outcome (React reads the client in the
   * success render; the success view is the only place this is shown).
   * @returns The profile display name, or ''.
   */
  function whoJustAuthenticated(): string {
    const profile = authClient.getUser() as {
      name?: string | null
      email?: string | null
      username?: string | null
    } | null
    return profile?.name || profile?.email || profile?.username || ''
  }

  const emailTarget: OverlayTarget = {
    get current() {
      return emailEl
    },
  }

  // Universal post-auth: refresh the session (guards + plan current), show a
  // brief confirmation, run the app's hook, then close — all in place, no
  // navigation.
  /**
   * Universal post-auth: refreshes the session, shows the brief confirmation,
   * runs the app's `onAuthenticated` hook, then closes — all in place.
   */
  async function finishAuth(): Promise<void> {
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
    succeeded = true
    // Hold the confirmation on screen while the app hook runs; whichever
    // finishes last gates the close.
    const minDisplay = new Promise((resolve) => setTimeout(resolve, 1000))
    await onAuthenticated?.()
    await minDisplay
    onClose?.()
  }

  // OAuth (popup): success/error land back on THIS page; wire them into the
  // hook. `MaybeReadable` takes a plain value or a store — a store of the
  // composed config is what reaches the hook live (React re-creates the
  // config object every render): the effect below re-pushes it whenever the
  // `oauthConfig` prop changes. The result is read off the object —
  // `providers` is a live getter there.
  const handleOauthSuccess = (): void => {
    // Surface a finishAuth failure (no session established) in the modal
    // instead of dying as an unhandled rejection.
    finishAuth().catch((error: unknown) => {
      oauthError = error instanceof Error ? error.message : String(error)
    })
  }
  const handleOauthError = (message: string): void => {
    oauthError = message
  }
  // The initial capture is intentional: this seed makes the first render show
  // the prop's provider list, and the effect below re-pushes the composed
  // config whenever the prop changes afterwards.
  // svelte-ignore state_referenced_locally
  const composedOauthConfig = writable({
    ...oauthConfig,
    onSuccess: handleOauthSuccess,
    onError: handleOauthError,
  })
  $effect(() => {
    composedOauthConfig.set({
      ...oauthConfig,
      onSuccess: handleOauthSuccess,
      onError: handleOauthError,
    })
  })
  const oauth = useOAuth(composedOauthConfig)

  /**
   * The form's submit: runs `onBeforeAuth`, signs in / signs up through the
   * hooks, clears the shared email and finishes in place.
   *
   * @param event - The submit event.
   */
  async function handleSubmit(event: SubmitEvent): Promise<void> {
    event.preventDefault()
    onBeforeAuth?.()
    try {
      if (isSignup) await signup({ email: $fields.email ?? '', password, name: name || undefined })
      else await login({ email: $fields.email ?? '', password })
      clear()
      await finishAuth()
    } catch (_error) {
      // Auth errors are captured in the hook's error state and shown below; we
      // deliberately do NOT navigate or reload on failure or success.
    }
  }

  /** The shared input inline style, sized for the current viewport class. */
  const fieldStyle = $derived(
    `width: 100%; padding: 10px 12px; border-radius: 6px; border: 1px solid var(--mol-color-border, rgba(127,127,127,0.3)); background: var(--mol-color-surface-secondary, rgba(127,127,127,0.06)); color: inherit; outline: none; font-size: ${isTouchFirst ? '16px' : '14px'}`,
  )
</script>

<Modal
  {open}
  onClose={() => onClose?.()}
  size="sm"
  initialFocus={emailTarget}
  title={isSignup ? signupTitle : loginTitle}
  data-mol-id="auth-modal"
>
  <div data-mol-id="auth-modal-body" style="display: flex; flex-direction: column">
    {#if succeeded}
      <div
        data-mol-id="auth-modal-success"
        style="display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 26px 0px 18px; text-align: center"
      >
        <Icon name="check-circle" size={44} className={cm.textSuccess} aria-hidden="true" />
        <div style="font-size: 17px; font-weight: 600">
          {isSignup ? signedUpLabel : loggedInLabel}
        </div>
        {#if whoJustAuthenticated() !== ''}
          <div class={cm.textMuted} style="font-size: 13px">{loggedInAs}</div>
        {/if}
      </div>
    {:else}
      <div class={cm.textMuted} style="margin-bottom: 12px; font-size: 13px; line-height: 1.45">
        {isSignup ? signupBlurb : loginBlurb}
      </div>
      <form style="display: grid; gap: 10px" onsubmit={(e) => void handleSubmit(e)}>
        {#if isSignup}
          <input
            type="text"
            use:reactInputValue={{ value: name }}
            oninput={(e) => (name = e.currentTarget.value)}
            autocomplete="name"
            data-mol-id="auth-modal-name"
            placeholder={namePlaceholder}
            style={fieldStyle}
          />
        {/if}
        <input
          type="email"
          use:reactInputValue={{ value: email }}
          oninput={(e) => setField('email', e.currentTarget.value)}
          autocomplete="email"
          bind:this={emailEl}
          required
          data-mol-id="auth-modal-email"
          placeholder={emailPlaceholder}
          style={fieldStyle}
        />
        <input
          type="password"
          use:reactInputValue={{ value: password }}
          oninput={(e) => (password = e.currentTarget.value)}
          autocomplete={isSignup ? 'new-password' : 'current-password'}
          required
          data-mol-id="auth-modal-password"
          placeholder={passwordPlaceholder}
          style={fieldStyle}
        />
        {#if !isSignup}
          <input
            type="text"
            inputmode="numeric"
            use:reactInputValue={{ value: twoFactorToken }}
            oninput={(e) => (twoFactorToken = e.currentTarget.value)}
            autocomplete="one-time-code"
            data-mol-id="auth-modal-2fa"
            placeholder={twoFactorPlaceholder}
            style={fieldStyle}
          />
        {/if}
        <!-- Human-verification challenge — signup only (login is not gated). -->
        {#if isSignup && captchaSlot}
          <PresentWhileContent
            tag="div"
            data-mol-id="auth-modal-captcha"
            style="display: grid; margin-top: 2px"
          >
            {#if typeof captchaSlot === 'function'}{@render captchaSlot?.()}{:else}{captchaSlot}{/if}
          </PresentWhileContent>
        {/if}
        <Button
          type="submit"
          size="lg"
          color="success"
          disabled={busy || (isSignup && !captchaSolved)}
          data-mol-id="auth-modal-submit"
          style={{ width: '100%', marginTop: '2px' }}
        >
          {busy ? workingLabel : isSignup ? signUpLabel : logInLabel}
        </Button>
        {#if errorMessage || oauthError}
          <div class={cm.authFormError}>{errorMessage || oauthError}</div>
        {/if}
      </form>
      {#if oauth.providers.length > 0}
        <div style="margin-top: 4px">
          <OAuthDivider />
          <!-- Popup OAuth — never navigates the host. -->
          <OAuthButtons
            providers={oauth.providers}
            onSelect={(provider) => {
              oauthError = null
              onBeforeAuth?.()
              oauth.loginViaPopup(provider)
            }}
          />
        </div>
      {/if}
      <button
        type="button"
        data-mol-id="auth-modal-switch"
        onclick={() => (mode = isSignup ? 'login' : 'signup')}
        class={cm.cn(cm.button({ variant: 'ghost', size: 'sm' }))}
        style="margin-top: 12px; align-self: center"
      >
        {isSignup ? haveAccountLabel : needAccountLabel}
      </button>
    {/if}
  </div>
</Modal>
