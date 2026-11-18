/**
 * DevicesSection component (React parity).
 *
 * @module
 */

import { NgTemplateOutlet } from '@angular/common'
import { Component, DestroyRef, inject, signal, type TemplateRef } from '@angular/core'

import { useHttpClient, useTranslation } from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { Button, Flex, Icon, Spinner } from '@molecule/app-ui-angular'

import type { Device } from './types.js'

/** Props for `DevicesSection` — the same props React's `DevicesSection` accepts. */
export interface DevicesSectionProps {
  /**
   * Custom trailing element per device row, replacing the built-in revoke
   * control. It is a template in Angular (its context carries the device as
   * `$implicit`); pass an empty template to suppress the control entirely.
   */
  renderRowIcon?: TemplateRef<unknown> | null
}

/**
 * DevicesSection component.
 *
 * Devices section — lists the user's registered devices and lets them
 * revoke (sign out) any device other than the one they're currently using.
 * The host IS the `<section>` React renders.
 *
 * Revoking deletes the device row (`DELETE /api/devices/:id`). The API's
 * authorization layer enforces server-side revocation: it rejects that
 * device's session the next time it makes a request (within the
 * device-exists cache TTL), so the removed device is actually signed out —
 * not just hidden from the list. The current device is labelled
 * "This device" and is not revocable here (use Sign out for the current
 * session). Recreates molecule v1's device-revocation behaviour.
 *
 * Apps that want a different trailing element per row can pass a
 * `renderRowIcon` template (its context carries the device as `$implicit`
 * and `a0`, the way the conformance kit maps a React render function), which
 * then replaces the built-in revoke control; pass an empty template to
 * suppress it entirely.
 */
@Component({
  selector: 'section[mol-settings-devices]',
  standalone: true,
  imports: [Button, Flex, Icon, NgTemplateOutlet, Spinner],
  inputs: ['renderRowIcon'],
  // prettier-ignore
  template: `<div mol-flex [align]="'center'" [gap]="'sm'" [className]="cm.sp('mb', 3)">
      <h3 [class]="cm.sectionHeading">
        {{ t('settings.devices', undefined, { defaultValue: 'Devices' }) }}
      </h3>
      @if (loading()) {
        <div mol-spinner [size]="'xs'"></div>
      }
    </div>
    @if (devices().length > 0) {
      <ul [class]="cm.stack(2)">
        @for (device of devices(); track device.id) {
          <li>
            <div
              mol-flex
              [align]="'center'"
              [justify]="'between'"
              [className]="cm.cn(cm.textSize('sm'), cm.sp('py', 1))"
            >
              <span>{{ device.name || device.platform }}@if (device.isCurrent) {<span [class]="cm.cn(cm.textSize('xs'), cm.textSubtle, cm.sp('ml', 2))">{{ t('settings.thisDevice', undefined, { defaultValue: 'This Device' }) }}</span>}</span>
              @if (renderRowIcon) {
                <ng-container
                  [ngTemplateOutlet]="renderRowIcon"
                  [ngTemplateOutletContext]="rowContext(device)"
                />
              } @else if (device.isCurrent) {
                <svg
                  mol-icon-root
                  [name]="'chevron-right'"
                  [size]="16"
                  [className]="cm.textSubtle"
                ></svg>
              } @else if (isConfirming(device)) {
                <div mol-flex [align]="'center'" [gap]="'sm'">
                  <button
                    mol-button
                    [variant]="'ghost'"
                    [size]="'sm'"
                    [disabled]="isRevoking(device)"
                    (click)="confirmingId.set(null)"
                  >
                    {{ t('common.cancel', undefined, { defaultValue: 'Cancel' }) }}
                  </button>
                  <button
                    mol-button
                    [color]="'error'"
                    [size]="'sm'"
                    [loading]="isRevoking(device)"
                    (click)="revoke(device.id)"
                    data-mol-id="device-revoke-confirm"
                  >
                    {{ t('settings.signOutDevice', undefined, { defaultValue: 'Sign out' }) }}
                  </button>
                </div>
              } @else {
                <button
                  mol-button
                  [variant]="'ghost'"
                  [size]="'sm'"
                  (click)="confirmingId.set(device.id)"
                  data-mol-id="device-revoke"
                >
                  {{ t('settings.signOutDevice', undefined, { defaultValue: 'Sign out' }) }}
                </button>
              }
            </div>
            @if (isConfirming(device)) {
              <p [class]="cm.cn(cm.textSize('xs'), cm.textMuted, cm.sp('mt', 1))">
                {{
                  t('settings.revokeDeviceWarning', undefined, {
                    defaultValue: "This device's access will be revoked shortly. Sign it out?",
                  })
                }}
              </p>
            }
          </li>
        }
      </ul>
    } @else {
      @if (!loading()) {
        <p [class]="cm.cn(cm.textSize('sm'), cm.textMuted)">
          {{ t('settings.noDevices', undefined, { defaultValue: 'No devices found' }) }}
        </p>
      }
    }`,
})
export class DevicesSection {
  /**
   * A custom trailing element per row (React's `renderRowIcon` callback).
   * The template's context carries the device as `$implicit` / `a0`; giving
   * one replaces the built-in revoke control.
   */
  renderRowIcon?: TemplateRef<unknown> | null

  /** Reactive translation, read in the injection context. */
  protected readonly i18n = useTranslation()

  /** The translation function for the template. */
  protected t = this.i18n.t

  private readonly http = useHttpClient()

  /** The registered devices. */
  protected readonly devices = signal<Device[]>([])
  /** Whether the device list is loading. */
  protected readonly loading = signal(true)
  /** The id of the row showing its revoke confirmation. */
  protected readonly confirmingId = signal<string | null>(null)
  /** The id of the device whose revoke request is running. */
  protected readonly revokingId = signal<string | null>(null)

  /** The bonded ClassMap (styling tokens resolve at render time). */
  protected readonly cm: UIClassMap = getClassMap()

  /**
   * Whether one row shows its revoke confirmation.
   * @param device - The row's device.
   * @returns True when the row is confirming.
   */
  protected isConfirming(device: Device): boolean {
    return this.confirmingId() === device.id
  }

  /**
   * Whether one row's revoke request is running.
   * @param device - The row's device.
   * @returns True when the row is revoking.
   */
  protected isRevoking(device: Device): boolean {
    return this.revokingId() === device.id
  }

  /**
   * The template context for one row's custom renderer (the way the
   * conformance kit maps a React render function: `$implicit` = the first
   * argument, `a0`… the argument list).
   * @param device - The row's device.
   * @returns The template context.
   */
  protected rowContext(device: Device): Record<string, unknown> {
    return { $implicit: device, a0: device, a1: undefined, a2: undefined }
  }

  /**
   * Loads the devices (React's `load`): GET /api/devices responds with the
   * ARRAY itself (see the device resource's query handler) — response.data IS
   * the rows. This used to read `response.data.data`, which is always
   * undefined for that shape, so the section rendered "No devices" for
   * everyone. Devices endpoint is optional; the section renders empty when
   * unavailable.
   */
  private async load(): Promise<void> {
    try {
      const response = await this.http.get<Device[]>('/api/devices')
      this.devices.set(Array.isArray(response.data) ? response.data : [])
    } catch (_error) {
      // Devices endpoint is optional; the section renders empty when unavailable.
    } finally {
      this.loading.set(false)
    }
  }

  /** Loads once on mount (React's mount effect). */
  constructor() {
    inject(DestroyRef)
    void this.load()
  }

  /**
   * Signs one device out and reloads (React's `revoke`); best-effort — the
   * row is kept so the user can retry the revoke.
   * @param id - The device row's id.
   */
  protected async revoke(id: string): Promise<void> {
    this.revokingId.set(id)
    try {
      await this.http.delete(`/api/devices/${id}`)
      this.confirmingId.set(null)
      await this.load()
    } catch (_error) {
      // Best-effort — keep the row so the user can retry the revoke.
    } finally {
      this.revokingId.set(null)
    }
  }
}
