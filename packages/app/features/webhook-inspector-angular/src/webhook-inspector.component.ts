/**
 * WebhookInspector component (React parity).
 *
 * @module
 */

import { NgTemplateOutlet } from '@angular/common'
import { Component, TemplateRef } from '@angular/core'

import { useTranslation } from '@molecule/app-angular'
import type { ColorVariant, UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import type { WebhookDelivery } from './types.js'

/**
 * Next value of the module-wide row-id counter.
 *
 * React derives the per-delivery ids from `useId()`, which numbers ids from
 * one process-wide counter (`_r_<base32>_`). The ids appear in `id` and
 * `aria-describedby`, which the conformance normalizer renumbers in order of
 * appearance, so the port generates ids from the same kind of counter —
 * unique per instance, exactly React's format.
 */
let nextIdCounter = 0

/**
 * A fresh id base, in React `useId()`'s `_r_<base32>_` shape.
 *
 * @returns The id base for one component instance.
 */
const idBase = (): string => `_r_${(nextIdCounter++).toString(32)}_`

/**
 * Returns the semantic tone for the given delivery status: the theme's
 * success green, error red, or warning amber for a pending delivery.
 *
 * @param status - The delivery status.
 * @returns The badge's tone.
 */
const statusTone = (status: WebhookDelivery['status']): ColorVariant => {
  if (status === 'success') return 'success'
  if (status === 'failure') return 'error'
  return 'warning'
}

/**
 * Serialises a request/response body value to a display string.
 *
 * @param value - The body value.
 * @returns The text to render.
 */
const stringify = (value: string | unknown | undefined): string => {
  if (value === undefined) return ''
  if (typeof value === 'string') return value
  try {
    return JSON.stringify(value, null, 2)
  } catch (_error) {
    // JSON.stringify can throw for circular references; String() fallback is safe here.
    return String(value)
  }
}

/**
 * Webhook delivery log — one row per event with expandable request/response
 * JSON panels. Pass `onRetry` to show a retry button per failed delivery.
 *
 * The host IS React's root `<div>` (`div[mol-webhook-inspector]`), so the
 * wrapper classes live on it. Rows are native `<details>` elements tracked by
 * `delivery.id` (React's `key={d.id}`) and `onSelect` fires on EVERY toggle —
 * opening and closing alike. A failed delivery's retry button is a SIBLING of
 * its `<details>` (never inside the `<summary>`, which is the disclosure's own
 * toggle control) and names its delivery through `aria-describedby`. A
 * node-valued `timestamp` is a `TemplateRef` rendered through
 * `NgTemplateOutlet`, or plain text.
 *
 * @param props - Component inputs (see the `WebhookInspectorProps` type in `./types.js`).
 */
@Component({
  selector: 'div[mol-webhook-inspector]',
  standalone: true,
  imports: [NgTemplateOutlet],
  inputs: ['deliveries', 'onRetry', 'onSelect', 'selectedId', 'className'],
  host: {
    '[class]': 'wrapperClasses()',
  },
  // prettier-ignore
  template: `
    @for (delivery of deliveries; track delivery.id; let i = $index) {
      <div [class]="rowClasses()">
        <details [class]="detailsClasses()" [attr.open]="delivery.id === selectedId ? '' : null" (toggle)="select(delivery)">
          <summary [class]="summaryClasses()">
            <span [style]="timestampStyle()">
              @if (isNode(delivery.timestamp)) {
                <ng-container [ngTemplateOutlet]="templateOf(delivery.timestamp)" />
              } @else if (timestampText(delivery.timestamp) !== '') {
                {{ timestampText(delivery.timestamp) }}
              }
            </span>
            <span [class]="badgeClasses(delivery.status)" [style]="badgeStyle()">{{ delivery.statusCode }}</span>
            <span [attr.id]="retryable(delivery) ? eventTypeId(i) : null" [class]="eventTypeClasses()">{{ delivery.eventType }}</span>
            @if (delivery.attempt !== undefined) {
              <span>{{ attemptText(delivery) }}</span>
            }
            @if (delivery.durationMs !== undefined) {
              <span>{{ durationText(delivery) }}</span>
            }
          </summary>
          <div [class]="bodyClasses()">
            @if (delivery.requestBody !== undefined) {
              <div [class]="sectionClasses()">
                <span [class]="labelClasses()">{{ requestLabel() }}</span>
                <pre [class]="preClasses()" [style]="preStyle()" [textContent]="bodyText(delivery.requestBody)"></pre>
              </div>
            }
            @if (delivery.responseBody !== undefined) {
              <div [class]="sectionClasses()">
                <span [class]="labelClasses()">{{ responseLabel() }}</span>
                <pre [class]="preClasses()" [style]="preStyle()" [textContent]="bodyText(delivery.responseBody)"></pre>
              </div>
            }
          </div>
        </details>
        @if (retryable(delivery)) {
          <span [class]="retryWrapClasses()">
            <button type="button" data-mol-id="webhook-inspector-retry" [attr.aria-describedby]="eventTypeId(i)" [class]="retryClasses()" (click)="retry(delivery)">{{ retryLabel() }}</button>
          </span>
        }
      </div>
    }`,
})
export class WebhookInspector {
  /** Deliveries to render. */
  deliveries: WebhookDelivery[] = []

  /** Called when a delivery is retried (React's `onRetry`). */
  onRetry?: (delivery: WebhookDelivery) => void

  /** Called when a row is selected (React's `onSelect`). */
  onSelect?: (delivery: WebhookDelivery) => void

  /** Currently selected id (React's `selectedId`). */
  selectedId?: string

  /** Extra classes on the wrapper (React's `className`). */
  className?: string

  /** This instance's id base (React's `useId()`), minted for the per-delivery ids. */
  private readonly instanceIdBase = idBase()

  /**
   * Reactive translation, read in the injection context. Its `t` reads the
   * locale, so the view re-renders the labels on a locale switch (the static
   * `t` does not).
   */
  private readonly i18n = useTranslation()

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * The wrapper class list (React's `cm.cn(cm.stack(1), className)`).
   * @returns The class string.
   */
  wrapperClasses(): string {
    return this.cm().cn(this.cm().stack(1), this.className)
  }

  /**
   * One row's wrapper class list — the `<details>` plus, beside it, the retry
   * button (React's `cm.flex({ align: 'start', gap: 'sm' })`).
   * @returns The class string.
   */
  rowClasses(): string {
    return this.cm().flex({ align: 'start', gap: 'sm' })
  }

  /**
   * The `<details>` class list (React's `cm.flex1`, so the row fills the wrapper).
   * @returns The class string.
   */
  detailsClasses(): string {
    return this.cm().cn(this.cm().flex1)
  }

  /**
   * The retry button's wrapper class list — the summary's vertical padding
   * (React's `cm.sp('py', 1)`), so the button lines up with the summary row.
   * @returns The class string.
   */
  retryWrapClasses(): string {
    return this.cm().sp('py', 1)
  }

  /**
   * Whether a delivery renders a retry button (React's `onRetry && status === 'failure'`).
   *
   * @param delivery - The delivery.
   * @returns True when the button renders.
   */
  retryable(delivery: WebhookDelivery): boolean {
    return Boolean(this.onRetry) && delivery.status === 'failure'
  }

  /**
   * The id naming a delivery's event-type span, which the retry button
   * describes itself with (React mints the same id from `useId()` plus the
   * delivery index).
   *
   * @param index - The delivery's index in the loop.
   * @returns The event-type span's id.
   */
  eventTypeId(index: number): string {
    return `${this.instanceIdBase}-event-${index}`
  }

  /**
   * The summary class list (flex row + padding + small text + cursor).
   * @returns The class string.
   */
  summaryClasses(): string {
    return this.cm().cn(
      this.cm().flex({ align: 'center', gap: 'sm' }),
      this.cm().sp('py', 1),
      this.cm().sp('px', 2),
      this.cm().textSize('xs'),
      this.cm().cursorPointer,
    )
  }

  /**
   * The event type's class list (`cm.fontWeight('semibold')` + `cm.flex1`).
   * @returns The class string.
   */
  eventTypeClasses(): string {
    return this.cm().cn(this.cm().fontWeight('semibold'), this.cm().flex1)
  }

  /**
   * The retry button's class list (React's `cm.button({…})` + `cm.touchTargetCompact`).
   * @returns The class string.
   */
  retryClasses(): string {
    return this.cm().cn(
      this.cm().button({ variant: 'solid', color: 'primary', size: 'xs' }),
      this.cm().touchTargetCompact,
    )
  }

  /**
   * The expanded body's class list (`cm.sp('p', 3)` + `cm.stack(2)`).
   * @returns The class string.
   */
  bodyClasses(): string {
    return this.cm().cn(this.cm().sp('p', 3), this.cm().stack(2))
  }

  /**
   * One request/response section's class list (`cm.stack(1)`).
   * @returns The class string.
   */
  sectionClasses(): string {
    return this.cm().stack(1)
  }

  /**
   * A section label's class list (`cm.textSize('xs')` + `cm.fontWeight('semibold')`).
   * @returns The class string.
   */
  labelClasses(): string {
    return this.cm().cn(this.cm().textSize('xs'), this.cm().fontWeight('semibold'))
  }

  /**
   * A body panel's class (`cm.textSize('xs')`).
   * @returns The class string.
   */
  preClasses(): string {
    return this.cm().textSize('xs')
  }

  /**
   * The timestamp span's inline style (React's fixed 80px box).
   * @returns The style map.
   */
  timestampStyle(): Record<string, string> {
    return { width: '80px', opacity: '0.7' }
  }

  /**
   * The status badge's class list (React's `cm.bgTone(tone)` + `cm.textOnTone`).
   *
   * @param status - The delivery status.
   * @returns The class string.
   */
  badgeClasses(status: WebhookDelivery['status']): string {
    return this.cm().cn(this.cm().bgTone(statusTone(status)), this.cm().textOnTone)
  }

  /**
   * The status badge's inline style (the box; the colour comes from the theme).
   *
   * @returns The style map.
   */
  badgeStyle(): Record<string, string> {
    return {
      'min-width': '70px',
      'text-align': 'center',
      padding: '0px 6px',
      'border-radius': '4px',
      'font-weight': '700',
    }
  }

  /**
   * A body panel's inline style (horizontal scrolling).
   * @returns The style map.
   */
  preStyle(): Record<string, string> {
    return { 'overflow-x': 'auto' }
  }

  /**
   * The retry button's label (React's `webhookInspector.retry`).
   * @returns The label text.
   */
  retryLabel(): string {
    return this.i18n.t('webhookInspector.retry', undefined, { defaultValue: 'Retry' })
  }

  /**
   * The request panel's label (React's `webhookInspector.request`).
   * @returns The label text.
   */
  requestLabel(): string {
    return this.i18n.t('webhookInspector.request', undefined, { defaultValue: 'Request' })
  }

  /**
   * The response panel's label (React's `webhookInspector.response`).
   * @returns The label text.
   */
  responseLabel(): string {
    return this.i18n.t('webhookInspector.response', undefined, { defaultValue: 'Response' })
  }

  /**
   * Whether a timestamp is an embedded template (a projected node) rather than
   * text.
   *
   * @param value - The delivery's timestamp.
   * @returns True when it renders through a template outlet.
   */
  isNode(value: unknown): value is TemplateRef<unknown> {
    return value instanceof TemplateRef
  }

  /**
   * Narrows a timestamp to its template.
   *
   * @param value - The delivery's timestamp.
   * @returns The template, or null.
   */
  templateOf(value: unknown): TemplateRef<unknown> | null {
    return value instanceof TemplateRef ? value : null
  }

  /**
   * The text a timestamp renders (React renders strings and numbers as text).
   *
   * @param value - The delivery's timestamp.
   * @returns The text, or `''` for a node field.
   */
  timestampText(value: unknown): string {
    return typeof value === 'string' || typeof value === 'number' ? String(value) : ''
  }

  /**
   * The text of a delivery's attempt badge (React's `#{attempt}`).
   *
   * @param delivery - The delivery.
   * @returns The badge text.
   */
  attemptText(delivery: WebhookDelivery): string {
    return `#${delivery.attempt}`
  }

  /**
   * The text of a delivery's duration (React's `{durationMs}ms`).
   *
   * @param delivery - The delivery.
   * @returns The duration text.
   */
  durationText(delivery: WebhookDelivery): string {
    return `${delivery.durationMs}ms`
  }

  /**
   * The text of a request/response body panel.
   *
   * @param body - The body value.
   * @returns The panel text.
   */
  bodyText(body: string | unknown): string {
    return stringify(body)
  }

  /**
   * Notifies `onSelect`, as React's `<details onToggle>` does on every toggle.
   *
   * @param delivery - The toggled delivery.
   */
  select(delivery: WebhookDelivery): void {
    this.onSelect?.(delivery)
  }

  /**
   * Notifies `onRetry` (React's retry button handler). The button is a
   * sibling of the `<details>`, so the click cannot toggle the row and needs
   * no `preventDefault`/`stopPropagation`.
   *
   * @param delivery - The delivery to retry.
   */
  retry(delivery: WebhookDelivery): void {
    this.onRetry?.(delivery)
  }
}
