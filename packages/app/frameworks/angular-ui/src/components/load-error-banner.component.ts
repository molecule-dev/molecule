/**
 * LoadErrorBanner component (React parity): the shared "load failed" banner
 * with a Retry button that owns its pending state.
 *
 * @module
 */

import {
  type AfterViewChecked,
  Component,
  ElementRef,
  inject,
  signal,
  type TemplateRef,
  ViewChild,
} from '@angular/core'

import {
  MolPlacement,
  placeContent,
  setElementPresent,
  type SlotReader,
  usePlacement,
  useTranslation,
} from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { asTemplate, isGiven, nodeText } from '../utilities/node-value.js'
import { Alert } from './alert.component.js'
import { MolTemplateOutlet } from './template-outlet.directive.js'

/**
 * Props for {@link LoadErrorBanner} (React's `LoadErrorBannerProps`, in
 * Angular's form). Rest props (`data-*`, `aria-*`, `id`) land on the host, so
 * they are not enumerated here.
 */
export interface LoadErrorBannerProps {
  /** The primary error line. */
  message?: string | number | TemplateRef<unknown>
  /** Secondary line under the message. */
  detail?: string | number | TemplateRef<unknown>
  /** Called when Retry is clicked; a returned promise keeps the button pending. */
  onRetry?: () => void | Promise<void>
  /** Retry-button label. */
  retryLabel?: string | number | TemplateRef<unknown>
  /** `data-mol-id` for the retry button (default `load-error-retry`). */
  retryMolId?: string
  /** Extra classes for the root (React's rest `className`). */
  className?: string
  /** `data-testid` for the root. */
  testId?: string
  /** `data-mol-id` for the root (React's `automationId`). */
  automationId?: string
}

/**
 * LoadErrorBanner component.
 *
 * The host is the root `<div>` (`div[mol-load-error-banner]`); rest props
 * (`className`, `data-*`, `aria-*`, `id`) land on it exactly as React spreads
 * them. `message`, `detail` and `retryLabel` are node-valued props, projected
 * as `[slot=message]` / `[slot=detail]` / `[slot=retryLabel]`. The detail
 * paragraph and the retry row render only when React would render them.
 */
@Component({
  selector: 'div[mol-load-error-banner]',
  standalone: true,
  hostDirectives: [MolPlacement],
  imports: [Alert, MolTemplateOutlet],
  inputs: ['message', 'detail', 'retryLabel', 'retryMolId', 'onRetry', 'testId', 'automationId'],
  host: {
    '[class]': 'className',
    '[attr.data-testid]': 'testId',
  },
  template: `<div mol-alert [status]="'error'" [live]="false">
    <div [class]="cm().stack(2)">
      <p [class]="cm().textSize('sm')">
        <ng-container [molTemplateOutlet]="asTemplate(message)"></ng-container
        ><ng-content select="[slot=message]"></ng-content>{{ nodeText(message) }}
      </p>
      <p #detailSlot [class]="detailClasses()">
        <ng-container [molTemplateOutlet]="asTemplate(detail)"></ng-container
        ><ng-content select="[slot=detail]"></ng-content>{{ nodeText(detail) }}
      </p>
      <ng-content></ng-content>
      <div #retrySlot [class]="cm().flex({ justify: 'start' })">
        <button
          type="button"
          [class]="retryClasses()"
          [attr.aria-busy]="'false'"
          [disabled]="pending()"
          [attr.data-mol-id]="retryMolId"
          (click)="handleRetry()"
        >
          <span #retryLabelSlot><ng-content select="[slot=retryLabel]"></ng-content></span>
          @if (!hasRetryLabel() && isGiven(retryLabel)) {
            <ng-container [molTemplateOutlet]="asTemplate(retryLabel)"></ng-container
            >{{ nodeText(retryLabel) }}
          } @else if (!hasRetryLabel()) {
            {{ retryText() }}
          }
        </button>
      </div>
    </div>
  </div>`,
})
export class LoadErrorBanner implements AfterViewChecked {
  /** The primary error line (node-valued prop). */
  message?: LoadErrorBannerProps['message']
  /** Secondary line under the message (node-valued prop). */
  detail?: LoadErrorBannerProps['detail']
  /** Retry-button label (node-valued prop). */
  retryLabel?: LoadErrorBannerProps['retryLabel']
  /** `data-mol-id` for the retry button (default `load-error-retry`). */
  retryMolId?: LoadErrorBannerProps['retryMolId'] = 'load-error-retry'
  /** Called when Retry is clicked; a returned promise keeps the button pending. */
  onRetry?: LoadErrorBannerProps['onRetry']
  /** Extra classes for the root (React's rest `className`). */
  className?: LoadErrorBannerProps['className']
  /** `data-testid` for the root. */
  testId?: LoadErrorBannerProps['testId']
  /** `data-mol-id` for the root (React's `automationId`). */
  automationId?: LoadErrorBannerProps['automationId']

  /** Template helpers (templates see only class members). */
  readonly asTemplate = asTemplate
  /** Renders a plain-string/number node value. */
  readonly nodeText = nodeText
  /** Whether a node-valued prop was given. */
  readonly isGiven = isGiven

  /** Whether a retry is in flight. */
  readonly pending = signal(false)

  /** The detail paragraph (always in the template; detached when unused). */
  @ViewChild('detailSlot') detailSlot?: ElementRef<HTMLParagraphElement>
  /** The retry row (always in the template; detached when no callback). */
  @ViewChild('retrySlot') retrySlot?: ElementRef<HTMLDivElement>
  /** The retry label capture point. */
  @ViewChild('retryLabelSlot') retryLabelSlot?: ElementRef<HTMLSpanElement>

  /**
   * Reactive translation, read in the injection context. Its `t` reads the
   * locale, so the view re-renders the text on a locale switch (the static `t`
   * does not).
   */
  private readonly i18n = useTranslation()

  /** The host element, which is React's root `<div>`. */
  private readonly host: ElementRef<HTMLElement> = inject(ElementRef)

  /** The `data-mol-id` this component last wrote (React's `automationId` wins over a rest `data-mol-id`). */
  private lastWrittenMolId: string | null = null

  /**
   * Applies React's `rootProps` precedence on the root: a rest `data-mol-id`
   * bound on the tag stays, and `automationId` overrides it when given (and
   * leaves no stale value once cleared).
   */
  ngAfterViewChecked(): void {
    const host = this.host.nativeElement
    const current = host.getAttribute('data-mol-id')
    if (this.automationId !== undefined) {
      if (current !== this.automationId) host.setAttribute('data-mol-id', this.automationId)
      this.lastWrittenMolId = this.automationId
      return
    }
    if (current !== null && current === this.lastWrittenMolId) host.removeAttribute('data-mol-id')
    this.lastWrittenMolId = null
  }

  /** Whether the projected retry label exists (a signal the placement function sets). */
  private readonly hasRetryLabel = signal(false)

  /** Reconciles the detail/retry wrappers and the projected retry label. */
  constructor() {
    usePlacement((hasContent) => this.reconcile(hasContent))
  }

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * The detail paragraph classes.
   * @returns The class string.
   */
  detailClasses(): string {
    return this.cm().cn(this.cm().textSize('xs'), this.cm().textMuted)
  }

  /**
   * The retry button classes (React renders `Button variant="outline" size="sm"`).
   * @returns The class string.
   */
  retryClasses(): string {
    return this.cm().button({ variant: 'outline', color: 'primary', size: 'sm' })
  }

  /**
   * The retry button's text: the projected label, or the localized default.
   * @returns The default text (empty while a projected label is shown).
   */
  retryText(): string {
    return this.pending()
      ? this.i18n.t('loadError.retrying', {}, { defaultValue: 'Retrying…' })
      : this.i18n.t('loadError.retry', {}, { defaultValue: 'Retry' })
  }

  /**
   * Runs the retry callback with React's pending semantics: disabled and
   * "Retrying…" while the promise is unsettled; a rejection is not swallowed
   * — the banner stays for the caller.
   */
  handleRetry(): void {
    if (!this.onRetry || this.pending()) return
    this.pending.set(true)
    void Promise.resolve(this.onRetry())
      .catch((_error: unknown) => undefined)
      .finally(() => this.pending.set(false))
  }

  /**
   * Applies React's detail/retry conditions and moves the projected retry
   * label onto the retry button.
   *
   * @param hasContent - Reads whether a slot has content.
   */
  private reconcile(hasContent: SlotReader): void {
    const retryLabelSlot = this.retryLabelSlot?.nativeElement
    this.hasRetryLabel.set(hasContent(retryLabelSlot))
    setElementPresent(retryLabelSlot, false)
    setElementPresent(this.detailSlot?.nativeElement, this.detailPresent(hasContent))
    // React renders the retry row exactly when `onRetry` is given.
    setElementPresent(this.retrySlot?.nativeElement, !!this.onRetry)
    this.showRetryLabel()
  }

  /**
   * Whether React would render the detail paragraph (a given node value or
   * projected slot content).
   *
   * @param hasContent - Reads whether a slot has content.
   * @returns True when the detail renders.
   */
  private detailPresent(hasContent: SlotReader): boolean {
    return isGiven(this.detail) || hasContent(this.detailSlot?.nativeElement)
  }

  /** Moves the projected retry label onto the retry button (React: no wrapper). */
  private showRetryLabel(): void {
    const host = this.retrySlot?.nativeElement?.querySelector('button')
    const span = this.retryLabelSlot?.nativeElement
    if (!host || !span) return
    if (!this.hasRetryLabel()) {
      placeContent(span, null)
      return
    }
    placeContent(span, host)
  }
}
