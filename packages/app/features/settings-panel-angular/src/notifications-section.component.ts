/**
 * NotificationsSection component (React parity).
 *
 * @module
 */

import {
  type AfterViewInit,
  Component,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  signal,
  untracked,
  ViewChild,
} from '@angular/core'

import { useHttpClient, useTranslation } from '@molecule/app-angular'
import { usePush } from '@molecule/app-angular/push'
import type { PushToggleResult } from '@molecule/app-push'
import {
  disablePushOnCurrentDevice,
  enablePushOnCurrentDevice,
  readCurrentDevicePushEnabled,
} from '@molecule/app-push'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { Flex, Switch } from '@molecule/app-ui-angular'

import { ControlledSwitchSync } from './controlled-switch.js'

/**
 * NotificationsSection component.
 *
 * Push-notification toggle section — the full receive-side enable chain:
 * browser permission → runtime VAPID public key
 * (`GET /api/devices/push/public-key`) → `pushManager.subscribe` with
 * `applicationServerKey` → PATCH the subscription onto the current device
 * row (`/api/devices/:id { pushSubscription, hasPushSubscription }`), which
 * is where the api-side push fan-outs look for it. The host IS the
 * `<section>` React renders.
 *
 * Initial state reflects SERVER truth (the current device row's
 * `hasPushSubscription`), and every failure surfaces as an honest inline
 * message — a dev build without a service worker fails fast instead of
 * hanging the switch.
 */
@Component({
  selector: 'section[mol-settings-notifications]',
  standalone: true,
  imports: [Flex, Switch],
  template: `<h3 [class]="cm.cn(cm.sectionHeading, cm.sp('mb', 3))">
      {{ t('settings.notifications', undefined, { defaultValue: 'Notifications' }) }}
    </h3>
    <div mol-flex [align]="'center'" [justify]="'between'">
      <span [class]="cm.textSize('sm')">{{
        t('settings.pushNotifications', undefined, { defaultValue: 'Push notifications' })
      }}</span>
      <mol-switch
        #pushSwitch
        [checked]="enabled()"
        [disabled]="busy()"
        [attr.aria-label]="
          t('settings.pushNotifications', undefined, { defaultValue: 'Push notifications' })
        "
        (change)="pushToggleChanged($event)"
        [size]="'sm'"
        data-mol-id="settings-push-toggle"
      ></mol-switch>
    </div>
    @if (error(); as pushError) {
      <p
        [class]="cm.cn(cm.textSize('xs'), cm.textError, cm.sp('mt', 1))"
        role="alert"
        data-mol-id="settings-push-error"
      >
        {{ pushError }}
      </p>
    }`,
})
export class NotificationsSection implements AfterViewInit {
  /** Reactive translation, read in the injection context. */
  protected readonly i18n = useTranslation()

  /** The translation function for the template. */
  protected t = this.i18n.t

  private readonly http = useHttpClient()

  /** The push provider's permission/registration actions. */
  private readonly push = usePush()

  /** Whether the current device's push subscription is on. */
  protected readonly enabled = signal(false)
  /** Whether an enable/disable chain is running (the switch is disabled). */
  protected readonly busy = signal(false)
  /** The inline failure message, or null. */
  protected readonly error = signal<string | null>(null)

  /** The push switch's host element (the hidden checkbox lives inside). */
  @ViewChild('pushSwitch', { read: ElementRef }) pushSwitch?: ElementRef<HTMLElement>

  /** The controlled-`checked` sync (created once the host exists). */
  private sync?: ControlledSwitchSync

  /** The bonded ClassMap (styling tokens resolve at render time). */
  protected readonly cm: UIClassMap = getClassMap()

  /**
   * Reads the server's push state for THIS device (React's mount effect).
   * Resolves false (never throws) when the devices endpoint is unavailable;
   * a result that lands after unmount is dropped like React's cancelled one.
   */
  constructor() {
    let cancelled = false
    inject(DestroyRef).onDestroy(() => {
      cancelled = true
    })
    // Server truth for THIS device; resolves false (never throws) when the
    // devices endpoint is unavailable.
    void readCurrentDevicePushEnabled(this.http).then((serverEnabled) => {
      if (!cancelled && serverEnabled) this.enabled.set(true)
    })
    // React's controlled `checked` re-render, as an effect (view hooks are
    // skipped by signal-driven refreshes).
    effect(() => {
      const checked = this.enabled()
      untracked(() => this.runSync(checked))
    })
  }

  /** Captures the mount-time attribute state (hooks run on the mount passes). */
  ngAfterViewInit(): void {
    this.runSync(this.enabled())
  }

  /**
   * Runs the controlled-`checked` sync once the switch host exists.
   * @param checked - The controlled value this render shows.
   */
  private runSync(checked: boolean): void {
    if (!this.sync && this.pushSwitch) {
      this.sync = new ControlledSwitchSync(this.pushSwitch.nativeElement)
    }
    this.sync?.sync(checked)
  }

  /**
   * The switch's change: the hidden checkbox's `checked` at emit time (React
   * reads `e.target.checked` before its controlled restore).
   * @param event - The native change event the UI Switch re-emitted.
   */
  protected pushToggleChanged(event: Event): void {
    const checked = (event.target as HTMLInputElement | null)?.checked ?? false
    void this.handleToggle(checked)
  }

  /**
   * The localized message for one toggle failure (React's `failureMessage`).
   * @param result - The failed toggle result.
   * @returns The message text.
   */
  private failureMessage(result: Extract<PushToggleResult, { ok: false }>): string {
    switch (result.reason) {
      case 'permission-denied':
        return this.t('settings.pushPermissionDenied', undefined, {
          defaultValue: 'Notification permission was denied.',
        })
      case 'server-unconfigured':
        return this.t('settings.pushServerUnavailable', undefined, {
          defaultValue: 'Push notifications are not configured on this server.',
        })
      case 'register-failed':
        // The push provider throws already-localized messages (not supported /
        // no service worker in a dev build / push-service rejection).
        return (
          result.message ||
          this.t('settings.pushUpdateFailed', undefined, {
            defaultValue: 'Could not update push notification settings.',
          })
        )
      case 'persist-failed':
        // `result.message` here is the HTTP client's error (a status line or a
        // network error), not text written for the user, so it is not shown.
        return this.t('settings.pushUpdateFailed', undefined, {
          defaultValue: 'Could not update push notification settings.',
        })
    }
  }

  /**
   * Runs one enable/disable chain (React's `handleToggle`).
   * @param next - Whether the switch turned on.
   */
  private async handleToggle(next: boolean): Promise<void> {
    if (this.busy()) return
    this.busy.set(true)
    this.error.set(null)
    try {
      if (next) {
        const result = await enablePushOnCurrentDevice({
          http: this.http,
          requestPermission: this.push.requestPermission,
          register: this.push.register,
        })
        if (result.ok) {
          this.enabled.set(true)
        } else {
          this.error.set(this.failureMessage(result))
        }
      } else {
        const result = await disablePushOnCurrentDevice({
          http: this.http,
          unregister: this.push.unregister,
        })
        // The switch goes off locally either way; a failed server clear is
        // still reported so the user knows sends may continue.
        this.enabled.set(false)
        if (!result.ok) {
          this.error.set(this.failureMessage(result))
        }
      }
    } finally {
      this.busy.set(false)
    }
  }
}
