/**
 * TagChip component (React parity).
 *
 * @module
 */

import { Component, type ElementRef, ViewChild } from '@angular/core'

import {
  MolPlacement,
  placeContentBefore,
  placeElement,
  setElementPresent,
  usePlacement,
  useTranslation,
} from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

/**
 * TagChip component — the Angular counterpart of
 * `@molecule/app-tag-input-react`'s `TagChip`.
 *
 * Small labeled chip with an optional close button. The host IS the chip's
 * outer `<span>` (`span[mol-tag-chip]`), matching React's root exactly; the
 * label is projected content.
 *
 * The chip body action is keyboard-operable. With no remove button the chip
 * itself is the control: `role="button"`, tabbable, and Enter / Space fire
 * `onClick`. With a remove button the action lives on a native button around
 * the label text instead, since a button may not contain another control.
 *
 * Angular projection needs an always-mounted `<ng-content>` capture point, so
 * the label span (holding the projected text) is moved into the label button
 * when the chip has a body control, and back beside the remove button when it
 * does not — reconciling the DOM to what React renders.
 */
@Component({
  selector: 'span[mol-tag-chip]',
  standalone: true,
  hostDirectives: [MolPlacement],
  inputs: ['onClick', 'onRemove', 'className'],
  host: {
    '[class]': 'classes()',
    '[attr.role]': 'bodyControl() ? "button" : null',
    '[attr.tabindex]': 'bodyControl() ? 0 : null',
    '(click)': 'handleHostClick($event)',
    '(keydown)': 'handleHostKeyDown($event)',
  },
  template: `<span #label
      ><span #capture><ng-content></ng-content></span></span
    ><button
      #labelButton
      type="button"
      [class]="cursorClass()"
      [style.background]="'transparent'"
      [style.border]="'none'"
      [style.padding]="'0'"
      [style.font]="'inherit'"
      [style.color]="'inherit'"
      (click)="emitClick($event)"
    ></button
    ><button
      #removeButton
      type="button"
      (click)="emitRemove($event)"
      [attr.aria-label]="removeLabel()"
      [class]="removeClasses()"
    >
      ×
    </button>`,
})
export class TagChip {
  /** Optional click callback for the chip body. */
  onClick?: (event?: Event) => void
  /** Optional remove callback — renders the `×` button when provided. */
  onRemove?: (event?: Event) => void
  /** Extra classes. */
  className?: string

  /** The translation service (i18n provider). */
  readonly i18n = useTranslation()

  @ViewChild('label', { static: true })
  private label?: ElementRef<HTMLElement>

  @ViewChild('capture', { static: true })
  private capture?: ElementRef<HTMLElement>

  @ViewChild('labelButton', { static: true })
  private labelButton?: ElementRef<HTMLButtonElement>

  @ViewChild('removeButton', { static: true })
  private removeButton?: ElementRef<HTMLButtonElement>

  constructor() {
    usePlacement(() => this.reconcile())
  }

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * Whether the chip itself is the body control (no remove button to share it).
   * @returns True when the chip carries the button role and keyboard path.
   */
  bodyControl(): boolean {
    return !!this.onClick && !this.onRemove
  }

  /**
   * The chip's class list (the caller's `className` included).
   * @returns The class string.
   */
  classes(): string {
    const cm = this.cm()
    return cm.cn(
      cm.flex({ align: 'center', gap: 'xs' }),
      cm.sp('px', 2),
      cm.sp('py', 1),
      cm.textSize('xs'),
      cm.fontWeight('medium'),
      cm.roundedFull,
      this.className,
      this.bodyControl() ? cm.cursorPointer : '',
    )
  }

  /**
   * The label button's pointer class.
   * @returns The class string.
   */
  cursorClass(): string {
    const cm = this.cm()
    return cm.cn(cm.cursorPointer)
  }

  /**
   * The remove button's class list.
   * @returns The class string.
   */
  removeClasses(): string {
    const cm = this.cm()
    return cm.cn(cm.w(4), cm.h(4), cm.flex({ align: 'center', justify: 'center' }))
  }

  /**
   * The remove button's accessible name.
   * @returns The translated label.
   */
  removeLabel(): string {
    return this.i18n.t('tagChip.remove', {}, { defaultValue: 'Remove' })
  }

  /**
   * Mouse activation of the chip body — only when the chip itself is the
   * control (otherwise a button inside it carries the action).
   * @param event - The DOM click event.
   */
  handleHostClick(event: Event): void {
    if (!this.bodyControl()) return
    this.onClick?.(event)
  }

  /**
   * Keyboard activation for the chip body — the same handler the mouse click
   * runs. `preventDefault()` suppresses Space's page scroll and Enter's form
   * submission when a chip sits inside a form.
   * @param event - The DOM keyboard event.
   */
  handleHostKeyDown(event: KeyboardEvent): void {
    if (!this.bodyControl()) return
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    this.onClick?.()
  }

  /**
   * Runs the body action from the label button.
   * @param event - The DOM click event.
   */
  emitClick(event: Event): void {
    this.onClick?.(event)
  }

  /**
   * Runs the remove action.
   * @param event - The DOM click event.
   */
  emitRemove(event: Event): void {
    this.onRemove?.(event)
  }

  /**
   * Applies React's DOM after each render: the label button exists only while
   * the chip holds both actions, and the label then moves inside it; the
   * remove button exists while `onRemove` is set.
   */
  private reconcile(): void {
    const label = this.label?.nativeElement
    const labelButton = this.labelButton?.nativeElement
    const removeButton = this.removeButton?.nativeElement
    if (!label || !labelButton || !removeButton) return
    const removable = !!this.onRemove
    // React renders the label button only when the chip holds BOTH actions:
    // a chip with one action is that control itself.
    const labelButtonControl = !!this.onClick && removable

    // React renders the projected label bare: its content stands in the capture point's
    // place and the point itself leaves the page.
    const capture = this.capture?.nativeElement
    if (capture) {
      placeContentBefore(capture, capture)
      setElementPresent(capture, false)
    }

    // The label button is present only in that both-actions branch, and the
    // label itself moves inside it there (React renders it around the label
    // text); otherwise the label sits in the chip and any remove button beside
    // it. The helpers keep Angular's own place for each node.
    setElementPresent(labelButton, labelButtonControl)
    placeElement(label, labelButtonControl ? labelButton : null)
    setElementPresent(removeButton, removable)
  }
}
