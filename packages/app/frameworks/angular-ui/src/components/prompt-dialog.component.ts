/**
 * PromptDialog component (React parity): the shared "ask for a short string"
 * modal.
 *
 * @module
 */

import {
  type AfterViewInit,
  Component,
  type DoCheck,
  type ElementRef,
  EventEmitter,
  Output,
  signal,
  ViewChild,
} from '@angular/core'

import { useTranslation } from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { Button } from './button.component.js'
import { Input } from './input.component.js'
import { Modal } from './modal.component.js'

/**
 * PromptDialog component.
 *
 * Composed from `Modal`, `Input` and `Button` exactly as React composes
 * them. Resolving `onSubmit` closes the dialog and resets it; a rejection
 * keeps it open with the value intact. The host is unwrapped
 * (`data-parity-unwrap`, React's `Modal` root is a fragment/portal).
 */
@Component({
  selector: 'mol-prompt-dialog',
  standalone: true,
  imports: [Button, Input, Modal],
  inputs: [
    'open',
    'title',
    'description',
    'placeholder',
    'initialValue',
    'onSubmit',
    'confirmLabel',
    'cancelLabel',
    'destructive',
    'inputMolId',
    'confirmMolId',
    'cancelMolId',
  ],
  outputs: ['close'],
  host: {
    'data-parity-unwrap': '',
    style: 'display: contents',
  },
  template: `<mol-modal [open]="open" (close)="onModalClose()"
    ><form (submit)="handleSubmit($event)">
      <div [class]="cm().stack(3)">
        <h2 #titleSlot [class]="cm().cn(cm().textSize('lg'), cm().fontWeight('bold'))">
          <ng-content select="[slot=title]"></ng-content>
        </h2>
        @if (description) {
          <p [class]="cm().textSize('sm')">{{ description }}</p>
        }
        <div
          mol-input
          [value]="value()"
          [placeholder]="placeholder"
          [disabled]="pending()"
          [attr.data-mol-id]="inputMolId"
          (change)="onInput($event)"
        ></div>
        <ng-content></ng-content>
        <div [class]="cm().flex({ justify: 'end', gap: 'sm' })">
          <button
            mol-button
            [type]="'button'"
            [variant]="'ghost'"
            [disabled]="pending()"
            (click)="close.emit($event)"
            [attr.data-mol-id]="cancelMolId"
          >
            {{ cancelText() }}</button
          ><button
            mol-button
            [type]="'submit'"
            [variant]="'solid'"
            [color]="destructive ? 'error' : 'primary'"
            [disabled]="pending()"
            [attr.data-mol-id]="confirmMolId"
          >
            {{ confirmText() }}
          </button>
        </div>
      </div>
    </form></mol-modal
  >`,
})
export class PromptDialog implements AfterViewInit, DoCheck {
  /** Whether the dialog is open. */
  open = false
  /** Dialog heading (node-valued prop). */
  title?: unknown
  /** Explanatory line under the title. */
  description?: string
  /** Input placeholder. */
  placeholder?: string
  /** Value the input starts from every time the dialog opens. */
  initialValue = ''
  /**
   * Called with the entered value on confirm. Resolve to close the dialog;
   * reject or throw to keep it open.
   */
  onSubmit?: (value: string) => void | Promise<void>
  /** Confirm-button label. */
  confirmLabel?: string
  /** Cancel-button label. */
  cancelLabel?: string
  /** Renders the confirm button in the error color. */
  destructive = false
  /** `data-mol-id` for the text input. */
  inputMolId?: string
  /** `data-mol-id` for the confirm button. */
  confirmMolId?: string
  /** `data-mol-id` for the cancel button. */
  cancelMolId?: string

  /** Fires when the dialog should close (escape, backdrop, cancel, a fulfilled submit). */
  @Output() readonly close = new EventEmitter<unknown>()

  /** The dialog heading element (its text seeds the input's aria-label). */
  @ViewChild('titleSlot') titleSlot?: ElementRef<HTMLHeadingElement>
  /** The composed input (its native element receives React's aria-label). */
  @ViewChild(Input) inputComponent?: Input

  /** The current input value. */
  readonly value = signal('')
  /** Whether a submit is in flight. */
  readonly pending = signal(false)

  /**
   * Reactive translation, read in the injection context. Its `t` reads the
   * locale, so the view re-renders the text on a locale switch (the static `t`
   * does not).
   */
  private readonly i18n = useTranslation()

  private lastOpen = false
  private lastInitial = ''

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
    return this.cancelLabel ?? this.i18n.t('prompt.cancel', {}, { defaultValue: 'Cancel' })
  }

  /**
   * The confirm button's label.
   * @returns The label text.
   */
  confirmText(): string {
    return this.confirmLabel ?? this.i18n.t('prompt.confirm', {}, { defaultValue: 'Confirm' })
  }

  /**
   * The input's accessible label: React uses the title when it is a plain
   * string, otherwise the placeholder.
   * @returns The label, or null when React would render none.
   */
  inputLabel(): string | null {
    const title = this.titleSlot?.nativeElement
    if (title) {
      const hasElement = Array.from(title.childNodes).some((node) => node.nodeType === 1)
      const text = (title.textContent ?? '').trim()
      if (!hasElement && text) return text
    }
    return this.placeholder ?? null
  }

  /**
   * Seeds the value when the dialog opens (React's `[open, initialValue]`
   * effect).
   */
  ngAfterViewInit(): void {
    this.applyInputLabel()
    this.lastOpen = !!this.open
    this.lastInitial = this.initialValue
    if (this.open) {
      this.value.set(this.initialValue)
      this.pending.set(false)
    }
  }

  /**
   * Re-seeds the value on a later open transition (React's effect).
   */
  ngDoCheck(): void {
    const open = !!this.open
    this.applyInputLabel()
    if (open !== this.lastOpen || (open && this.initialValue !== this.lastInitial)) {
      this.lastOpen = open
      this.lastInitial = this.initialValue
      if (open) {
        this.value.set(this.initialValue)
        this.pending.set(false)
      }
    }
  }

  /**
   * Applies React's `aria-label` to the inner input (it is a rest prop there,
   * and the view queries it needs resolve only after view init).
   */
  private applyInputLabel(): void {
    const input = this.inputComponent?.inputEl?.nativeElement
    if (!input) return
    const label = this.inputLabel()
    if (label === null) input.removeAttribute('aria-label')
    else input.setAttribute('aria-label', label)
  }

  /**
   * Tracks the typed value (React's controlled `onChange`).
   *
   * @param event - The native input event.
   */
  onInput(event: Event): void {
    this.value.set((event.target as HTMLInputElement).value)
  }

  /**
   * Modal's close request: ignored while a submit is pending (React passes a
   * no-op `onClose` while pending).
   */
  onModalClose(): void {
    if (this.pending()) return
    this.close.emit()
  }

  /**
   * Submits the entered value: resolve closes and resets; reject keeps the
   * dialog open (React's `handleSubmit`).
   *
   * @param event - The form submit event.
   */
  handleSubmit(event: Event): void {
    event.preventDefault()
    if (this.pending()) return
    this.pending.set(true)
    void Promise.resolve(this.onSubmit?.(this.value()))
      .then(() => {
        this.pending.set(false)
        this.close.emit()
      })
      .catch((_error: unknown) => {
        // Deliberate: a rejection keeps the dialog open and the caller owns
        // the error, rendering it through `children`.
        this.pending.set(false)
      })
  }
}
