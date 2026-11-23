/**
 * PlanUpdatedPage component (React parity): the post-checkout confirmation
 * screen.
 *
 * @module
 */

import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  inject,
  Injector,
  type OnInit,
  runInInjectionContext,
  ViewChild,
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
import { Button, Flex, Spinner } from '@molecule/app-ui-angular'

/**
 * PlanUpdatedPage component.
 *
 * "Plan updated" confirmation screen: waits for auth state to initialize, then
 * shows a two-line confirmation with a single return-home action. It is also
 * where a hosted checkout's purchase is CONFIRMED (the provider returns the
 * buyer here with the payment id in the query, and `useVerifyPaymentReturn`
 * posts it from this origin, where the session cookie applies) — a spinner
 * while that is in flight, a retry if it fails, so a failed confirmation never
 * reads as a thank-you.
 *
 * React's root is the `<main>` (or the centered `<Flex>` while the spinner
 * shows), so nothing of Angular's host stays in the page: React's chosen root
 * renders in the host's place (the template's `@if` branches) and the host
 * itself leaves the DOM.
 */
@Component({
  selector: 'mol-plan-updated-page',
  standalone: true,
  hostDirectives: [MolPlacement],
  imports: [Button, Flex, Link, Spinner],
  inputs: [
    'messageKey',
    'messageDefault',
    'thankYouKey',
    'thankYouDefault',
    'actionKey',
    'actionDefault',
    'actionHref',
    'provider',
    'verify',
  ],
  // Every branch root stays in the template and the placement function keeps
  // exactly React's one in the page: an @if around them would have Angular
  // destroy a root the placement function had moved beside the host.
  template: `@if (waiting()) {
      <div mol-flex [align]="'center'" [justify]="'center'" [className]="cm().sp('py', 12)">
        <div mol-spinner></div>
      </div>
    } @else if (failed()) {
      <main [class]="pageClasses()" data-mol-id="page-plan-updated">
        <h2 [class]="errorClasses()" data-mol-id="plan-updated-error">
          {{
            t('planUpdated.verifyFailed', undefined, {
              defaultValue: 'We could not confirm your payment yet.',
            })
          }}
        </h2>
        <button mol-button (click)="retry()" data-mol-id="plan-updated-retry">
          {{ t('planUpdated.retry', undefined, { defaultValue: 'Try again' }) }}
        </button>
      </main>
    } @else {
      <main [class]="pageClasses()" data-mol-id="page-plan-updated">
        <h2 [class]="messageClasses()">{{ message() }}</h2>
        <h2 [class]="thanksClasses()">{{ thanks() }}</h2>
        <a [molLink]="actionHrefValue()">
          <button mol-button>{{ action() }}</button>
        </a>
      </main>
    }`,
})
export class PlanUpdatedPage implements OnInit {
  /** i18n key for the primary message heading (default applied at read time). */
  messageKey?: string
  /** Default message when the key is missing. */
  messageDefault?: string
  /** i18n key for the secondary heading (default applied at read time). */
  thankYouKey?: string
  /** Default thank-you text when the key is missing. */
  thankYouDefault?: string
  /** i18n key for the action-button label (default applied at read time). */
  actionKey?: string
  /** Default action label when the key is missing. */
  actionDefault?: string
  /** Href the action button navigates to (default `/`). */
  actionHref?: string
  /** Provider name to verify the purchase with when the URL names none. */
  provider?: string
  /** `false` renders the confirmation without verifying the purchase. */
  verify?: boolean

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
   * `useVerifyPaymentReturn` call below can run in it once the inputs exist (an
   * Angular component reads its inputs after construction, unlike React's
   * per-render hook call). It must be the component's injector, not the
   * environment's, so the hook's `DestroyRef` ends with this component.
   */
  private readonly injector = inject(Injector)

  /** The `useVerifyPaymentReturn` result, created once the inputs exist. */
  private verification?: ReturnType<typeof useVerifyPaymentReturn>

  /** The spinner row (React's centered `<Flex>` root while it waits). */
  @ViewChild('spinnerRoot', { read: ElementRef }) private spinnerRoot?: ElementRef<HTMLElement>
  /** The retry `<main>` (React's root once a confirmation failed). */
  @ViewChild('failedRoot') private failedRoot?: ElementRef<HTMLElement>
  /** The confirmation `<main>` (React's root otherwise). */
  @ViewChild('successRoot') private successRoot?: ElementRef<HTMLElement>

  private readonly host: ElementRef<HTMLElement> = inject(ElementRef)
  private readonly cdr = inject(ChangeDetectorRef)

  constructor() {
    usePlacement(() => {
      placeContentBefore(this.host.nativeElement, this.host.nativeElement)
      setElementPresent(this.host.nativeElement, false)
    })
  }

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
    this.verification = runInInjectionContext(this.injector, () =>
      useVerifyPaymentReturn({
        provider: this.provider,
        enabled: this.verify ?? true,
      }),
    )
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
        defaultValue: this.actionDefault ?? 'Return to Home',
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
   * Computes the page `<main>`'s class list.
   * @returns The class string.
   */
  protected pageClasses(): string {
    const cm = this.cm()
    return cm.cn(cm.textCenter, cm.sp('py', 12))
  }

  /**
   * Computes the failure heading's class list.
   * @returns The class string.
   */
  protected errorClasses(): string {
    const cm = this.cm()
    return cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), cm.sp('mb', 8))
  }

  /**
   * Computes the message heading's class list.
   * @returns The class string.
   */
  protected messageClasses(): string {
    const cm = this.cm()
    return cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), cm.sp('mb', 2))
  }

  /**
   * Computes the thank-you heading's class list.
   * @returns The class string.
   */
  protected thanksClasses(): string {
    const cm = this.cm()
    return cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), cm.sp('mb', 8))
  }
}
