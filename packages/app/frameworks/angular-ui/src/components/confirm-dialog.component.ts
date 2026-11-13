/**
 * ConfirmDialog component (React parity): the shared "Are you sure?" modal.
 *
 * @module
 */

import { Component, EventEmitter, Output } from '@angular/core'

import { useTranslation } from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { Button } from './button.component.js'
import { Modal } from './modal.component.js'

/**
 * ConfirmDialog component.
 *
 * Composed from `Modal` and `Button` exactly as React composes them; the
 * dialog's own title/description/children are projected content (`[slot=title]`,
 * `[slot=description]`, default). The host is unwrapped (`data-parity-unwrap`,
 * React's `Modal` root is a fragment/portal).
 */
@Component({
  selector: 'mol-confirm-dialog',
  standalone: true,
  imports: [Button, Modal],
  inputs: ['open', 'title', 'description', 'confirmLabel', 'cancelLabel', 'destructive', 'loading'],
  outputs: ['close', 'confirm'],
  host: {
    'data-parity-unwrap': '',
    style: 'display: contents',
  },
  template: `<mol-modal [open]="open" (close)="close.emit($event)"
    ><div [class]="cm().stack(3)">
      <h2 [class]="cm().cn(cm().textSize('lg'), cm().fontWeight('bold'))">
        <ng-content select="[slot=title]"></ng-content>
      </h2>
      <p [class]="cm().textSize('sm')"><ng-content select="[slot=description]"></ng-content></p>
      <ng-content></ng-content>
      <div [class]="cm().flex({ justify: 'end', gap: 'sm' })">
        <button mol-button [variant]="'ghost'" [disabled]="!!loading" (click)="close.emit($event)">
          {{ cancelText() }}</button
        ><button
          mol-button
          [variant]="'solid'"
          [color]="destructive === false ? 'primary' : 'error'"
          [disabled]="!!loading"
          (click)="confirm.emit()"
        >
          {{ confirmText() }}
        </button>
      </div>
    </div></mol-modal
  >`,
})
export class ConfirmDialog {
  /** Whether the dialog is open. */
  open = false
  /** Title (node-valued prop). */
  title?: unknown
  /** Body / warning text (node-valued prop). */
  description?: unknown
  /** Confirm-button label. */
  confirmLabel?: string
  /** Cancel-button label. */
  cancelLabel?: string
  /** Whether the confirm action is destructive (default true). */
  destructive = true
  /** Disables both buttons (the caller owns the pending state). */
  loading?: boolean

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
   * The cancel button's label.
   * @returns The label text.
   */
  cancelText(): string {
    return this.cancelLabel ?? this.i18n.t('confirm.cancel', {}, { defaultValue: 'Cancel' })
  }

  /**
   * The confirm button's label (React shows an ellipsis while loading).
   * @returns The label text.
   */
  confirmText(): string {
    return this.loading
      ? '…'
      : (this.confirmLabel ?? this.i18n.t('confirm.confirm', {}, { defaultValue: 'Confirm' }))
  }
}
