/**
 * BillingSection component (React parity).
 *
 * @module
 */

import { Component, DestroyRef, inject, signal } from '@angular/core'

import { useHttpClient, useRouter, useTranslation } from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { Button, Flex } from '@molecule/app-ui-angular'

/**
 * BillingSection component.
 *
 * Billing section — current plan + Upgrade button. The host IS the
 * `<section>` React renders.
 *
 * Fetches `/api/billing/status` on mount and uses the returned plan name as a
 * more accurate label than the parent-supplied default. The `plan` input
 * remains a fallback (e.g. for offline rendering or apps that don't expose
 * `/billing/status`).
 *
 * The Upgrade button navigates to `upgradeTo` (default `/settings`). Pass
 * `upgradeTo="/billing"` or `upgradeTo="/pricing"` if your app routes
 * elsewhere. Apps with a multi-tier checkout flow should use
 * `TiersUpgradeSection` instead.
 */
@Component({
  selector: 'section[mol-settings-billing]',
  standalone: true,
  imports: [Button, Flex],
  inputs: ['plan', 'upgradeTo'],
  template: `<h3 [class]="cm.cn(cm.sectionHeading, cm.sp('mb', 3))">
      {{ t('settings.billing', undefined, { defaultValue: 'Billing' }) }}
    </h3>
    <div mol-flex [align]="'center'" [justify]="'between'">
      <span [class]="cm.textSize('sm')"
        >{{ t('settings.plan', undefined, { defaultValue: 'Plan: ' })
        }}<strong>{{ planLabel() }}</strong></span
      >
      <button mol-button [variant]="'outline'" [size]="'sm'" (click)="upgrade()">
        {{ t('settings.upgrade', undefined, { defaultValue: 'Upgrade' }) }}
      </button>
    </div>`,
})
export class BillingSection {
  /** Fallback plan name when `/api/billing/status` is unavailable. */
  plan = 'Free'
  /** Route the Upgrade button navigates to. */
  upgradeTo = '/settings'

  /** Reactive translation, read in the injection context. */
  protected readonly i18n = useTranslation()

  /** The translation function for the template. */
  protected t = this.i18n.t

  private readonly http = useHttpClient()

  /** The binding's router (throws outside one, like react-router's useNavigate). */
  private readonly router = useRouter()

  /** The plan name loaded from `/api/billing/status`, or null. */
  private readonly livePlan = signal<string | null>(null)

  /** The bonded ClassMap (styling tokens resolve at render time). */
  protected readonly cm: UIClassMap = getClassMap()

  /**
   * The displayed plan label (React's `livePlan ?? plan`).
   * @returns The plan name.
   */
  protected planLabel(): string {
    return this.livePlan() ?? this.plan
  }

  /**
   * Reads the current plan from the bonded entitlements/billing status
   * endpoint on mount (React's mount effect). Fire-and-forget; the
   * input-supplied `plan` is the fallback if the fetch fails. A result that
   * lands after unmount is dropped like React's cancelled one.
   */
  constructor() {
    let cancelled = false
    inject(DestroyRef).onDestroy(() => {
      cancelled = true
    })
    void this.http
      .get<{ name?: string }>('/api/billing/status')
      .then((res) => {
        if (cancelled) return
        const body =
          (res as { data?: { name?: string }; name?: string }).data ?? (res as { name?: string })
        const name = body?.name
        if (typeof name === 'string' && name) this.livePlan.set(name)
      })
      .catch((_error) => {
        // fallback to the input-supplied plan label
      })
  }

  /** Navigates to the upgrade route (React's `navigate(upgradeTo)`). */
  protected upgrade(): void {
    this.router.navigate(this.upgradeTo)
  }
}
