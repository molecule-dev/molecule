/**
 * LogOutDeleteSection component (React parity).
 *
 * @module
 */

import { Component, signal } from '@angular/core'

import { useAuth, useHttpClient, useRouter, useTranslation } from '@molecule/app-angular'
import type { UserProfile } from '@molecule/app-auth'
import { serverErrorMessage } from '@molecule/app-http'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { Alert, Button, Input, Modal } from '@molecule/app-ui-angular'

import { useSettingsPanelContext } from './context.js'

/**
 * LogOutDeleteSection component.
 *
 * Bottom actions section — Log out + Delete account. React's root is a
 * fragment (the `<section>` plus the delete-account modal), so the host is
 * unwrapped by the DOM normalizer and `display: contents` keeps the layout
 * fragment-like.
 *
 * Owns the delete-account modal internally (the trigger lives in the
 * same section so the modal lives here too). Reads `onClose` from
 * the `<SettingsContainer>` context to dismiss the panel after either
 * action and navigates to `/login`.
 */
@Component({
  selector: 'mol-log-out-delete-section',
  standalone: true,
  imports: [Alert, Button, Input, Modal],
  host: {
    'data-parity-unwrap': '',
    style: 'display: contents',
  },
  template: `<section [class]="cm.stack(3)">
      <button
        mol-button
        [color]="'error'"
        [fullWidth]="true"
        (click)="logout()"
        data-mol-id="user-menu-logout"
      >
        {{ t('settings.logOut', undefined, { defaultValue: 'Sign out' }) }}
      </button>
      <button
        mol-button
        [variant]="'ghost'"
        [fullWidth]="true"
        (click)="showModal.set(true)"
        data-mol-id="user-menu-delete-account"
      >
        {{ t('settings.deleteAccount', undefined, { defaultValue: 'Delete account' }) }}
      </button>
    </section>
    <mol-modal
      [open]="showModal()"
      (close)="showModal.set(false)"
      [title]="
        t('settings.deleteAccountModal.title', undefined, { defaultValue: 'Delete Account' })
      "
    >
      <p [class]="cm.cn(cm.textSize('sm'), cm.textMuted, cm.sp('mb', 4))">
        {{
          t('settings.deleteAccountModal.warning', undefined, {
            defaultValue: 'This action cannot be undone. Please enter your password to confirm.',
          })
        }}
      </p>
      @if (deleteError(); as submitError) {
        <div mol-alert [status]="'error'" [className]="cm.sp('mb', 4)">{{ submitError }}</div>
      }
      <form [class]="cm.stack(4)" (submit)="deleteAccount($event)">
        <div>
          <label for="delete-pw" [class]="cm.formLabel">{{
            t('settings.deleteAccountModal.password', undefined, { defaultValue: 'Password' })
          }}</label>
          <div
            mol-input
            [id]="'delete-pw'"
            type="password"
            [required]="true"
            [value]="password()"
            (change)="password.set($any($event.target).value)"
          ></div>
        </div>
        <button mol-button type="submit" [color]="'error'" [fullWidth]="true" [loading]="loading()">
          @if (loading()) {
            {{
              t('settings.deleteAccountModal.deleting', undefined, { defaultValue: 'Deleting...' })
            }}
          } @else {
            {{ t('settings.deleteAccount', undefined, { defaultValue: 'Delete account' }) }}
          }
        </button>
      </form>
    </mol-modal>`,
})
export class LogOutDeleteSection {
  /** Reactive translation, read in the injection context. */
  protected readonly i18n = useTranslation()

  /** The translation function for the template. */
  protected t = this.i18n.t

  /** The binding's router (throws outside one, like react-router's useNavigate). */
  private readonly router = useRouter()

  /** The signed-in user and the auth actions. */
  private readonly auth = useAuth<UserProfile>()

  private readonly http = useHttpClient()

  /** The container's `onClose` (throws outside a `<SettingsContainer>`). */
  private readonly panel = useSettingsPanelContext()

  /** Whether the delete-account modal is open. */
  protected readonly showModal = signal(false)
  /** The delete-account password field's value. */
  protected readonly password = signal('')
  /** Whether the delete request is running. */
  protected readonly loading = signal(false)
  /** The delete-account modal's error message. */
  protected readonly deleteError = signal('')

  /** The bonded ClassMap (styling tokens resolve at render time). */
  protected readonly cm: UIClassMap = getClassMap()

  /** Signs out, closes the panel and returns to `/login` (React's `handleLogout`). */
  protected async logout(): Promise<void> {
    await this.auth.logout()
    this.panel.onClose()
    this.router.navigate('/login')
  }

  /**
   * Deletes the account (React's `handleDelete`): submits the password,
   * signs out, closes the panel and returns to `/login`; a failure shows the
   * server's message and keeps the modal.
   * @param event - The native submit event.
   */
  protected async deleteAccount(event: Event): Promise<void> {
    event.preventDefault()
    this.loading.set(true)
    this.deleteError.set('')
    try {
      await this.http.delete(`/api/users/${this.auth.user()?.id}`, {
        data: { password: this.password() },
      })
      await this.auth.logout()
      this.panel.onClose()
      this.router.navigate('/login')
    } catch (err) {
      this.deleteError.set(
        serverErrorMessage(err) ??
          this.t('settings.failedToDeleteAccount', undefined, {
            defaultValue: 'Failed to delete account.',
          }),
      )
    } finally {
      this.loading.set(false)
    }
  }
}
