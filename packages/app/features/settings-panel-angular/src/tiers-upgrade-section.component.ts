/**
 * TiersUpgradeSection component (React parity).
 *
 * @module
 */

import { Component, DestroyRef, ElementRef, inject, signal } from '@angular/core'

import {
  MolPlacement,
  placeContentBefore,
  setElementPresent,
  useHttpClient,
  usePlacement,
  useTranslation,
} from '@molecule/app-angular'
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
 * fragment (the `<section>` plus the upgrade modal), so those nodes render in
 * the host's place and the host itself never appears in the page.
 *
 * Replaces the simpler `BillingSection` for apps backed by
 * `@molecule/api-payments-stripe` + `@molecule/api-resource-payment` — loads
 * the user's current plan from `/api/billing/status`, loads available tiers
 * from `/api/billing/tiers`, and renders an Upgrade modal with a Subscribe
 * button per price that is for sale (one the server lists with a price id).
 * Upgrade appears only for a free user and only when something is for sale.
 * Subscribe POSTs to `/api/billing/checkout` and redirects to the checkout
 * URL; a paid user (`isFree: false` in the status) sees a Cancel button that
 * POSTs to `/api/billing/cancel`. A refused request shows the server's
 * message.
 */
@Component({
  selector: 'mol-tiers-upgrade-section',
  standalone: true,
  hostDirectives: [MolPlacement],
  imports: [Alert, Button, ConfirmButton, Flex, Modal],
  inputs: ['redirectToCheckout'],
  template: `<section>
      <h3 [class]="cm.cn(cm.sectionHeading, cm.sp('mb', 3))">
        {{ t('settings.billing', undefined, { defaultValue: 'Billing' }) }}
      </h3>
      <div mol-flex [align]="'center'" [justify]="'between'">
        <!-- The plan line waits for the server: there is no plan name to guess. -->
        @if (plan(); as planName) {
          <span [class]="cm.textSize('sm')"
            >{{ t('settings.plan', undefined, { defaultValue: 'Plan: ' })
            }}<strong>{{ planName }}</strong></span
          >
        } @else {
          <span></span>
        }
        @if (isFree()) {
          @if (forSale().length > 0) {
            <button mol-button [variant]="'outline'" [size]="'sm'" (click)="showUpgrade.set(true)">
              {{ t('settings.upgrade', undefined, { defaultValue: 'Upgrade' }) }}
            </button>
          }
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
      @if (cancelError(); as cancelMessage) {
        <div mol-alert [status]="'error'" [className]="cm.sp('mt', 3)">{{ cancelMessage }}</div>
      }
    </section>
    <mol-modal
      [open]="showUpgrade()"
      (close)="showUpgrade.set(false)"
      [title]="t('settings.billing.upgradeTitle', undefined, { defaultValue: 'Upgrade your plan' })"
    >
      @if (upgradeError(); as checkoutError) {
        <div mol-alert [status]="'error'" [className]="cm.sp('mb', 4)">{{ checkoutError }}</div>
      }
      <ul [class]="cm.stack(3)">
        @for (entry of forSale(); track entry.key) {
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
                [loading]="upgradeLoading() === entry.priceId"
                (click)="startCheckout(entry.priceId)"
              >
                {{ t('settings.billing.subscribe', undefined, { defaultValue: 'Subscribe' }) }}
              </button>
            </div>
          </li>
        }
      </ul>
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

  /** The user's current plan name, once the server has reported it. */
  protected readonly plan = signal<string | null>(null)
  /** The user's current plan key, once the server has reported it. */
  protected readonly planKey = signal<string | null>(null)
  /** Whether the user is on a free plan (the status's `isFree`). */
  protected readonly isFree = signal(true)
  /** The tiers loaded from `/api/billing/tiers`. */
  protected readonly tiers = signal<Tier[]>([])
  /** Whether the upgrade modal is open. */
  protected readonly showUpgrade = signal(false)
  /** The price id whose checkout request is running, or null. */
  protected readonly upgradeLoading = signal<string | null>(null)
  /** The upgrade modal's error message. */
  protected readonly upgradeError = signal('')
  /** Why the last cancel failed, shown in the section (the modal is closed then). */
  protected readonly cancelError = signal('')

  /** The bonded ClassMap (styling tokens resolve at render time). */
  protected readonly cm: UIClassMap = getClassMap()

  private readonly host: ElementRef<HTMLElement> = inject(ElementRef)

  private loads = 0
  private destroyed = false

  /**
   * What can be bought: a price the server lists with a price id, on a tier
   * the user is not on (React's `forSale`).
   * @returns The entries.
   */
  protected forSale(): { key: string; tier: Tier; price: TierPrice; priceId: string }[] {
    const entries: { key: string; tier: Tier; price: TierPrice; priceId: string }[] = []
    for (const tier of this.tiers()) {
      if (tier.planKey === this.planKey()) continue
      for (const price of tier.prices) {
        if (!price.stripePriceId) continue
        entries.push({
          key: `${tier.planKey}-${price.stripePriceId}`,
          tier,
          price,
          priceId: price.stripePriceId,
        })
      }
    }
    return entries
  }

  /** Loads the current plan and the available tiers on mount. */
  constructor() {
    usePlacement(() => {
      // React's fragment (the section plus the upgrade modal) renders in the
      // host's place; the host itself leaves the page.
      placeContentBefore(this.host.nativeElement, this.host.nativeElement)
      setElementPresent(this.host.nativeElement, false)
    })
    inject(DestroyRef).onDestroy(() => {
      this.destroyed = true
    })
    this.load()
  }

  /**
   * Loads the current plan and the available tiers (React's effect): each
   * fetch resolves null on failure and the mapping keeps what the section
   * shows instead of throwing. A result that lands after unmount, or after a
   * newer load started, is dropped like React's cancelled one.
   */
  private load(): void {
    const seq = ++this.loads
    void Promise.all([
      // Each fetch resolves null on failure; the .then handler then keeps the
      // defaults (no plan label, nothing for sale) instead of throwing.
      this.http
        .get<{ planKey?: string; name?: string; isFree?: boolean }>('/api/billing/status')
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
        if (this.destroyed || seq !== this.loads) return
        const status = statusRes?.data ?? null
        if (status?.name) this.plan.set(status.name)
        if (status?.planKey) this.planKey.set(status.planKey)
        if (typeof status?.isFree === 'boolean') this.isFree.set(status.isFree)
        const list = tiersRes?.data?.data
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
  protected async startCheckout(stripePriceId: string): Promise<void> {
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
    this.cancelError.set('')
    try {
      await this.http.post('/api/billing/cancel', {})
      // The server decides what the plan is now (a provider may cancel at period end).
      this.load()
    } catch (err) {
      this.cancelError.set(
        serverErrorMessage(err) ??
          this.t('settings.billing.cancelFailed', undefined, {
            defaultValue: 'Could not cancel.',
          }),
      )
    }
  }
}
