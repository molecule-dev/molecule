/**
 * DangerZoneSection component (React parity).
 *
 * @module
 */

import { Component, type ElementRef, ViewChild } from '@angular/core'

import {
  MolPlacement,
  placeContent,
  placeContentBefore,
  setElementPresent,
  type SlotReader,
  usePlacement,
} from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { Button } from '@molecule/app-ui-angular'

/**
 * DangerZoneSection component.
 *
 * Card-wrapped section for destructive actions — delete account, reset data,
 * revoke access. Uses the error/danger accent color and puts the action on
 * the right. The host IS the Card's `<div>`
 * (`div[mol-danger-zone-section]`), matching React's root exactly; the Card
 * classes (`cm.card({ variant: 'elevated' })` + `cm.cardPadding('md')`, the
 * UI Card's defaults) are applied through the host class binding.
 *
 * The node props are projected slots: `title` renders inside the `<h3>`,
 * `description` inside the `<p>`, `actionLabel` inside the action `<button>`,
 * and `children` bare between the header and the button row (React renders
 * `{children}` with no wrapper). String inputs render as text instead — the
 * same values React renders. The action label's capture wrapper detaches
 * while `loading` is true: React shows the `…` glyph instead of the label.
 */
@Component({
  selector: 'div[mol-danger-zone-section]',
  standalone: true,
  hostDirectives: [MolPlacement],
  imports: [Button],
  inputs: [
    'title',
    'description',
    'actionLabel',
    'loading',
    'disabled',
    'className',
    'dataMolId',
    'onAction',
  ],
  host: {
    '[class]': 'classes()',
    '[attr.data-mol-id]': 'dataMolId ?? null',
  },
  template: `<div [class]="cm().stack(3)">
    <header [class]="cm().stack(1)">
      <h3 [class]="titleClasses()">
        {{ titleText() }}<ng-content select="[slot=title]"></ng-content>
      </h3>
      <p [class]="cm().textSize('sm')">
        {{ descriptionText() }}<ng-content select="[slot=description]"></ng-content>
      </p>
    </header>
    <ng-content></ng-content>
    <div [class]="cm().flex({ justify: 'end' })">
      <button
        mol-button
        [variant]="'solid'"
        [color]="'error'"
        [disabled]="isDisabled()"
        (click)="handleAction($event)"
      >
        {{ loading ? '…' : actionLabelText()
        }}<span #labelSlot><ng-content select="[slot=actionLabel]"></ng-content></span>
      </button>
    </div>
  </div>`,
})
export class DangerZoneSection {
  /** Section title (string/number renders as text; nodes are `[slot=title]` content). */
  title?: unknown
  /** Explanation of the destructive action (string/number as text; nodes are `[slot=description]` content). */
  description?: unknown
  /** Label on the action button (string/number as text; nodes are `[slot=actionLabel]` content). */
  actionLabel?: unknown
  /** When true, the button disables and shows a loading label. */
  loading?: boolean
  /** When true, the button is disabled without loading. */
  disabled?: boolean
  /** Extra classes on the Card. */
  className?: string
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string
  /** Called when the button is clicked; receives the DOM click event (React's `onAction`). */
  onAction?: (event: MouseEvent) => void

  /** The action label's capture wrapper (moved out of the DOM once read). */
  @ViewChild('labelSlot') labelSlot?: ElementRef<HTMLSpanElement>

  constructor() {
    usePlacement((hasContent) => this.syncLabels(hasContent))
  }

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * Computes the Card's class list (`cm.card({ variant: 'elevated' })` +
   * `cm.cardPadding('md')` — the UI Card's defaults — plus `className`).
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(
      this.cm().card({ variant: 'elevated' }),
      this.cm().cardPadding('md'),
      this.className,
    )
  }

  /**
   * Computes the title's class (`cm.textSize('base')` + `cm.fontWeight('semibold')`).
   * @returns The class string.
   */
  titleClasses(): string {
    return this.cm().cn(this.cm().textSize('base'), this.cm().fontWeight('semibold'))
  }

  /**
   * The title input's text (React's `{title}` for a text child: strings and
   * numbers render; a node arrives as `[slot=title]` content instead).
   * @returns The text, or `''` for a node title.
   */
  titleText(): string {
    return typeof this.title === 'string' || typeof this.title === 'number'
      ? String(this.title)
      : ''
  }

  /**
   * The description input's text (React's `{description}` for a text child).
   * @returns The text, or `''` for a node description.
   */
  descriptionText(): string {
    return typeof this.description === 'string' || typeof this.description === 'number'
      ? String(this.description)
      : ''
  }

  /**
   * The action label input's text (React's `{actionLabel}` for a text child).
   * @returns The text, or `''` for a node label.
   */
  actionLabelText(): string {
    return typeof this.actionLabel === 'string' || typeof this.actionLabel === 'number'
      ? String(this.actionLabel)
      : ''
  }

  /**
   * The button's disabled state (React's `disabled || loading`; an absent
   * boolean input must not show a disabled button).
   * @returns Whether the button is disabled.
   */
  isDisabled(): boolean {
    return this.disabled === true || this.loading === true
  }

  /** Runs the click handler the way React forwards the DOM event. */
  handleAction(event: MouseEvent): void {
    this.onAction?.(event)
  }

  /**
   * Applies React's label branch: the projected label renders only while
   * there is one and the button is not loading (`{loading ? '…' : actionLabel}`),
   * and it renders BARE — the capture wrapper never shows in the DOM, and the
   * content follows the wrapper's own place.
   *
   * @param hasContent - Reads whether a slot has content.
   */
  private syncLabels(hasContent: SlotReader): void {
    const span = this.labelSlot?.nativeElement
    if (!span) return
    if (hasContent(span) && this.loading !== true) {
      // The content stands bare in front of the capture point's place, and the
      // point itself leaves the page: React renders `{actionLabel}` with no wrapper.
      placeContentBefore(span, span)
      setElementPresent(span, false)
      return
    }
    // React shows the `…` glyph instead of the label: the projected nodes go
    // back inside the hidden capture wrapper.
    placeContent(span, null)
    setElementPresent(span, false)
  }
}
