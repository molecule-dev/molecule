/**
 * TiersUpgradeSection component (React parity).
 *
 * @module
 */

import { Component, DestroyRef, inject, signal } from '@angular/core'

import { useHttpClient, useTranslation } from '@molecule/app-angular'
import { serverErrorMessage } from '@molecule/app-http'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { Alert, Button, ConfirmButton, Flex, Modal } from '@molecule/app-ui-angular'
import { openUrl } from '@molecule/app-utilities'

/** One tier price as the section renders it (React's local `TierPrice`). */
export interface TierPrice {
  stripePriceId?: string
  interval: string
  priceLabel: string
}

/** One upgrade tier with its subscribe-able prices (React's local `Tier`). */
export interface Tier {
  planKey: string
  name: string
  prices: TierPrice[]
}

/**
 * TiersUpgradeSection component.
 *
 * Billing section with full multi-tier upgrade flow. React's root is a
 * fragment (the `<section>` plus the upgrade modal), so the host is unwrapped
 * by the DOM normalizer and `display: contents` keeps the layout
 * fragment-like.
 *
 * Replaces the simpler `BillingSection` for apps backed by
 * `@molecule/api-payments-stripe` + `@molecule/api-resource-payment` — loads
 * the user's current plan from `/api/billing/status`, loads available tiers
 * from `/api/billing/tiers`, and renders an Upgrade modal with a Subscribe
 * button per tier price. Subscribe POSTs to `/api/billing/checkout` and
 * redirects to the Stripe checkout URL; paid users see a Cancel button that
 * POSTs to `/api/billing/cancel`. A refused request shows the server's
 * message.
 */
@Component({
  selector: 'mol-tiers-upgrade-section',
  standalone: true,
  imports: [Alert, Button, ConfirmButton, Flex, Modal],
  inputs: ['redirectToCheckout'],
  host: {
    'data-parity-unwrap': '',
    style: 'display: contents',
  },
  template: `<section>
      <h3 [class]="cm.cn(cm.sectionHeading, cm.sp('mb', 3))">
        {{ t('settings.billing', undefined, { defaultValue: 'Billing' }) }}
      </h3>
      <div mol-flex [align]="'center'" [justify]="'between'">
        <span [class]="cm.textSize('sm')"
          >{{ t('settings.plan', undefined, { defaultValue: 'Plan: ' })
          }}<strong>{{ plan() }}</strong></span
        >
        @if (planKey() === 'free') {
          <button mol-button [variant]="'outline'" [size]="'sm'" (click)="showUpgrade.set(true)">
            {{ t('settings.upgrade', undefined, { defaultValue: 'Upgrade' }) }}
          </button>
        } @else {
          <button
            mol-confirm-button
            [variant]="'outline'"
            [size]="'sm'"
            [onConfirm]="cancelSubscription"
            data-mol-id="billing-cancel-subscription"
          >
            <ng-container ngProjectAs="[slot=label]">{{
              t('settings.billing.cancel', undefined, { defaultValue: 'Cancel' })
            }}</ng-container
            ><ng-container ngProjectAs="[slot=confirmLabel]">{{
              t('settings.billing.cancelConfirm', undefined, {
                defaultValue: 'Cancel your subscription?',
              })
            }}</ng-container>
          </button>
        }
      </div>
    </section>
    <mol-modal
      [open]="showUpgrade()"
      (close)="showUpgrade.set(false)"
      [title]="t('settings.billing.upgradeTitle', undefined, { defaultValue: 'Upgrade your plan' })"
    >
      @if (upgradeError(); as checkoutError) {
        <div mol-alert [status]="'error'" [className]="cm.sp('mb', 4)">{{ checkoutError }}</div>
      }
      @if (tiers().length === 0) {
        <p [class]="cm.cn(cm.textSize('sm'), cm.textMuted)">
          {{
            t('settings.billing.noTiers', undefined, { defaultValue: 'No paid plans configured.' })
          }}
        </p>
      } @else {
        <ul [class]="cm.stack(3)">
          @for (entry of subscribeEntries(); track entry.key) {
            <li [class]="cm.sp('p', 4)">
              <div mol-flex [align]="'center'" [justify]="'between'">
                <div>
                  <p [class]="cm.fontWeight('semibold')">
                    {{ entry.tier.name }} ({{ entry.price.interval }})
                  </p>
                  <p [class]="cm.cn(cm.textSize('xs'), cm.textMuted)">
                    {{ entry.price.priceLabel }}
                  </p>
                </div>
                <button
                  mol-button
                  [size]="'sm'"
                  [loading]="upgradeLoading() === entry.price.stripePriceId"
                  (click)="startCheckout(entry.price.stripePriceId)"
                >
                  {{ t('settings.billing.subscribe', undefined, { defaultValue: 'Subscribe' }) }}
                </button>
              </div>
            </li>
          }
        </ul>
      }
    </mol-modal>`,
})
export class TiersUpgradeSection {
  /**
   * How the page leaves for the checkout URL the server returns. Defaults to
   * a full-page navigation (`openUrl`); an app passes its own opener (React's
   * `redirectToCheckout` prop).
   */
  redirectToCheckout: (checkoutUrl: string) => void = openUrl

  /** Reactive translation, read in the injection context. */
  protected readonly i18n = useTranslation()

  /** The translation function for the template. */
  protected t = this.i18n.t

  private readonly http = useHttpClient()

  /** The user's current plan name. */
  protected readonly plan = signal('Free')
  /** The user's current plan key. */
  protected readonly planKey = signal('free')
  /** The tiers loaded from `/api/billing/tiers`. */
  protected readonly tiers = signal<Tier[]>([])
  /** Whether the upgrade modal is open. */
  protected readonly showUpgrade = signal(false)
  /** The price id whose checkout request is running, or null. */
  protected readonly upgradeLoading = signal<string | null>(null)
  /** The upgrade modal's error message. */
  protected readonly upgradeError = signal('')

  /** The bonded ClassMap (styling tokens resolve at render time). */
  protected readonly cm: UIClassMap = getClassMap()

  /**
   * The (tier, price) pairs the modal lists: every paid tier's prices that
   * carry a stripe price id (React's filter + flatMap).
   * @returns The entries.
   */
  protected subscribeEntries(): { key: string; tier: Tier; price: TierPrice }[] {
    const entries: { key: string; tier: Tier; price: TierPrice }[] = []
    for (const tier of this.tiers()) {
      if (tier.planKey === 'free') continue
      for (const price of tier.prices) {
        if (!price.stripePriceId) continue
        entries.push({ key: `${tier.planKey}-${price.stripePriceId}`, tier, price })
      }
    }
    return entries
  }

  /**
   * Loads the current plan and the available tiers on mount (React's mount
   * effect): each fetch resolves null on failure and the mapping keeps the
   * defaults instead of throwing. A result that lands after unmount is
   * dropped like React's cancelled one.
   */
  constructor() {
    let cancelled = false
    inject(DestroyRef).onDestroy(() => {
      cancelled = true
    })
    void Promise.all([
      // Each fetch resolves null on failure; the .then handler then keeps the
      // defaults ('Free', empty tier list) instead of throwing.
      this.http
        .get<{ planKey?: string; name?: string }>('/api/billing/status')
        .catch((_error) => null),
      this.http
        .get<{
          data?: Array<{
            key: string
            name: string
            prices: Array<{ stripePriceId: string | null; period: string; price: string }>
          }>
        }>('/api/billing/tiers')
        .catch((_error) => null),
    ])
      .then(([statusRes, tiersRes]) => {
        if (cancelled) return
        const status = statusRes?.data ?? null
        if (status?.name) this.plan.set(status.name)
        if (status?.planKey) this.planKey.set(status.planKey)
        const list = tiersRes?.data?.data ?? []
        if (Array.isArray(list)) {
          this.tiers.set(
            list.map((tier) => ({
              planKey: tier.key,
              name: tier.name,
              prices: (tier.prices || []).map((p) => ({
                stripePriceId: p.stripePriceId ?? undefined,
                interval: p.period,
                priceLabel: p.price,
              })),
            })),
          )
        }
      })
      .catch((_error) => {
        // Fetch failures already resolve to null above; this only guards the
        // mapping, keeping the section on its defaults rather than throwing.
      })
  }

  /**
   * Starts the checkout for one price (React's `handleStartCheckout`).
   * @param stripePriceId - The price to subscribe to.
   */
  protected async startCheckout(stripePriceId: string | undefined): Promise<void> {
    if (!stripePriceId) return
    this.upgradeError.set('')
    this.upgradeLoading.set(stripePriceId)
    try {
      const res = await this.http.post<{ checkoutUrl?: string; updated?: boolean }>(
        '/api/billing/checkout',
        { priceId: stripePriceId },
      )
      const data = res.data
      if (data?.checkoutUrl) {
        this.redirectToCheckout(data.checkoutUrl)
        return
      }
      if (data?.updated) {
        this.showUpgrade.set(false)
        return
      }
      this.upgradeError.set(
        this.t('settings.billing.checkoutFailed', undefined, {
          defaultValue: 'Could not start checkout.',
        }),
      )
    } catch (err) {
      this.upgradeError.set(
        serverErrorMessage(err) ??
          this.t('settings.billing.checkoutFailed', undefined, {
            defaultValue: 'Could not start checkout.',
          }),
      )
    } finally {
      this.upgradeLoading.set(null)
    }
  }

  /**
   * Cancels the subscription (React's `handleCancelSubscription`); a failure
   * shows the server's message and keeps the plan.
   */
  protected cancelSubscription = async (): Promise<void> => {
    this.upgradeError.set('')
    try {
      await this.http.post('/api/billing/cancel', {})
      this.plan.set('Free')
      this.planKey.set('free')
    } catch (err) {
      this.upgradeError.set(
        serverErrorMessage(err) ??
          this.t('settings.billing.cancelFailed', undefined, {
            defaultValue: 'Could not cancel.',
          }),
      )
    }
  }
}
