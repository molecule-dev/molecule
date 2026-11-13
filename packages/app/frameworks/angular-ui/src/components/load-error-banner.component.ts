/**
 * LoadErrorBanner component (React parity): the shared "load failed" banner
 * with a Retry button that owns its pending state.
 *
 * @module
 */

import {
  type AfterViewInit,
  Component,
  type DoCheck,
  ElementRef,
  inject,
  type OnDestroy,
  Renderer2,
  signal,
  ViewChild,
} from '@angular/core'

import { t } from '@molecule/app-i18n'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { Alert } from './alert.component.js'
import { hasNodes, SlotWrapper } from './button.component.js'

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
  imports: [Alert],
  inputs: ['message', 'detail', 'retryLabel', 'retryMolId', 'onRetry'],
  host: {
    '[class]': 'className',
  },
  template: `<div mol-alert [status]="'error'" [live]="false">
    <div [class]="cm().stack(2)">
      <p [class]="cm().textSize('sm')"><ng-content select="[slot=message]"></ng-content></p>
      <p #detailSlot [class]="detailClasses()"><ng-content select="[slot=detail]"></ng-content></p>
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
          @if (!hasRetryLabel()) {
            {{ retryText() }}
          }
        </button>
      </div>
    </div>
  </div>`,
})
export class LoadErrorBanner implements AfterViewInit, DoCheck, OnDestroy {
  /** The primary error line (node-valued prop). */
  message?: unknown
  /** Secondary line under the message (node-valued prop). */
  detail?: unknown
  /** Retry-button label (node-valued prop). */
  retryLabel?: unknown
  /** `data-mol-id` for the retry button (default `load-error-retry`). */
  retryMolId = 'load-error-retry'
  /** Called when Retry is clicked; a returned promise keeps the button pending. */
  onRetry?: () => void | Promise<void>
  /** Extra classes for the root (React's rest `className`). */
  className?: string

  /** Whether a retry is in flight. */
  readonly pending = signal(false)

  /** The detail paragraph (always in the template; detached when unused). */
  @ViewChild('detailSlot') detailSlot?: ElementRef<HTMLParagraphElement>
  /** The retry row (always in the template; detached when no callback). */
  @ViewChild('retrySlot') retrySlot?: ElementRef<HTMLDivElement>
  /** The retry label capture point. */
  @ViewChild('retryLabelSlot') retryLabelSlot?: ElementRef<HTMLSpanElement>

  private readonly sync = new SlotWrapper(inject(ElementRef), inject(Renderer2))
  private hasDetail = false
  /** Whether the projected retry label exists (a signal: it is read after view init). */
  private readonly hasRetryLabel = signal(false)
  private detailParent: HTMLElement | null = null
  private retryParent: HTMLElement | null = null

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
      ? t('loadError.retrying', {}, { defaultValue: 'Retrying…' })
      : t('loadError.retry', {}, { defaultValue: 'Retry' })
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
   * Reads detail/label presence at view init (view queries resolve only then).
   */
  ngAfterViewInit(): void {
    this.detailParent = this.detailSlot?.nativeElement.parentElement ?? null
    this.retryParent = this.retrySlot?.nativeElement.parentElement ?? null
    this.hasDetail = hasNodes(this.detailSlot?.nativeElement)
    this.hasRetryLabel.set(hasNodes(this.retryLabelSlot?.nativeElement))
    this.sync.sync(
      this.retryLabelSlot?.nativeElement,
      false,
      this.retryLabelSlot?.nativeElement.parentElement ?? undefined,
    )
    this.ngDoCheck()
  }

  /**
   * Re-reconciles the conditional wrappers on later passes.
   */
  ngDoCheck(): void {
    this.sync.sync(this.detailSlot?.nativeElement, this.hasDetail, this.detailParent ?? undefined)
    // React renders the retry row exactly when `onRetry` is given.
    this.sync.sync(this.retrySlot?.nativeElement, !!this.onRetry, this.retryParent ?? undefined)
    this.showRetryLabel()
  }

  /** Restores the retry-label capture span on unmount. */
  ngOnDestroy(): void {
    this.visibleNodes = []
    this.visibleFrom = null
  }

  /** Moves the projected retry label onto the retry button (React: no wrapper). */
  private showRetryLabel(): void {
    const host = this.retrySlot?.nativeElement?.querySelector('button')
    const span = this.retryLabelSlot?.nativeElement
    if (!host || !span) return
    if (!this.hasRetryLabel()) {
      this.showNodes(host, null)
      return
    }
    this.showNodes(host, span)
  }

  private visibleNodes: Node[] = []
  private visibleFrom: HTMLSpanElement | null = null

  /**
   * Shows one capture span's children inside a target element, parking any
   * previously shown nodes back in their span.
   *
   * @param target - The element to show the nodes in.
   * @param span - The capture span (null parks everything).
   */
  private showNodes(target: HTMLElement, span: HTMLSpanElement | null): void {
    if (span === this.visibleFrom) return
    for (const node of this.visibleNodes) {
      if (node.parentNode === target) this.visibleFrom?.appendChild(node)
    }
    this.visibleNodes = []
    this.visibleFrom = null
    if (!span) return
    const nodes = Array.from(span.childNodes)
    for (const node of nodes) target.appendChild(node)
    this.visibleNodes = nodes
    this.visibleFrom = span
  }
}
