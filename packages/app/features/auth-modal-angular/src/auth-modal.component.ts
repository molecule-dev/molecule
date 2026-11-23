/**
 * AuthModal component (React parity).
 *
 * @module
 */

import { NgTemplateOutlet } from '@angular/common'
import {
  afterNextRender,
  type AfterViewChecked,
  Component,
  computed,
  DestroyRef,
  type DoCheck,
  ElementRef,
  inject,
  Injector,
  signal,
  TemplateRef,
  ViewChild,
} from '@angular/core'

import {
  MolPlacement,
  placeContentBefore,
  setElementPresent,
  type SlotReader,
  useAuth,
  useAuthClient,
  useI18nError,
  useLogin,
  useOAuth,
  type UseOAuthConfig,
  usePlacement,
  useSignup,
  useTranslation,
} from '@molecule/app-angular'
import { useAuthFormState } from '@molecule/app-auth-shell-angular'
import { OAuthButtons, OAuthDivider } from '@molecule/app-oauth-buttons-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { Button, Icon, Modal } from '@molecule/app-ui-angular'

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

/** React's shared input inline style; the font size follows the viewport. */
const INPUT_STYLE =
  'width: 100%; padding: 10px 12px; border-radius: 6px; border: 1px solid var(--mol-color-border, rgba(127,127,127,0.3)); background: var(--mol-color-surface-secondary, rgba(127,127,127,0.06)); color: inherit; outline: none;'

/**
 * AuthModal component.
 *
 * In-app login / signup tabs rendered in a Modal overlay — the user
 * authenticates without leaving the current page (no navigation, no lost
 * work). React renders the Modal or nothing: everything the host holds (the
 * `<mol-modal>` element) renders in the host's place and the host itself
 * leaves the page, while the dialog itself portals to the body exactly as
 * React's does. The captcha slot is
 * projected content (`[slot=captchaSlot]`), or a `TemplateRef` passed as the
 * `captchaSlot` input. Reuses the Angular auth hooks (`useLogin` /
 * `useSignup` / `useOAuth` / `useAuth`) so behavior matches the standalone
 * `/login` and `/signup` pages.
 */
@Component({
  selector: 'mol-auth-modal',
  standalone: true,
  hostDirectives: [MolPlacement],
  imports: [Button, Modal, Icon, NgTemplateOutlet, OAuthButtons, OAuthDivider],
  inputs: [
    'open',
    'onClose',
    'initialMode',
    'oauthConfig',
    'onBeforeAuth',
    'onAuthenticated',
    'captchaSlot',
    'captchaSolved',
  ],
  // prettier-ignore
  template: `<mol-modal [open]="open" [title]="title()" [size]="'sm'" (close)="chromeClose($event)" data-mol-id="auth-modal"><div data-mol-id="auth-modal-body" [style]="bodyStyle">@if (succeeded()) {<div data-mol-id="auth-modal-success" [style]="successStyle"><svg mol-icon-root [name]="'check-circle'" [size]="44" [className]="cm().textSuccess" [ariaHidden]="'true'"></svg><div [style]="headlineStyle">{{ successLabel() }}</div>@if (hasWho()) {<div [class]="cm().textMuted" [style]="whoStyle">{{ loggedInAs() }}</div>}</div>} @else {<div [class]="cm().textMuted" [style]="blurbStyle">{{ isSignup() ? signupBlurb() : loginBlurb() }}</div><form [style]="formStyle" (submit)="handleSubmit($event)">@if (isSignup()) {<input #nameEl type="text" [value]="name()" [attr.value]="name()" (input)="onNameInput($event)" autocomplete="name" data-mol-id="auth-modal-name" [attr.placeholder]="namePlaceholder()" [style]="fieldStyle()" />}<input #emailEl type="email" [value]="emailValue()" [attr.value]="emailValue()" (input)="onEmailInput($event)" autocomplete="email" required data-mol-id="auth-modal-email" [attr.placeholder]="emailPlaceholder()" [style]="fieldStyle()" /><input #passwordEl type="password" [value]="password()" [attr.value]="password()" (input)="onPasswordInput($event)" [attr.autocomplete]="isSignup() ? 'new-password' : 'current-password'" required data-mol-id="auth-modal-password" [attr.placeholder]="passwordPlaceholder()" [style]="fieldStyle()" />@if (!isSignup()) {<input #twoFactorEl type="text" inputmode="numeric" [value]="twoFactorToken()" [attr.value]="twoFactorToken()" (input)="onTwoFactorInput($event)" autocomplete="one-time-code" data-mol-id="auth-modal-2fa" [attr.placeholder]="twoFactorPlaceholder()" [style]="fieldStyle()" />}<div #captchaEl data-mol-id="auth-modal-captcha" [style]="captchaStyle">@if (captchaTemplate(); as tpl) {<ng-container [ngTemplateOutlet]="tpl"></ng-container>}<ng-content select="[slot=captchaSlot]"></ng-content></div><button mol-button [type]="'submit'" [size]="'lg'" [color]="'success'" [disabled]="busy() || (isSignup() && !captchaSolvedRead())" data-mol-id="auth-modal-submit" [style]="submitButtonStyle">{{ submitLabel() }}</button>@if (shownError(); as error) {<div [class]="cm().authFormError">{{ error }}</div>}</form>@if (oauthProviders().length > 0) {<div [style]="oauthSectionStyle"><div mol-oauth-divider></div><div mol-oauth-buttons [providers]="oauthProviders()" [onSelect]="selectProvider"></div></div>}<button type="button" data-mol-id="auth-modal-switch" (click)="switchMode()" [class]="switchClasses()" [style]="switchStyle">{{ switchLabel() }}</button>}</div></mol-modal>`,
})
export class AuthModal implements AfterViewChecked, DoCheck {
  /** Whether the modal is open. */
  open = false
  /** Close without authenticating (backdrop / Escape / ✕). */
  onClose?: () => void
  /** Which form to open on (React's `useState(initialMode)`: read once). */
  initialMode?: AuthModalMode
  /**
   * OAuth config consumed by `useOAuth()` — `{ baseURL, oauthProviders, oauthEndpoint }`
   * from the app's `config.ts`. Drives the popup OAuth buttons.
   */
  oauthConfig?: UseOAuthConfig
  /** Run synchronously BEFORE any login/signup/OAuth attempt. Optional. */
  onBeforeAuth?: () => void
  /** Run AFTER a successful login/signup/OAuth (the session is already refreshed). Optional. */
  onAuthenticated?: () => void | Promise<void>
  /** A human-verification challenge rendered inside the SIGNUP form, as projected `[slot=captchaSlot]` content or a `TemplateRef`. Optional. */
  captchaSlot?: TemplateRef<unknown>
  /** Whether the `captchaSlot` challenge is solved; `false` disables the signup submit. Defaults to `true`. Ignored in login mode. */
  captchaSolved?: boolean

  /** The email input element — the dialog pattern's focus target. */
  @ViewChild('emailEl') private emailEl?: ElementRef<HTMLInputElement>
  /** The name input (signup only). */
  @ViewChild('nameEl') private nameEl?: ElementRef<HTMLInputElement>
  /** The password input. */
  @ViewChild('passwordEl') private passwordEl?: ElementRef<HTMLInputElement>
  /** The two-factor input (login only). */
  @ViewChild('twoFactorEl') private twoFactorEl?: ElementRef<HTMLInputElement>
  /** The captcha wrapper (detached when React would not render it). */
  @ViewChild('captchaEl') private captchaEl?: ElementRef<HTMLElement>

  private readonly injector = inject(Injector)
  private readonly host: ElementRef<HTMLElement> = inject(ElementRef)

  /** i18n state; its `t` reads the provider on every call. */
  private readonly i18n = useTranslation()
  /** Auth actions (`refresh`), subscribed to client changes. */
  private readonly auth = useAuth()
  /** The auth client (its session is the success view's source of truth). */
  private readonly authClient = useAuthClient()
  /** Login state and action (React's `useLogin`). */
  private readonly loginHook = useLogin()
  /** Signup state and action (React's `useSignup`). */
  private readonly signupHook = useSignup()
  /** Cross-view email persistence (React's `useAuthFormState`). */
  private readonly formState = useAuthFormState()

  /** React's `useState(initialMode)`: read once, then owned by the component. */
  private readonly mode = signal<AuthModalMode>('signup')
  private readonly passwordSignal = signal('')
  private readonly nameSignal = signal('')
  private readonly twoFactorSignal = signal('')
  private readonly oauthError = signal<string | null>(null)
  /** Post-auth confirmation shown briefly before the modal closes. */
  readonly succeeded = signal(false)
  /** Set when `open` flips true; applied after the Modal's own focus work. */
  private pendingFocus = false
  private lastOpen = false

  /** Popup OAuth (React's `useOAuth`); a computed over the input signal keeps the closures live. */
  private readonly oauthConfigSignal = signal<UseOAuthConfig | undefined>(undefined)
  private lastOauthConfig: UseOAuthConfig | undefined
  private readonly oauth = useOAuth(
    computed((): UseOAuthConfig => ({
      ...this.oauthConfigSignal(),
      onSuccess: (): void => {
        // Surface a finishAuth failure (no session established) in the modal
        // instead of dying as an unhandled rejection.
        this.finishAuth().catch((error: unknown) => {
          this.oauthError.set(error instanceof Error ? error.message : String(error))
        })
      },
      onError: (message: string): void => {
        this.oauthError.set(message)
      },
    })),
  )

  /**
   * The error of the shown mode, mirrored into a signal: the auth hooks carry
   * plain getters (React re-renders a fresh state into the same hook result,
   * this port mutates it in place), so a computed reading them directly would
   * cache its first value and never show a failure. ngDoCheck writes the
   * current error here before the view is checked.
   */
  private readonly modeError = signal<Error | null | undefined>(undefined)
  /** The i18n-translated error of the shown mode (React's `useI18nError`). */
  private readonly i18nError = useI18nError(this.modeError)

  /** Whether the shown form is the signup one. */
  isSignup(): boolean {
    return this.mode() === 'signup'
  }

  /** The busy flag of the shown mode (React's `busy`). */
  busy(): boolean {
    return (this.isSignup() ? this.signupHook.status : this.loginHook.status) === 'pending'
  }

  /** The error line the form shows (hook error first, then the OAuth one). */
  shownError(): string | null {
    return this.i18nError() || this.oauthError()
  }

  /**
   * React's `captchaSolved = true` default: only an explicit `false` gates the
   * submit.
   * @returns Whether the challenge is solved.
   */
  captchaSolvedRead(): boolean {
    return this.captchaSolved !== false
  }

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /** Seeds the mode from `initialMode` once, exactly as React's `useState` does. */
  ngOnInit(): void {
    this.mode.set(this.initialMode ?? 'signup')
  }

  /** Re-reconciles the hook config and arms the open-focus after input writes. */
  ngDoCheck(): void {
    // Inputs are written after construction, while `useOAuth` builds its state
    // in the field initializers — so the config reaches the hook through this
    // signal, written once per changed input and read live by `providers`.
    if (this.oauthConfig !== this.lastOauthConfig) {
      this.lastOauthConfig = this.oauthConfig
      this.oauthConfigSignal.set(this.oauthConfig)
    }
    // The open flip arms the email focus; it is APPLIED after the render
    // (scheduled from ngAfterViewChecked, so it registers after the Modal
    // child's own deferred focus move and wins, React's child-effects-first
    // ordering).
    const open = !!this.open
    if (open && !this.lastOpen) this.pendingFocus = true
    this.lastOpen = open
    // The hook's error is mutated in place (no signal), so it is mirrored for
    // the translated line before the view is checked.
    this.modeError.set(this.isSignup() ? this.signupHook.error : this.loginHook.error)
  }

  /**
   * Applies the armed focus after every check and copies the controlled
   * values onto their attributes. The captcha wrapper is reconciled by the
   * placement function, so a wrapper the mode switch just re-created follows
   * React's DOM without waiting for a hook.
   */
  ngAfterViewChecked(): void {
    this.syncInputValues()
    // The focus lands after the render so the Modal child — whose own focus
    // move is also deferred — has settled first, as React's child-effects-first
    // ordering leaves the email field focused.
    if (this.pendingFocus) {
      this.pendingFocus = false
      if (this.open) afterNextRender(() => this.focusEmailAfterOpen(), { injector: this.injector })
    }
  }

  /** Focuses the email field when the modal opened, once the view has rendered. */
  private focusEmailAfterOpen(): void {
    if (this.open) this.emailEl?.nativeElement.focus()
  }

  /**
   * Copies each controlled value onto its `value` attribute: react-dom applies
   * a controlled input's value through the live property AND the attribute,
   * while an Angular `[value]` binding writes the property only.
   */
  private syncInputValues(): void {
    this.applyInputValue(this.nameEl?.nativeElement, this.name())
    this.applyInputValue(this.emailEl?.nativeElement, this.emailValue())
    this.applyInputValue(this.passwordEl?.nativeElement, this.password())
    this.applyInputValue(this.twoFactorEl?.nativeElement, this.twoFactorToken())
  }

  /**
   * Applies one controlled value to an input the way react-dom does.
   *
   * @param input - The input element, when the current form renders it.
   * @param text - The controlled value.
   */
  private applyInputValue(input: HTMLInputElement | undefined, text: string): void {
    if (!input) return
    if (input.value !== text) input.value = text
    if (input.getAttribute('value') !== text) input.setAttribute('value', text)
  }

  /**
   * Detaches the captcha wrapper React would not render.
   *
   * @param hasContent - Reads whether a slot has content.
   */
  private sync(hasContent: SlotReader): void {
    const captcha = this.captchaEl?.nativeElement
    setElementPresent(
      captcha,
      this.isSignup() && (hasContent(captcha) || this.captchaTemplate() !== null),
    )
  }

  /**
   * The email input's controlled value (React reads `fields.email ?? ''`).
   * @returns The email text.
   */
  emailValue(): string {
    return this.formState.fields().email ?? ''
  }

  /** The name field's controlled value. */
  name(): string {
    return this.nameSignal()
  }

  /** The password field's controlled value. */
  password(): string {
    return this.passwordSignal()
  }

  /** The two-factor field's controlled value. */
  twoFactorToken(): string {
    return this.twoFactorSignal()
  }

  /** The OAuth config's providers, read live. */
  oauthProviders(): string[] {
    return this.oauth.providers
  }

  /**
   * Universal post-auth: refresh the session (guards + plan current), show a
   * brief confirmation, run the app's hook, then close — all in place, no
   * navigation.
   */
  private async finishAuth(): Promise<void> {
    try {
      await this.auth.refresh()
    } catch (error) {
      // Every path into finishAuth (password login/signup response, OAuth popup
      // relay) has already established the session client-side, so the refresh
      // is a freshness pass — a failure here (e.g. an API with neither a
      // refresh endpoint nor cookie restore) must NOT strand an authenticated
      // user in the modal with their account already created. Only a genuinely
      // absent session is a real failure.
      if (!this.authClient.isAuthenticated()) throw error
    }
    this.succeeded.set(true)
    // Hold the confirmation on screen while the app hook runs; whichever
    // finishes last gates the close.
    const minDisplay = new Promise((resolve) => setTimeout(resolve, SUCCESS_DISPLAY_MS))
    await this.onAuthenticated?.()
    await minDisplay
    this.onClose?.()
  }

  /**
   * The form's submit: run `onBeforeAuth`, sign in / sign up through the hooks,
   * clear the shared email and finish in place. Auth errors are captured in
   * the hooks' error state and shown below — deliberately NO navigation.
   *
   * @param event - The submit event.
   */
  async handleSubmit(event: Event): Promise<void> {
    event.preventDefault()
    this.onBeforeAuth?.()
    try {
      if (this.isSignup()) {
        await this.signupHook.signup({
          email: this.emailValue(),
          password: this.password(),
          name: this.name() || undefined,
        })
      } else {
        await this.loginHook.login({ email: this.emailValue(), password: this.password() })
      }
      this.formState.clear()
      await this.finishAuth()
    } catch (_error) {
      // Auth errors are captured in the hooks' error state and shown below; we
      // deliberately do NOT navigate or reload on failure or success.
    }
  }

  /**
   * Popup OAuth select: clear the OAuth error, run `onBeforeAuth`, start the
   * popup flow — never navigates the host.
   *
   * @param provider - The provider button's id.
   */
  readonly selectProvider = (provider: string): void => {
    this.oauthError.set(null)
    this.onBeforeAuth?.()
    this.oauth.loginViaPopup(provider)
  }

  /**
   * Flips the mode (React's switch button).
   */
  switchMode(): void {
    this.mode.set(this.isSignup() ? 'login' : 'signup')
  }

  /**
   * Chrome close (backdrop / Escape / ✕): React hands the click event through
   * where one exists; the modal's `close` output carries it.
   *
   * @param event - The close trigger, when there was one.
   */
  chromeClose(event?: unknown): void {
    // React's Modal forwards the click event; the typed onClose takes none, and
    // a zero-parameter function is exactly what an optional-parameter type
    // accepts — so the same call reaches it with the event when there was one.
    const close: ((event?: unknown) => void) | undefined = this.onClose
    close?.(event)
  }

  /**
   * The email field input event — persists through the shared form state (React's `setField`).
   * @param event - The input event.
   */
  onEmailInput(event: Event): void {
    this.formState.setField('email', (event.target as HTMLInputElement).value)
  }

  /**
   * The name field input event (signup).
   * @param event - The input event.
   */
  onNameInput(event: Event): void {
    this.nameSignal.set((event.target as HTMLInputElement).value)
  }

  /**
   * The password field input event.
   * @param event - The input event.
   */
  onPasswordInput(event: Event): void {
    this.passwordSignal.set((event.target as HTMLInputElement).value)
  }

  /**
   * The two-factor token input event (login).
   * @param event - The input event.
   */
  onTwoFactorInput(event: Event): void {
    this.twoFactorSignal.set((event.target as HTMLInputElement).value)
  }

  /**
   * The captcha challenge as a template, when the caller passed one.
   * @returns The template, or null.
   */
  captchaTemplate(): TemplateRef<unknown> | null {
    return this.captchaSlot instanceof TemplateRef ? this.captchaSlot : null
  }

  /**
   * Who just authenticated — shown under the headline so the confirmation
   * names the account, not just the outcome.
   * @returns The profile display name, or ''.
   */
  whoJustAuthenticated(): string {
    const profile = this.authClient.getUser() as {
      name?: string | null
      email?: string | null
      username?: string | null
    } | null
    return profile?.name || profile?.email || profile?.username || ''
  }

  /**
   * Whether the success view shows the account row (React truthiness on the
   * profile name/email/username).
   * @returns True when a who line renders.
   */
  hasWho(): boolean {
    return this.whoJustAuthenticated() !== ''
  }

  // --- Labels (every `t()` runs in a template binding, so a locale switch
  // re-runs it the way React's render-time `t` call does). ---

  /** The dialog title. */
  title(): string {
    return this.isSignup()
      ? this.i18n.t('auth.modal.signupTitle', undefined, { defaultValue: 'Create your account' })
      : this.i18n.t('auth.modal.loginTitle', undefined, { defaultValue: 'Log in' })
  }

  /**
   * The signup blurb line above the form.
   * @returns The translated text.
   */
  signupBlurb(): string {
    return this.i18n.t('auth.modal.signupBlurb', undefined, {
      defaultValue: 'Sign up to keep your work.',
    })
  }

  /**
   * The login blurb line above the form.
   * @returns The translated text.
   */
  loginBlurb(): string {
    return this.i18n.t('auth.modal.loginBlurb', undefined, {
      defaultValue: 'Log in to keep your work.',
    })
  }

  /**
   * The name input's placeholder.
   * @returns The translated text.
   */
  namePlaceholder(): string {
    return this.i18n.t('auth.signup.name', undefined, { defaultValue: 'Name (optional)' })
  }

  /**
   * The email input's placeholder.
   * @returns The translated text.
   */
  emailPlaceholder(): string {
    return this.i18n.t('auth.login.email', undefined, { defaultValue: 'Email' })
  }

  /**
   * The password input's placeholder.
   * @returns The translated text.
   */
  passwordPlaceholder(): string {
    return this.i18n.t('auth.login.password', undefined, { defaultValue: 'Password' })
  }

  /**
   * The two-factor input's placeholder.
   * @returns The translated text.
   */
  twoFactorPlaceholder(): string {
    return this.i18n.t('auth.login.twoFactor', undefined, {
      defaultValue: 'Two-Factor Token (If enabled)',
    })
  }

  /**
   * The submit button's label (busy, or the shown mode's verb).
   * @returns The translated text.
   */
  submitLabel(): string {
    if (this.busy()) {
      return this.i18n.t('auth.modal.working', undefined, { defaultValue: 'Just a moment…' })
    }
    return this.isSignup()
      ? this.i18n.t('auth.login.signUp', undefined, { defaultValue: 'Sign up' })
      : this.i18n.t('auth.login.logIn', undefined, { defaultValue: 'Log in' })
  }

  /**
   * The post-auth confirmation headline.
   * @returns The translated text.
   */
  successLabel(): string {
    return this.isSignup()
      ? this.i18n.t('auth.modal.signedUp', undefined, { defaultValue: 'Signed up!' })
      : this.i18n.t('auth.modal.loggedIn', undefined, { defaultValue: 'Logged in!' })
  }

  /**
   * The account line under the confirmation headline.
   * @returns The translated text.
   */
  loggedInAs(): string {
    return this.i18n.t(
      'auth.modal.loggedInAs',
      { who: this.whoJustAuthenticated() },
      { defaultValue: 'Logged in as {{who}}' },
    )
  }

  /**
   * The mode-switch button's label.
   * @returns The translated text.
   */
  switchLabel(): string {
    return this.isSignup()
      ? this.i18n.t('auth.modal.haveAccount', undefined, {
          defaultValue: 'Already have an account? Log in',
        })
      : this.i18n.t('auth.modal.needAccount', undefined, {
          defaultValue: "Don't have an account? Sign up",
        })
  }

  // --- Inline styles (React's exact declarations, written the way cssstyle
  // serializes them — shorthand zeros pre-expanded, Angular's setProperty
  // keeps strings verbatim). ---

  /** The body wrapper. */
  readonly bodyStyle = 'display: flex; flex-direction: column'

  /** The success view's centered stack (React's exact declarations). */
  readonly successStyle =
    'display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 26px 0px 18px; text-align: center'

  /** The headline line. */
  readonly headlineStyle = 'font-size: 17px; font-weight: 600'

  /** The muted "Logged in as …" line. */
  readonly whoStyle = 'font-size: 13px'

  /** The blurb line above the form. */
  readonly blurbStyle = 'margin-bottom: 12px; font-size: 13px; line-height: 1.45'

  /** The form's grid. */
  readonly formStyle = 'display: grid; gap: 10px'

  /** The captcha wrapper. */
  readonly captchaStyle = 'display: grid; margin-top: 2px'

  /** The submit button (the Button component takes a React-shaped style object). */
  readonly submitButtonStyle: Record<string, string> = { width: '100%', marginTop: '2px' }

  /** The OAuth section wrapper. */
  readonly oauthSectionStyle = 'margin-top: 4px'

  /** The mode-switch button. */
  readonly switchStyle = 'margin-top: 12px; align-self: center'

  /** The email input's style; the font size follows the viewport class. */
  fieldStyle(): string {
    return `${INPUT_STYLE} font-size: ${this.touchFirst() ? '16px' : '14px'}`
  }

  /** Whether the viewport is phone-width or touch-first (see {@link touchFirst}). */
  private readonly touchFirstSignal = signal(
    typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia(TOUCH_FIRST_QUERY).matches,
  )

  constructor() {
    // React renders the Modal or nothing: everything the host holds renders in the
    // host's place and the host itself leaves the page (the Modal portals to the body).
    usePlacement((hasContent) => {
      placeContentBefore(this.host.nativeElement, this.host.nativeElement)
      setElementPresent(this.host.nativeElement, false)
      this.sync(hasContent)
    })
    // React's local hook reads the query at mount and subscribes to `change`
    // (rotation, a resize across the breakpoint); the Angular port mirrors
    // both, unsubscribing on destroy.
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
    const mql = window.matchMedia(TOUCH_FIRST_QUERY)
    const onChange = (e: MediaQueryListEvent): void => {
      this.touchFirstSignal.set(e.matches)
    }
    this.touchFirstSignal.set(mql.matches)
    mql.addEventListener('change', onChange)
    inject(DestroyRef).onDestroy(() => {
      mql.removeEventListener('change', onChange)
    })
  }

  /**
   * Whether {@link TOUCH_FIRST_QUERY} currently matches — phones (narrow
   * viewport) or touch-first devices (coarse primary pointer), the contexts
   * where a sub-16px input font makes iOS Safari zoom the page on focus.
   * @returns True on phone-width or touch-first devices.
   */
  touchFirst(): boolean {
    return this.touchFirstSignal()
  }

  /**
   * The switch button's class list (React's `cm.button({ variant: 'ghost',
   * size: 'sm' })`).
   * @returns The class string.
   */
  switchClasses(): string {
    const cm = this.cm()
    return cm.cn(cm.button({ variant: 'ghost', size: 'sm' }))
  }
}
