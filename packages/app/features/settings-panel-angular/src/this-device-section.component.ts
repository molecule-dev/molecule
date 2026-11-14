/**
 * ThisDeviceSection component (React parity).
 *
 * @module
 */

import { Component, computed } from '@angular/core'

import { useDevice, useTranslation } from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { Flex } from '@molecule/app-ui-angular'

/**
 * ThisDeviceSection component.
 *
 * "This device" detail strip — OS, browser, online/offline. The host IS the
 * `<section>` React renders.
 *
 * Reads everything from `@molecule/app-device` through the `useDevice` hook
 * (`deviceInfo` and `isOnline()`), so the bonded device provider decides what
 * it shows. No side effects, no app-specific state.
 *
 * The network line's `isOnline()` call is mediated by a `computed` over the
 * i18n notifications (its only change signal), so the provider is read once
 * per render — the same call count React's render records — and again on a
 * locale switch, exactly like a React re-render.
 */
@Component({
  selector: 'section[mol-settings-this-device]',
  standalone: true,
  imports: [Flex],
  template: `<h3 [class]="cm.cn(cm.sectionHeading, cm.sp('mb', 3))">
      {{ t('settings.thisDevice', undefined, { defaultValue: 'This Device' }) }}
    </h3>
    <dl [class]="cm.cn(cm.stack(1), cm.textSize('sm'))">
      <div mol-flex [justify]="'between'">
        <dt [class]="cm.textMuted">
          {{ t('settings.platform', undefined, { defaultValue: 'Platform' }) }}
        </dt>
        <dd>{{ platformLabel() }}</dd>
      </div>
      <div mol-flex [justify]="'between'">
        <dt [class]="cm.textMuted">
          {{ t('settings.browser', undefined, { defaultValue: 'Browser' }) }}
        </dt>
        <dd>{{ browserLabel() }}</dd>
      </div>
      <div mol-flex [justify]="'between'">
        <dt [class]="cm.textMuted">
          {{ t('settings.network', undefined, { defaultValue: 'Network' }) }}
        </dt>
        <dd>{{ networkLabel() }}</dd>
      </div>
    </dl>`,
})
export class ThisDeviceSection {
  /** The bonded device provider's info (read once, like React's memoized hook). */
  protected readonly device = useDevice()

  /** Reactive translation, read in the injection context. */
  protected readonly i18n = useTranslation()

  /** The translation function for the template. */
  protected t = this.i18n.t

  /** The bonded ClassMap (styling tokens resolve at render time). */
  protected readonly cm: UIClassMap = getClassMap()

  /** The OS name, or the localized Unknown fallback. */
  protected readonly platformLabel = computed(() => {
    return (
      this.device.deviceInfo.os.name ||
      this.t('settings.unknown', undefined, { defaultValue: 'Unknown' })
    )
  })

  /** The browser name, or the localized Unknown fallback. */
  protected readonly browserLabel = computed(() => {
    return (
      this.device.deviceInfo.browser.name ||
      this.t('settings.unknown', undefined, { defaultValue: 'Unknown' })
    )
  })

  /**
   * The network line: `isOnline()` runs when this computed first renders and
   * again whenever the locale changes (the t() calls track the i18n
   * notifications), matching React's per-render call exactly.
   */
  protected readonly networkLabel = computed(() => {
    return this.device.isOnline()
      ? this.t('settings.online', undefined, { defaultValue: 'Online' })
      : this.t('settings.offline', undefined, { defaultValue: 'Offline' })
  })
}
