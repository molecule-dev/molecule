/**
 * PlanUpdated component (React parity).
 *
 * @module
 */

import {
  Component,
  ElementRef,
  inject,
  Injector,
  type OnInit,
  runInInjectionContext,
} from '@angular/core'

import {
  Link,
  MolPlacement,
  placeContentBefore,
  setElementPresent,
  useAuth,
  usePlacement,
  useTranslation,
  useVerifyPaymentReturn,
} from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { Button, Flex, Icon, Spinner } from '@molecule/app-ui-angular'

/**
 * PlanUpdated component.
 *
 * Post-purchase confirmation page rendered after a plan upgrade. React's root
 * is the `<section>` (or the centered `<Flex>` while a spinner shows), so the
 * rendered root stands in front of the host's place and the host itself leaves
 * the page (`placeContentBefore` + `setElementPresent`). The page reads auth
 * state to show a spinner while the session is still hydrating, then a two-line
 * thank-you with a Return Home button and a View receipt link.
 */
@Component({
  selector: 'mol-plan-updated',
  standalone: true,
  imports: [Button, Flex, Icon, Link, Spinner],
  hostDirectives: [MolPlacement],
  inputs: [
    'messageKey',
    'messageDefault',
    'thankYouKey',
    'thankYouDefault',
    'actionKey',
    'actionDefault',
    'actionHref',
    'receiptHref',
    'provider',
    'verify',
  ],
  template: `@if (waiting()) {
      <div mol-flex [align]="'center'" [justify]="'center'" [className]="cm().sp('py', 12)">
        <div mol-spinner></div>
      </div>
    } @else if (failed()) {
      <section [class]="pageClasses()" data-mol-id="plan-updated-page">
        <h2 [class]="errorClasses()" data-mol-id="plan-updated-error">
          {{
            t('planUpdated.verifyFailed', undefined, {
              defaultValue: 'We could not confirm your payment yet.',
            })
          }}
        </h2>
        <button
          mol-button
          [variant]="'solid'"
          [size]="'lg'"
          (click)="retry()"
          data-mol-id="plan-updated-retry"
        >
          {{ t('planUpdated.retry', undefined, { defaultValue: 'Try again' }) }}
        </button>
      </section>
    } @else {
      <section [class]="pageClasses()" data-mol-id="plan-updated-page">
        <div [class]="iconWrapperClasses()" [style]="iconWrapperStyle">
          <svg
            mol-icon-root
            [name]="'check-circle'"
            [size]="64"
            [ariaHidden]="'true'"
            data-mol-id="plan-updated-icon"
          ></svg>
        </div>
        <h2 [class]="headingClasses()" [style]="headingStyle" data-mol-id="plan-updated-heading">
          {{ message() }}
        </h2>
        <h2 [class]="subheadingClasses()" data-mol-id="plan-updated-subheading">{{ thanks() }}</h2>
        <a [molLink]="actionHrefValue()">
          <button
            mol-button
            [variant]="'solid'"
            [size]="'lg'"
            [className]="returnHomeClasses()"
            data-mol-id="plan-updated-return-home"
          >
            {{ action() }}
          </button>
        </a>
        @if (receiptHrefValue(); as receipt) {
          <div [class]="cm().sp('mt', 6)">
            <a
              [molLink]="receipt"
              [class]="receiptClasses()"
              data-mol-id="plan-updated-view-receipt"
            >
              {{ t('planUpdated.viewReceipt', undefined, { defaultValue: 'View receipt' }) }}
            </a>
          </div>
        }
      </section>
    }`,
})
export class PlanUpdated implements OnInit {
  /** i18n key for the confirmation message (default applied at read time). */
  messageKey?: string
  /** Default confirmation message when the key is missing. */
  messageDefault?: string
  /** i18n key for the thank-you line (default applied at read time). */
  thankYouKey?: string
  /** Default thank-you line when the key is missing. */
  thankYouDefault?: string
  /** i18n key for the return-home action label (default applied at read time). */
  actionKey?: string
  /** Default action label when the key is missing. */
  actionDefault?: string
  /** Href the return-home action navigates to (default `/`). */
  actionHref?: string
  /** Where the "View receipt" link goes (default `/billing`); `null` leaves the link out. */
  receiptHref?: string | null
  /** Provider name to verify the purchase with when the URL names none. */
  provider?: string
  /** `false` renders the confirmation without verifying the purchase. */
  verify?: boolean

  /** Inline size of the success-glyph halo (`cm.w`/`cm.h` classes are runtime-built). */
  protected readonly iconWrapperStyle = 'width: 7rem; height: 7rem'

  /** The headline's inline font family (React sets the same inline style). */
  protected readonly headingStyle = 'font-family: var(--font-headline, inherit)'

  /** The auth composable — the session state as a signal. */
  private readonly auth = useAuth()

  /**
   * Reactive translation, read in the injection context. Its `t` reads the
   * locale, so the view re-renders the text on a locale switch.
   */
  private readonly i18n = useTranslation()

  /** The translation function for the template. */
  protected readonly t = this.i18n.t

  /**
   * This component's own injector, captured in the injection context so the
   * `useVerifyPaymentReturn` call below can run in it once the inputs exist
   * (an Angular component reads its inputs after construction, unlike React's
   * per-render hook call). It must be the component's injector, not the
   * environment's, so the hook's `DestroyRef` ends with this component.
   */
  private readonly injector = inject(Injector)

  /** The component's host element (React renders no element of its own). */
  private readonly host: ElementRef<HTMLElement> = inject(ElementRef)

  constructor() {
    // React's root is the `<section>` (or the centered `<Flex>`) itself: it renders in front
    // of the host's place and the host leaves the page.
    usePlacement(() => {
      placeContentBefore(this.host.nativeElement, this.host.nativeElement)
      setElementPresent(this.host.nativeElement, false)
    })
  }

  /** The `useVerifyPaymentReturn` result, created once the inputs exist. */
  private verification?: ReturnType<typeof useVerifyPaymentReturn>

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * Creates the confirmation hook once the inputs exist, reading the two
   * option inputs once — the hook itself reads its options once per mount.
   */
  ngOnInit(): void {
    const verification = runInInjectionContext(this.injector, () =>
      useVerifyPaymentReturn({
        provider: this.provider,
        enabled: this.verify ?? true,
      }),
    )
    this.verification = verification
  }

  /**
   * Whether the page shows the spinner: the session is still hydrating, or the
   * purchase is being confirmed.
   * @returns True while the page waits.
   */
  protected waiting(): boolean {
    return !this.auth.state().initialized || this.verification?.status() === 'verifying'
  }

  /**
   * Whether the confirmation failed.
   * @returns True for the retry screen.
   */
  protected failed(): boolean {
    return this.verification?.status() === 'failed'
  }

  /** Re-runs the confirmation (React's `verification.retry`). */
  protected retry(): void {
    this.verification?.retry()
  }

  /**
   * The confirmation message.
   * @returns The translated message.
   */
  protected message(): string {
    return this.t(
      this.messageKey ?? 'planUpdated.message',
      {},
      {
        defaultValue: this.messageDefault ?? 'Your plan has been updated.',
      },
    )
  }

  /**
   * The thank-you line.
   * @returns The translated thank-you.
   */
  protected thanks(): string {
    return this.t(
      this.thankYouKey ?? 'planUpdated.thankYou',
      {},
      {
        defaultValue: this.thankYouDefault ?? 'Thank you!',
      },
    )
  }

  /**
   * The return-home action label.
   * @returns The translated action label.
   */
  protected action(): string {
    return this.t(
      this.actionKey ?? 'planUpdated.returnHome',
      {},
      {
        defaultValue: this.actionDefault ?? 'Return home',
      },
    )
  }

  /**
   * The return-home destination.
   * @returns The href.
   */
  protected actionHrefValue(): string {
    return this.actionHref ?? '/'
  }

  /**
   * The receipt link's destination, or `null` when the app has no billing page.
   * @returns The href, or `null`.
   */
  protected receiptHrefValue(): string | null {
    return this.receiptHref === undefined ? '/billing' : this.receiptHref
  }

  /**
   * Computes the page section's class list.
   * @returns The class string.
   */
  protected pageClasses(): string {
    const cm = this.cm()
    return cm.cn(cm.maxW('xl'), cm.mxAuto, cm.textCenter, cm.sp('px', 6), cm.sp('py', 16))
  }

  /**
   * Computes the failure heading's class list.
   * @returns The class string.
   */
  protected errorClasses(): string {
    const cm = this.cm()
    return cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), cm.sp('mb', 4))
  }

  /**
   * Computes the success-glyph halo's class list.
   * @returns The class string.
   */
  protected iconWrapperClasses(): string {
    const cm = this.cm()
    return cm.cn(
      cm.mxAuto,
      cm.sp('mb', 8),
      cm.roundedFull,
      cm.bgPrimarySubtle,
      cm.textPrimary,
      cm.flex({ align: 'center', justify: 'center' }),
    )
  }

  /**
   * Computes the headline's class list.
   * @returns The class string.
   */
  protected headingClasses(): string {
    const cm = this.cm()
    return cm.cn(cm.textSize('4xl'), cm.italic, cm.fontWeight('bold'), cm.sp('mb', 4))
  }

  /**
   * Computes the thank-you line's class list.
   * @returns The class string.
   */
  protected subheadingClasses(): string {
    const cm = this.cm()
    return cm.cn(cm.textSize('lg'), cm.fontWeight('normal'), cm.textMuted, cm.sp('mb', 10))
  }

  /**
   * Computes the Return Home button's extra class list.
   * @returns The class string.
   */
  protected returnHomeClasses(): string {
    const cm = this.cm()
    return cm.cn(cm.gradientPrimary, cm.uppercase, cm.trackingWide)
  }

  /**
   * Computes the View receipt link's class list.
   * @returns The class string.
   */
  protected receiptClasses(): string {
    const cm = this.cm()
    return cm.cn(
      cm.textSize('xs'),
      cm.textSubtle,
      cm.uppercase,
      cm.trackingWide,
      cm.fontWeight('semibold'),
      cm.link,
    )
  }
}
