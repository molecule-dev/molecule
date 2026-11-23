/**
 * ConfirmDialog component (React parity): the shared "Are you sure?" modal.
 *
 * @module
 */

import {
  Component,
  ElementRef,
  EventEmitter,
  inject,
  Output,
  signal,
  type TemplateRef,
  ViewChild,
} from '@angular/core'

import {
  MolPlacement,
  setElementPresent,
  setHostRoot,
  usePlacement,
  useTranslation,
} from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { nextInstanceId } from '../utilities/ids.js'
import { asTemplate, isGiven, nodeText, rendersNode } from '../utilities/node-value.js'
import { Button } from './button.component.js'
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
 * `[slot=description]`, default) or node-valued inputs. React's root is a
 * `Modal`, which renders a portal while open and nothing while closed, so the
 * host element leaves the page and the portal renders in `document.body`.
 */
@Component({
  selector: 'mol-confirm-dialog',
  standalone: true,
  hostDirectives: [MolPlacement],
  imports: [Button, Modal, MolTemplateOutlet],
  inputs: ['open', 'title', 'description', 'confirmLabel', 'cancelLabel', 'destructive', 'loading'],
  outputs: ['close', 'confirm'],
  template: `<mol-modal
    #modal
    [open]="open"
    (close)="close.emit($event)"
    [attr.aria-labelledby]="ariaLabelledBy()"
    [attr.aria-describedby]="ariaDescribedBy()"
    ><div [class]="cm().stack(3)">
      <h2
        #titleSlot
        [attr.id]="ariaLabelledBy()"
        [class]="cm().cn(cm().textSize('lg'), cm().fontWeight('bold'))"
      >
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
export class ConfirmDialog {
  /**
   * Per-instance id of the rendered title heading, wired as the dialog's
   * accessible name: the binding on `<mol-modal>` reaches the dialog `<div>`,
   * React's `{...rest}` target (Modal names it with `setHostRoot`) —
   * `aria-labelledby` pointing at the visible `<h2>` (WAI-ARIA dialog
   * pattern; axe `aria-dialog-name`).
   */
  readonly titleId = `mol-confirm-dialog-title-${++confirmDialogInstances}`

  /**
   * Per-instance id of the rendered description paragraph, wired as the
   * dialog's accessible description the same way as the title (only bound when projected description content renders — a
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

  /** The title heading (its projected nodes decide whether the dialog points at it). */
  @ViewChild('titleSlot', { static: true }) titleSlot?: ElementRef<HTMLHeadingElement>

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
   * content renders. A signal the template reads, so the association follows
   * the projected description in the pass where it changes.
   */
  readonly ariaDescribedBy = signal<string | null>(null)

  /**
   * The title heading's id, which the dialog's `aria-labelledby` points at, or null while the title
   * renders nothing (React's `slot(title)`): a heading with no text names nothing.
   */
  readonly ariaLabelledBy = signal<string | null>(null)

  /** The composed Modal's element: what the caller binds on this tag lands there, and Modal passes it to its dialog. */
  @ViewChild('modal', { read: ElementRef }) modalElement?: ElementRef<HTMLElement>

  private readonly host: ElementRef<HTMLElement> = inject(ElementRef)

  /**
   * Recomputes {@link ariaLabelledBy} and {@link ariaDescribedBy} from the
   * title and description inputs and their projected nodes in
   * the placement function, and takes the host out of the page (React renders
   * the composed `Modal`'s portal in `document.body`, nothing here).
   */
  constructor() {
    usePlacement((hasContent) => {
      this.ariaLabelledBy.set(
        rendersNode(this.title) || hasContent(this.titleSlot?.nativeElement) ? this.titleId : null,
      )
      this.ariaDescribedBy.set(
        rendersNode(this.description) || hasContent(this.descriptionSlot?.nativeElement)
          ? this.descriptionId
          : null,
      )
      setElementPresent(this.host.nativeElement, false)
      setHostRoot(this.host.nativeElement, this.modalElement?.nativeElement)
    })
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
