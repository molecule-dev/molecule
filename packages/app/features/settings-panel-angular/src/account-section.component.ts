/**
 * AccountSection component (React parity).
 *
 * @module
 */

import {
  type AfterViewInit,
  Component,
  computed,
  effect,
  ElementRef,
  untracked,
  ViewChild,
} from '@angular/core'

import { useAuthClient, useProfileForm, useTranslation } from '@molecule/app-angular'
import type { UserProfile } from '@molecule/app-auth'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { Flex, Input, Spinner } from '@molecule/app-ui-angular'

/** The controlled values the account form edits (React's local `AccountValues`). */
export interface AccountValues {
  name: string
  email: string
}

/**
 * AccountSection component.
 *
 * Account fields over the shared profile lifecycle. Background validation uses
 * the auth client's configured route, mapping and session ownership guards.
 *
 * `UserProfile.email` is optional (phone/handle accounts have none), so email
 * is validated only when non-empty and a blank email is never sent: clearing
 * the field leaves the stored address untouched, and a name-only account can
 * still save its name.
 *
 * The host IS the `<section>` React renders. Blur-to-save is wired on the
 * `<form>` (`focusout` bubbles from the inputs, which the Angular `Input`
 * component does not re-emit) and dispatches on the blurred control's id —
 * exactly React's per-input `saveOnBlur`.
 *
 * The email input's `aria-invalid` / `aria-describedby` are synced onto its
 * native control by an effect, the way React's rest props do
 * (`aria-invalid={emailError ? …} : undefined` — absent when valid, so the
 * attribute must be REMOVED, which the UI `Input`'s own always-on binding
 * cannot express); this mirrors what the UI package's `FormField` does when it
 * patches a control directly.
 */
@Component({
  selector: 'section[mol-settings-account]',
  standalone: true,
  imports: [Flex, Input, Spinner],
  template: `<div mol-flex [align]="'center'" [gap]="'sm'" [className]="cm.sp('mb', 3)">
      <h3 [class]="cm.sectionHeading">
        {{ t('settings.account', undefined, { defaultValue: 'Account' }) }}
      </h3>
      @if (profile.isSubmitting()) {
        <div mol-spinner [size]="'xs'"></div>
      }
    </div>
    <form [class]="cm.stack(3)" (submit)="submitForm($event)" (focusout)="saveOnFormBlur($event)">
      <div>
        <label for="settings-name" [class]="cm.formLabelSmall">{{
          t('settings.name', undefined, { defaultValue: 'Name' })
        }}</label>
        <div
          mol-input
          #nameField
          [id]="'settings-name'"
          type="text"
          autocomplete="name"
          [size]="'sm'"
          [value]="nameValue()"
          [name]="'name'"
          (change)="nameChange($event)"
        ></div>
      </div>
      <div>
        <label for="settings-email" [class]="cm.formLabelSmall">{{
          t('settings.email', undefined, { defaultValue: 'Email' })
        }}</label>
        <div
          mol-input
          #emailField
          [id]="'settings-email'"
          type="email"
          autocomplete="email"
          [size]="'sm'"
          [value]="emailValue()"
          [name]="'email'"
          (change)="emailChange($event)"
        ></div>
        @if (emailError(); as fieldError) {
          <p
            id="settings-email-error"
            role="alert"
            [class]="cm.cn(cm.textSize('xs'), cm.textError, cm.sp('mt', 1))"
          >
            {{ fieldError }}
          </p>
        }
        @if (saveError(); as submitError) {
          <p role="alert" [class]="cm.cn(cm.textSize('xs'), cm.textError, cm.sp('mt', 1))">
            {{ submitError }}
          </p>
        }
      </div>
    </form>`,
})
export class AccountSection implements AfterViewInit {
  /** The account fields over the shared profile lifecycle. */
  protected readonly profile = useProfileForm<UserProfile, AccountValues>({
    defaultValues: { name: '', email: '' },
    toValues: (user) => ({ name: user.name ?? '', email: user.email ?? '' }),
    toPatch: ({ email, ...changes }) => (email ? { ...changes, email } : changes),
  })

  /** The name field's registration (its onChange marks the field edited). */
  protected readonly nameReg = this.profile.register('name')
  /** The email field's registration, with the email format validation. */
  protected readonly emailReg = this.profile.register('email', { email: true })

  /** Reactive translation, read in the injection context. */
  protected readonly i18n = useTranslation()

  private readonly authClient = useAuthClient<UserProfile>()

  /** The name field's host (the native control is looked up inside it). */
  @ViewChild('nameField', { read: ElementRef }) nameField?: ElementRef<HTMLElement>
  /** The email field's host. */
  @ViewChild('emailField', { read: ElementRef }) emailField?: ElementRef<HTMLElement>

  /** The bonded ClassMap (styling tokens resolve at render time). */
  protected readonly cm: UIClassMap = getClassMap()

  /** The translation function for the template. */
  protected t = this.i18n.t

  /** The name field's controlled value (form state is the change signal). */
  protected readonly nameValue = computed(() => {
    void this.profile.formState()
    return this.profile.getValue('name')
  })

  /** The email field's controlled value. */
  protected readonly emailValue = computed(() => {
    void this.profile.formState()
    return this.profile.getValue('email')
  })

  /** The email field's validation message, or null when valid. */
  protected readonly emailError = computed(() => {
    void this.profile.formState()
    return this.profile.getError('email') ?? null
  })

  /** The latest save failure's display text, or null. */
  protected readonly saveError = computed((): string | null => {
    const error = this.profile.error()
    if (!error) return null
    return error instanceof Error
      ? error.message
      : this.t('settings.failedToUpdateProfile', undefined, {
          defaultValue: 'Failed to update profile',
        })
  })

  /** The cached native email control (re-resolved when the view is rebuilt). */
  private emailControl: HTMLInputElement | null = null

  /**
   * Starts the auth client's background session validation (React's mount
   * effect) and wires the email control's aria sync. The client owns the
   * route, response mapping and stale-read guards; an older account read must
   * not publish over a save or a different session.
   */
  constructor() {
    // A provider's background validation must not cause an unhandled
    // rejection: render its auth state while useProfileForm reports mutation
    // failures.
    void this.authClient.validateSession?.().catch((_error) => {})
    // React's rest props on the email input: present with the error target
    // while the field is invalid, REMOVED while valid. An effect (view hooks
    // are skipped by signal-driven refreshes) keeps it exact.
    effect(() => {
      const error = this.emailError()
      untracked(() => this.syncEmailAria(error))
    })
  }

  /** Applies the initial rest-prop state (hooks run on the mount passes). */
  ngAfterViewInit(): void {
    const name = this.nameField?.nativeElement.querySelector('input')
    if (name) this.nameReg.ref?.(name)
    this.resolveEmailControl()
    this.syncEmailAria(this.emailError())
  }

  /**
   * Forwards the field's `change` (React's text-input onChange).
   * @param event - The native input event the UI Input re-emitted.
   */
  protected nameChange(event: Event): void {
    this.nameReg.onChange(event)
  }

  /**
   * Forwards the field's `change` (React's text-input onChange).
   * @param event - The native input event the UI Input re-emitted.
   */
  protected emailChange(event: Event): void {
    this.emailReg.onChange(event)
  }

  /**
   * Submits the form (React's `profile.formProps` onSubmit).
   * @param event - The native submit event.
   */
  protected submitForm(event: Event): void {
    this.profile.formProps.onSubmit(event)
  }

  /**
   * Saves on blur, exactly React's per-input `saveOnBlur`: the field's
   * registration blur first (touch + field validation), then the profile
   * submit.
   * @param event - The bubbling focusout from one of the two inputs.
   */
  protected saveOnFormBlur(event: FocusEvent): void {
    const id = (event.target as HTMLElement | null)?.id
    if (id === 'settings-name') this.saveOnBlur(this.nameReg)
    else if (id === 'settings-email') this.saveOnBlur(this.emailReg)
  }

  /**
   * React's `saveOnBlur` wrapper: one blur, then one submit.
   * @param registration - The blurred field's registration.
   */
  private saveOnBlur(registration: { onBlur: () => void }): void {
    registration.onBlur()
    void this.profile.submit()
  }

  /**
   * Looks the native email control up inside the UI `Input`'s host and
   * registers it as the field ref (React's spread `ref`, so a failed submit
   * focuses the first invalid field).
   */
  private resolveEmailControl(): void {
    this.emailControl =
      (this.emailField?.nativeElement.querySelector('input') as HTMLInputElement | null) ?? null
    if (this.emailControl) this.emailReg.ref?.(this.emailControl)
  }

  /**
   * Applies React's rest-prop state for one error value: `aria-invalid` and
   * `aria-describedby` on the native control while invalid, removed while
   * valid.
   * @param error - The field's validation message, or null.
   */
  private syncEmailAria(error: string | null): void {
    this.resolveEmailControl()
    const control = this.emailControl
    if (!control) return
    if (error) {
      control.setAttribute('aria-invalid', 'true')
      control.setAttribute('aria-describedby', 'settings-email-error')
    } else {
      control.removeAttribute('aria-invalid')
      control.removeAttribute('aria-describedby')
    }
  }
}
