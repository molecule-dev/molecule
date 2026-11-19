/**
 * ConfirmDialog component (React parity): the shared "Are you sure?" modal.
 *
 * @module
 */

import {
  Component,
  type DoCheck,
  type ElementRef,
  EventEmitter,
  Output,
  type TemplateRef,
  ViewChild,
} from '@angular/core'

import { useTranslation } from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { nextInstanceId } from '../utilities/ids.js'
import { asTemplate, isGiven, nodeText } from '../utilities/node-value.js'
import { Button, hasNodes } from './button.component.js'
import { Modal } from './modal.component.js'
import { MolTemplateOutlet } from './template-outlet.directive.js'

/** Instance counter behind {@link ConfirmDialog.titleId} (Modal's pattern). */
let confirmDialogInstances = 0

/**
 * Props for {@link ConfirmDialog} (React's `ConfirmDialogProps`, in Angular's
 * form).
 *
 * Node-valued members are `string | number | TemplateRef<unknown>` inputs; a
 * caller may project the same content as `[slot=title]` / `[slot=description]`
 * instead. `onClose` and `onConfirm` keep React's names and signatures here;
 * the component emits them through its `close` and `confirm` outputs.
 */
export interface ConfirmDialogProps {
  /** Whether the dialog is open. */
  open: boolean
  /** Called when the dialog should close (carried by the `close` output). */
  onClose: () => void
  /** Title. */
  title?: string | number | TemplateRef<unknown>
  /** Body / warning text. */
  description?: string | number | TemplateRef<unknown>
  /** Confirm-button label. */
  confirmLabel?: string | number | TemplateRef<unknown>
  /** Cancel-button label. */
  cancelLabel?: string | number | TemplateRef<unknown>
  /** Called when the user confirms (carried by the `confirm` output). */
  onConfirm: () => void | Promise<void>
  /** Is the confirm action destructive? Defaults to true. */
  destructive?: boolean
  /** Disables both buttons (the caller owns the pending state). */
  loading?: boolean
}

/**
 * ConfirmDialog component.
 *
 * Composed from `Modal` and `Button` exactly as React composes them; the
 * dialog's own title/description/children are projected content (`[slot=title]`,
 * `[slot=description]`, default) or node-valued inputs. The host is unwrapped
 * (`data-parity-unwrap`, React's `Modal` root is a fragment/portal).
 */
@Component({
  selector: 'mol-confirm-dialog',
  standalone: true,
  imports: [Button, Modal, MolTemplateOutlet],
  inputs: ['open', 'title', 'description', 'confirmLabel', 'cancelLabel', 'destructive', 'loading'],
  outputs: ['close', 'confirm'],
  host: {
    'data-parity-unwrap': '',
    style: 'display: contents',
  },
  template: `<mol-modal
    [open]="open"
    (close)="close.emit($event)"
    [attr.aria-labelledby]="titleId"
    [attr.aria-describedby]="ariaDescribedBy"
    ><div [class]="cm().stack(3)">
      <h2 [attr.id]="titleId" [class]="cm().cn(cm().textSize('lg'), cm().fontWeight('bold'))">
        @if (isGiven(title)) {
          <ng-container [molTemplateOutlet]="asTemplate(title)"></ng-container>{{ nodeText(title) }}
        }
        <ng-content select="[slot=title]"></ng-content>
      </h2>
      <p #descriptionSlot [attr.id]="descriptionId" [class]="cm().textSize('sm')">
        @if (isGiven(description)) {
          <ng-container [molTemplateOutlet]="asTemplate(description)"></ng-container
          >{{ nodeText(description) }}
        }
        <ng-content select="[slot=description]"></ng-content>
      </p>
      <ng-content></ng-content>
      <div [class]="cm().flex({ justify: 'end', gap: 'sm' })">
        <button mol-button [variant]="'ghost'" [disabled]="!!loading" (click)="close.emit($event)">
          @if (isGiven(cancelLabel)) {
            <ng-container [molTemplateOutlet]="asTemplate(cancelLabel)"></ng-container
            >{{ nodeText(cancelLabel) }}
          } @else {
            {{ cancelText() }}
          }</button
        ><button
          mol-button
          [variant]="'solid'"
          [color]="destructive === false ? 'primary' : 'error'"
          [disabled]="!!loading"
          (click)="confirm.emit()"
        >
          @if (isGiven(confirmLabel) && !loading) {
            <ng-container [molTemplateOutlet]="asTemplate(confirmLabel)"></ng-container
            >{{ nodeText(confirmLabel) }}
          } @else {
            {{ confirmText() }}
          }
        </button>
      </div>
    </div></mol-modal
  >`,
})
export class ConfirmDialog implements DoCheck {
  /**
   * Per-instance id of the rendered title heading, wired as the dialog's
   * accessible name: the binding on `<mol-modal>` lands on its host element,
   * which Modal's rest-attribute move copies onto the dialog `<div>` —
   * `aria-labelledby` pointing at the visible `<h2>` (WAI-ARIA dialog
   * pattern; axe `aria-dialog-name`).
   */
  readonly titleId = `mol-confirm-dialog-title-${++confirmDialogInstances}`

  /**
   * Per-instance id of the rendered description paragraph, wired as the
   * dialog's accessible description through the same rest-attribute move as
   * the title (only bound when projected description content renders — a
   * reference to an empty paragraph describes nothing, axe
   * `aria-dialog-name`/`aria-valid-attr-value`).
   */
  readonly descriptionId = nextInstanceId()

  /** The rendered description paragraph (its projected nodes decide the wiring). */
  // `static: true` resolves the query during creation, so the projected nodes
  // are readable on the FIRST change-detection pass — a non-static query
  // resolves after view init, one pass too late for the description wiring.
  @ViewChild('descriptionSlot', { static: true })
  descriptionSlot?: ElementRef<HTMLParagraphElement>

  /** Whether the dialog is open. */
  open: ConfirmDialogProps['open'] = false
  /** Title (node-valued prop). */
  title?: ConfirmDialogProps['title']
  /** Body / warning text (node-valued prop). */
  description?: ConfirmDialogProps['description']
  /** Confirm-button label (node-valued prop). */
  confirmLabel?: ConfirmDialogProps['confirmLabel']
  /** Cancel-button label (node-valued prop). */
  cancelLabel?: ConfirmDialogProps['cancelLabel']
  /** Whether the confirm action is destructive (default true). */
  destructive?: ConfirmDialogProps['destructive'] = true
  /** Disables both buttons (the caller owns the pending state). */
  loading?: ConfirmDialogProps['loading']

  /** Template helpers (templates see only class members). */
  readonly asTemplate = asTemplate
  /** Renders a plain-string/number node value. */
  readonly nodeText = nodeText
  /** Whether a node-valued prop was given. */
  readonly isGiven = isGiven

  /** Fires when the dialog should close (escape, backdrop, cancel). */
  @Output() readonly close = new EventEmitter<unknown>()
  /** Fires when the user confirms. */
  @Output() readonly confirm = new EventEmitter<void>()

  /**
   * Reactive translation, read in the injection context. Its `t` reads the
   * locale, so the view re-renders the text on a locale switch (the static `t`
   * does not).
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
   * The dialog's accessible description id, or null when no description
   * content renders. A FIELD, not a template method call: Angular memoizes a
   * no-argument method binding, so it would keep the first (pre-view-init)
   * value forever. Re-read each pass from the projected description nodes.
   */
  ariaDescribedBy: string | null = null

  /**
   * Recomputes {@link ariaDescribedBy} before each view check. The query is
   * static, so the projected nodes are readable on the first pass already; a
   * later change to what renders is picked up on the next pass.
   */
  ngDoCheck(): void {
    this.ariaDescribedBy =
      isGiven(this.description) || hasNodes(this.descriptionSlot?.nativeElement)
        ? this.descriptionId
        : null
  }

  /**
   * The cancel button's label.
   * @returns The label text.
   */
  cancelText(): string {
    return typeof this.cancelLabel === 'string'
      ? this.cancelLabel
      : this.i18n.t('confirm.cancel', {}, { defaultValue: 'Cancel' })
  }

  /**
   * The confirm button's label when no node label is given (React shows an
   * ellipsis while loading).
   * @returns The label text.
   */
  confirmText(): string {
    if (this.loading) return '…'
    return typeof this.confirmLabel === 'string'
      ? this.confirmLabel
      : this.i18n.t('confirm.confirm', {}, { defaultValue: 'Confirm' })
  }
}
