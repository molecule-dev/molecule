/**
 * AuthSection component (React parity).
 *
 * @module
 */

import { Component, computed, DestroyRef, ElementRef, inject, signal } from '@angular/core'

import {
  MolPlacement,
  placeContentBefore,
  setElementPresent,
  useAuth,
  useChangePassword,
  useHttpClient,
  usePlacement,
  useTranslation,
} from '@molecule/app-angular'
import type { UserProfile } from '@molecule/app-auth'
import { serverErrorMessage } from '@molecule/app-http'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { Alert, Button, Flex, Input, Modal } from '@molecule/app-ui-angular'

/** The two-factor enrollment data `POST /users/:id/verify-two-factor` returns. */
export interface TwoFactorSetup {
  QRImageUrl?: string
  keyUrl?: string
  secret?: string
}

/**
 * AuthSection component.
 *
 * Authentication section — change password (modal) + two-factor (TOTP) setup.
 * React's root is a fragment (the `<section>` plus two modals) or nothing at
 * all for an OAuth-only user (React's `return null`); those nodes render in the
 * host's place and the host itself never appears in the page.
 *
 * Two-factor uses the real enrollment flow against the user resource's
 * `POST /users/:id/verify-two-factor` endpoint (`@molecule/api-two-factor`):
 * - Enable → `{action:'setup'}` returns a QR code + secret to scan into an
 *   authenticator app → user enters the 6-digit code → `{action:'enable', token}`.
 * - Disable → user enters a current code → `{action:'disable', token}`.
 * The current status is read from `/users/me`. (This replaces the previous
 * boolean toggle, which PATCHed `twoFactorEnabled` — a field the update
 * handler deliberately ignores — so it never actually enrolled 2FA.)
 *
 * Auto-hides for OAuth-only users (`user.oauthServer` truthy) since
 * password / 2FA wouldn't apply. If the app's API has no two-factor
 * provider bonded, setup fails gracefully with an inline message.
 *
 * `useChangePassword`'s state is a live getter over a plain object (the
 * Angular binding's `usePromise` port), so the pending/error reads are
 * mediated by a version signal the handlers bump at React's re-render points.
 */
@Component({
  selector: 'mol-auth-section',
  standalone: true,
  hostDirectives: [MolPlacement],
  imports: [Alert, Button, Flex, Input, Modal],
  // prettier-ignore
  template: `@if (!isOauthOnly()) {<section>
      <h3 [class]="cm.cn(cm.sectionHeading, cm.sp('mb', 3))">
        {{ t('settings.authentication', undefined, { defaultValue: 'Authentication' }) }}
      </h3>
      <div [class]="cm.stack(3)">
        <button
          mol-button
          [variant]="'outline'"
          [size]="'sm'"
          (click)="showPasswordModal.set(true)"
        >
          {{ t('settings.changePassword', undefined, { defaultValue: 'Change password' }) }}
        </button>
        <div mol-flex [align]="'center'" [justify]="'between'">
          <span [class]="cm.textSize('sm')">{{ t('settings.twoFactor', undefined, { defaultValue: 'Two-factor authentication' }) }}@if (twoFactorEnabled()) {<span [class]="cm.cn(cm.textSize('xs'), cm.textSubtle, cm.sp('ml', 2))">{{ t('settings.twoFactorOn', undefined, { defaultValue: 'On' }) }}</span>}</span>
          @if (twoFactorEnabled()) {
            <button
              mol-button
              [variant]="'outline'"
              [size]="'sm'"
              (click)="openDisableTf()"
              data-mol-id="two-factor-disable"
            >
              {{ t('settings.twoFactorDisable', undefined, { defaultValue: 'Disable' }) }}
            </button>
          } @else {
            <button
              mol-button
              [variant]="'outline'"
              [size]="'sm'"
              (click)="startEnable()"
              data-mol-id="two-factor-enable"
            >
              {{ t('settings.twoFactorEnable', undefined, { defaultValue: 'Enable' }) }}
            </button>
          }
        </div>
      </div>
    </section>
    <mol-modal
      [open]="showPasswordModal()"
      (close)="closePasswordModal()"
      [title]="
        t('settings.changePasswordModal.title', undefined, { defaultValue: 'Change Password' })
      "
    >
      @if (pwError(); as changeError) {
        <div mol-alert [status]="'error'" [className]="cm.sp('mb', 4)">{{ changeError }}</div>
      }
      <form [class]="cm.stack(4)" (submit)="submitPassword($event)">
        <div>
          <label for="current-pw" [class]="cm.formLabel">{{
            t('settings.changePasswordModal.currentPassword', undefined, {
              defaultValue: 'Current Password',
            })
          }}</label>
          <div
            mol-input
            [id]="'current-pw'"
            type="password"
            autocomplete="current-password"
            [required]="true"
            [value]="currentPassword()"
            (change)="currentPassword.set($any($event.target).value)"
          ></div>
        </div>
        <div>
          <label for="new-pw" [class]="cm.formLabel">{{
            t('settings.changePasswordModal.newPassword', undefined, {
              defaultValue: 'New Password',
            })
          }}</label>
          <div
            mol-input
            [id]="'new-pw'"
            type="password"
            autocomplete="new-password"
            [required]="true"
            [value]="newPassword()"
            (change)="newPassword.set($any($event.target).value)"
          ></div>
        </div>
        <button mol-button type="submit" [fullWidth]="true" [loading]="pwStatus() === 'pending'">
          @if (pwStatus() === 'pending') {
            {{
              t('settings.changePasswordModal.changing', undefined, { defaultValue: 'Changing...' })
            }}
          } @else {
            {{ t('settings.changePassword', undefined, { defaultValue: 'Change password' }) }}
          }
        </button>
      </form>
    </mol-modal>
    <mol-modal [open]="tfModal() !== null" (close)="closeTf()" [title]="tfTitle()">
      @if (tfError(); as tfFailure) {
        <div mol-alert [status]="'error'" [className]="cm.sp('mb', 4)">{{ tfFailure }}</div>
      }
      @if (tfModal() === 'enable' && tfSetup()?.QRImageUrl) {
        <div [class]="cm.cn(cm.stack(3), cm.sp('mb', 4))">
          <p [class]="cm.cn(cm.textSize('sm'), cm.textMuted)">
            {{
              t('settings.twoFactorScan', undefined, {
                defaultValue:
                  'Scan this QR code with your authenticator app, then enter the 6-digit code.',
              })
            }}
          </p>
          <img
            [attr.src]="tfSetup()?.QRImageUrl"
            [attr.alt]="
              t('settings.twoFactorQrAlt', undefined, { defaultValue: 'Two-factor QR code' })
            "
            [class]="cm.cn(cm.mxAuto, cm.maxW('xs'))"
          />
          @if (tfSetup()?.secret) {
            <p [class]="cm.cn(cm.textSize('xs'), cm.textSubtle, cm.settingsPanelTwoFactorSecret)">
              {{ tfSetup()?.secret }}
            </p>
          }
        </div>
      }
      @if (tfModal() === 'disable' || tfSetup()) {
        <form [class]="cm.stack(4)" (submit)="submitTfForm($event)">
          <div>
            <label for="tf-token" [class]="cm.formLabel">{{
              t('settings.twoFactorCode', undefined, { defaultValue: 'Authentication code' })
            }}</label>
            <div
              mol-input
              [id]="'tf-token'"
              type="text"
              autocomplete="one-time-code"
              [required]="true"
              [value]="tfToken()"
              (change)="tfToken.set($any($event.target).value)"
            ></div>
          </div>
          <button
            mol-button
            type="submit"
            [color]="tfModal() === 'disable' ? 'error' : 'primary'"
            [fullWidth]="true"
            [loading]="tfLoading()"
          >
            @if (tfModal() === 'disable') {
              {{ t('settings.twoFactorDisable', undefined, { defaultValue: 'Disable' }) }}
            } @else {
              {{ t('settings.twoFactorVerify', undefined, { defaultValue: 'Verify & enable' }) }}
            }
          </button>
        </form>
      }
    </mol-modal>}`,
})
export class AuthSection {
  /** The signed-in user (React's `useAuth().user`). */
  protected readonly auth = useAuth<UserProfile>()

  /** Reactive translation, read in the injection context. */
  protected readonly i18n = useTranslation()

  /** The translation function for the template. */
  protected t = this.i18n.t

  private readonly http = useHttpClient()

  /** The change-password flow's live state and action. */
  private readonly pw = useChangePassword()

  /** Whether the change-password modal is open. */
  protected readonly showPasswordModal = signal(false)
  /** The current-password field's value. */
  protected readonly currentPassword = signal('')
  /** The new-password field's value. */
  protected readonly newPassword = signal('')

  /** Whether two-factor is enabled (read from `/users/me`). */
  protected readonly twoFactorEnabled = signal(false)
  /** The open two-factor modal: `'enable'`, `'disable'` or null. */
  protected readonly tfModal = signal<null | 'enable' | 'disable'>(null)
  /** The enrollment setup data (QR image + secret). */
  protected readonly tfSetup = signal<TwoFactorSetup | null>(null)
  /** The two-factor code field's value. */
  protected readonly tfToken = signal('')
  /** Whether a two-factor request is running. */
  protected readonly tfLoading = signal(false)
  /** The two-factor modal's error message. */
  protected readonly tfError = signal('')

  /** React's re-render points for `useChangePassword`'s plain state object. */
  private readonly pwVersion = signal(0)

  /** The change-password flow's pending state (version-mediated). */
  protected readonly pwStatus = computed(() => {
    void this.pwVersion()
    return this.pw.status
  })

  /** The change-password flow's error (version-mediated). */
  protected readonly pwError = computed((): string | null => {
    void this.pwVersion()
    const error = this.pw.error
    if (!error) return null
    return (
      error.message ||
      this.t('settings.changePasswordModal.error', undefined, {
        defaultValue: 'Failed to change password.',
      })
    )
  })

  private readonly twoFactorRead = { cancelled: false }

  private readonly host: ElementRef<HTMLElement> = inject(ElementRef)

  /** The section (React's `<section>` root). */

  /** The bonded ClassMap (styling tokens resolve at render time). */
  protected readonly cm: UIClassMap = getClassMap()

  /**
   * Whether the signed-in user is OAuth-only (the section renders nothing).
   * @returns True when the user's `oauthServer` is truthy.
   */
  protected isOauthOnly(): boolean {
    return !!this.auth.user()?.oauthServer
  }

  /**
   * The two-factor modal's title (React's ternary).
   * @returns The title text.
   */
  protected tfTitle(): string {
    return this.tfModal() === 'disable'
      ? this.t('settings.twoFactorDisableTitle', undefined, {
          defaultValue: 'Disable two-factor authentication',
        })
      : this.t('settings.twoFactorEnableTitle', undefined, {
          defaultValue: 'Enable two-factor authentication',
        })
  }

  /**
   * Reads the persisted 2FA status from `/users/me` on mount (React's mount
   * effect); status read is best-effort and defaults to disabled. A result
   * that lands after unmount is dropped like React's cancelled one.
   */
  constructor() {
    usePlacement(() => {
      // React's fragment (the section plus two modals) or nothing: the whole
      // template renders in the host's place and the host leaves the page.
      placeContentBefore(this.host.nativeElement, this.host.nativeElement)
      setElementPresent(this.host.nativeElement, false)
    })
    const read = this.twoFactorRead
    inject(DestroyRef).onDestroy(() => {
      read.cancelled = true
    })
    void this.http
      .get<{ props?: { twoFactorEnabled?: boolean }; twoFactorEnabled?: boolean }>('/api/users/me')
      .then((res) => {
        if (read.cancelled) return
        const body = (res as { data?: Record<string, unknown> }).data ?? res
        const u = ((body as { props?: Record<string, unknown> }).props ?? body) as {
          twoFactorEnabled?: boolean
        }
        this.twoFactorEnabled.set(Boolean(u?.twoFactorEnabled))
      })
      .catch((_error) => {
        /* status read is best-effort; defaults to disabled */
      })
  }

  /**
   * Closes the change-password modal (React's `onClose`): hides it and
   * returns the change-password flow to idle.
   */
  protected closePasswordModal(): void {
    this.showPasswordModal.set(false)
    this.pw.reset()
    this.pwVersion.update((version) => version + 1)
  }

  /**
   * Opens the disable-two-factor modal (React's disable button handler).
   */
  protected openDisableTf(): void {
    this.tfError.set('')
    this.tfToken.set('')
    this.tfModal.set('disable')
  }

  /**
   * Starts the two-factor enrollment (React's `startEnable`): fetches the QR
   * setup and opens the enable modal.
   */
  protected async startEnable(): Promise<void> {
    this.tfError.set('')
    this.tfLoading.set(true)
    this.tfModal.set('enable')
    const userId = this.auth.user()?.id
    try {
      const res = await this.http.post<TwoFactorSetup>(`/api/users/${userId}/verify-two-factor`, {
        action: 'setup',
      })
      const data = ((res as { data?: TwoFactorSetup }).data ?? res) as TwoFactorSetup
      this.tfSetup.set(data)
    } catch (err) {
      this.tfError.set(
        serverErrorMessage(err) ??
          this.t('settings.twoFactorUnavailable', undefined, {
            defaultValue: 'Two-factor authentication is not available for this app.',
          }),
      )
    } finally {
      this.tfLoading.set(false)
    }
  }

  /**
   * Submits the two-factor code (React's `submitTf`).
   * @param action - Whether the code enables or disables two-factor.
   */
  private async submitTf(action: 'enable' | 'disable'): Promise<void> {
    this.tfError.set('')
    this.tfLoading.set(true)
    const userId = this.auth.user()?.id
    try {
      await this.http.post(`/api/users/${userId}/verify-two-factor`, {
        action,
        token: this.tfToken(),
      })
      this.twoFactorEnabled.set(action === 'enable')
      this.closeTf()
    } catch (err) {
      this.tfError.set(
        serverErrorMessage(err) ??
          this.t('settings.twoFactorInvalidCode', undefined, { defaultValue: 'Invalid code' }),
      )
    } finally {
      this.tfLoading.set(false)
    }
  }

  /**
   * The two-factor modal form's submit (React's inline onSubmit).
   * @param event - The native submit event.
   */
  protected submitTfForm(event: Event): void {
    event.preventDefault()
    void this.submitTf(this.tfModal() === 'disable' ? 'disable' : 'enable')
  }

  /**
   * Closes the two-factor modal (React's `closeTf`).
   */
  protected closeTf(): void {
    this.tfModal.set(null)
    this.tfSetup.set(null)
    this.tfToken.set('')
    this.tfError.set('')
  }

  /**
   * Submits the change-password form (React's `handleChangePassword`).
   * @param event - The native submit event.
   */
  protected async submitPassword(event: Event): Promise<void> {
    event.preventDefault()
    this.pwVersion.update((version) => version + 1)
    try {
      await this.pw.changePassword(this.currentPassword(), this.newPassword())
      this.showPasswordModal.set(false)
      this.currentPassword.set('')
      this.newPassword.set('')
      this.pw.reset()
    } catch (_error) {
      // Error tracked in hook state — useChangePassword surfaces it via `error`.
    } finally {
      this.pwVersion.update((version) => version + 1)
    }
  }
}
