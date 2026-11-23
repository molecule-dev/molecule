/**
 * PromptDialog component (React parity): the shared "ask for a short string"
 * modal.
 *
 * @module
 */

import {
  afterNextRender,
  type AfterViewChecked,
  type AfterViewInit,
  Component,
  type DoCheck,
  ElementRef,
  EventEmitter,
  inject,
  Injector,
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
import { asTemplate, isGiven, nodeText } from '../utilities/node-value.js'
import { Button } from './button.component.js'
import { Input } from './input.component.js'
import { Modal } from './modal.component.js'
import { MolTemplateOutlet } from './template-outlet.directive.js'

/**
 * Props for {@link PromptDialog} (React's `PromptDialogProps`, in Angular's
 * form).
 *
 * Node-valued members are `string | number | TemplateRef<unknown>` inputs; the
 * title may also be projected as `[slot=title]`. `onClose` keeps React's name
 * and signature and is carried by the component's `close` output.
 */
export interface PromptDialogProps {
  /** Whether the dialog is open. */
  open: boolean
  /** Called when the dialog should close (carried by the `close` output). */
  onClose: () => void
  /** Dialog heading. */
  title?: string | number | TemplateRef<unknown>
  /** Explanatory line under the title. */
  description?: string | number | TemplateRef<unknown>
  /** Input placeholder. */
  placeholder?: string
  /** Value the input starts from every time the dialog opens. */
  initialValue?: string
  /** Called with the entered value on confirm. */
  onSubmit: (value: string) => void | Promise<void>
  /** Confirm-button label. */
  confirmLabel?: string | number | TemplateRef<unknown>
  /** Cancel-button label. */
  cancelLabel?: string | number | TemplateRef<unknown>
  /** Renders the confirm button in the error color. */
  destructive?: boolean
  /** `data-mol-id` for the text input. */
  inputMolId?: string
  /** `data-mol-id` for the confirm button. */
  confirmMolId?: string
  /** `data-mol-id` for the cancel button. */
  cancelMolId?: string
}

/**
 * PromptDialog component.
 *
 * Composed from `Modal`, `Input` and `Button` exactly as React composes
 * them. Resolving `onSubmit` closes the dialog and resets it; a rejection
 * keeps it open with the value intact. React's root is a `Modal`, which
 * renders a portal while open and nothing while closed, so the host element
 * leaves the page and the portal renders in `document.body`.
 */
@Component({
  selector: 'mol-prompt-dialog',
  standalone: true,
  hostDirectives: [MolPlacement],
  imports: [Button, Input, Modal, MolTemplateOutlet],
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
  template: `<mol-modal
    #modal
    [open]="open"
    (close)="onModalClose()"
    [attr.aria-labelledby]="titleId"
    [attr.aria-describedby]="isGiven(description) ? descriptionId : null"
    ><form (submit)="handleSubmit($event)">
      <div [class]="cm().stack(3)">
        <h2
          #titleSlot
          [attr.id]="titleId"
          [class]="cm().cn(cm().textSize('lg'), cm().fontWeight('bold'))"
        >
          @if (isGiven(title)) {
            <ng-container [molTemplateOutlet]="asTemplate(title)"></ng-container
            >{{ nodeText(title) }}
          } @else {
            <ng-content select="[slot=title]"></ng-content>
          }
        </h2>
        @if (asTemplate(description); as descriptionTemplate) {
          <p [attr.id]="descriptionId" [class]="cm().textSize('sm')">
            <ng-container [molTemplateOutlet]="descriptionTemplate"></ng-container>
          </p>
        } @else if (isGiven(description)) {
          <p
            [attr.id]="descriptionId"
            [class]="cm().textSize('sm')"
            [textContent]="nodeText(description)"
          ></p>
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
            @if (isGiven(cancelLabel)) {
              <ng-container [molTemplateOutlet]="asTemplate(cancelLabel)"></ng-container
              >{{ nodeText(cancelLabel) }}
            } @else {
              {{ cancelText() }}
            }</button
          ><button
            mol-button
            [type]="'submit'"
            [variant]="'solid'"
            [color]="destructive ? 'error' : 'primary'"
            [disabled]="pending()"
            [attr.data-mol-id]="confirmMolId"
          >
            @if (isGiven(confirmLabel)) {
              <ng-container [molTemplateOutlet]="asTemplate(confirmLabel)"></ng-container
              >{{ nodeText(confirmLabel) }}
            } @else {
              {{ confirmText() }}
            }
          </button>
        </div>
      </div>
    </form></mol-modal
  >`,
})
export class PromptDialog implements AfterViewInit, AfterViewChecked, DoCheck {
  /** Whether the dialog is open. */
  open: PromptDialogProps['open'] = false
  /** Dialog heading (node-valued prop). */
  title?: PromptDialogProps['title']
  /** Explanatory line under the title (node-valued prop). */
  description?: PromptDialogProps['description']
  /** Input placeholder. */
  placeholder?: PromptDialogProps['placeholder']
  /** Value the input starts from every time the dialog opens. */
  initialValue?: PromptDialogProps['initialValue'] = ''
  /**
   * Called with the entered value on confirm. Resolve to close the dialog;
   * reject or throw to keep it open.
   */
  onSubmit?: PromptDialogProps['onSubmit']
  /** Confirm-button label (node-valued prop). */
  confirmLabel?: PromptDialogProps['confirmLabel']
  /** Cancel-button label (node-valued prop). */
  cancelLabel?: PromptDialogProps['cancelLabel']
  /** Renders the confirm button in the error color. */
  destructive?: PromptDialogProps['destructive'] = false
  /** `data-mol-id` for the text input. */
  inputMolId?: PromptDialogProps['inputMolId']
  /** `data-mol-id` for the confirm button. */
  confirmMolId?: PromptDialogProps['confirmMolId']
  /** `data-mol-id` for the cancel button. */
  cancelMolId?: PromptDialogProps['cancelMolId']

  /** Template helpers (templates see only class members). */
  readonly asTemplate = asTemplate
  /** Renders a plain-string/number node value. */
  readonly nodeText = nodeText
  /** Whether a node-valued prop was given. */
  readonly isGiven = isGiven

  /** Fires when the dialog should close (escape, backdrop, cancel, a fulfilled submit). */
  @Output() readonly close = new EventEmitter<unknown>()

  /** The dialog heading element (its text seeds the input's aria-label). */
  @ViewChild('titleSlot') titleSlot?: ElementRef<HTMLHeadingElement>
  /** The composed input (its native element receives React's aria-label). */
  @ViewChild(Input) inputComponent?: Input
  /** The composed Modal's element: what the caller binds on this tag lands there, and Modal passes it to its dialog. */
  @ViewChild('modal', { read: ElementRef }) modalElement?: ElementRef<HTMLElement>

  /**
   * Per-instance id of the rendered title heading, wired as the dialog's
   * accessible name: the binding on `<mol-modal>` reaches the dialog `<div>`,
   * React's `{...rest}` target (Modal names it with `setHostRoot`) —
   * `aria-labelledby` pointing at the visible `<h2>` (WAI-ARIA dialog
   * pattern; axe `aria-dialog-name`).
   */
  readonly titleId = nextInstanceId()

  /**
   * Per-instance id of the rendered description paragraph, wired as the
   * dialog's accessible description (only bound when a description renders —
   * a reference to nothing fails axe `aria-valid-attr-value`).
   */
  readonly descriptionId = nextInstanceId()

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

  private readonly host: ElementRef<HTMLElement> = inject(ElementRef)

  private lastOpen = false
  private lastInitial = ''
  /** Whether an open transition is waiting for the after-view input focus. */
  private pendingInputFocus = false
  /** Schedules the deferred focus from the view hook (outside an injection context). */
  private readonly injector = inject(Injector)

  /**
   * Takes the host out of the page (React renders the composed `Modal`'s
   * portal, nothing here); what the caller binds on the tag lands on the Modal.
   */
  constructor() {
    usePlacement(() => {
      setElementPresent(this.host.nativeElement, false)
      setHostRoot(this.host.nativeElement, this.modalElement?.nativeElement)
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
   * The cancel button's label.
   * @returns The label text.
   */
  cancelText(): string {
    return typeof this.cancelLabel === 'string'
      ? this.cancelLabel
      : this.i18n.t('prompt.cancel', {}, { defaultValue: 'Cancel' })
  }

  /**
   * The confirm button's label.
   * @returns The label text.
   */
  confirmText(): string {
    return typeof this.confirmLabel === 'string'
      ? this.confirmLabel
      : this.i18n.t('prompt.confirm', {}, { defaultValue: 'Confirm' })
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
   * effect). The composed `Modal`'s view init has already run (children init
   * first) and moved focus into the dialog.
   */
  ngAfterViewInit(): void {
    this.applyInputLabel()
    this.lastOpen = !!this.open
    this.lastInitial = this.initialValue ?? ''
    if (this.open) {
      this.value.set(this.initialValue ?? '')
      this.pending.set(false)
      // The dialog exists to take one string, so opening it puts focus in the
      // input — after the Modal has focused the dialog's first control.
      this.pendingInputFocus = true
    }
  }

  /**
   * Focuses the input after the view — and the composed `Modal`'s focus move —
   * has settled (React's `[open]` effect running after the Modal's effects).
   * Scheduling the DOM call here (rather than at registration) keeps it after
   * the Modal's own deferred move, so the input wins.
   */
  ngAfterViewChecked(): void {
    if (!this.pendingInputFocus) return
    this.pendingInputFocus = false
    afterNextRender(() => this.focusInput(), { injector: this.injector })
  }

  /**
   * Re-seeds the value on a later open transition (React's effect). The flag
   * set here is consumed in ngAfterViewChecked, which runs after the child
   * `Modal`'s own check (where its open transition schedules its focus move)
   * has completed.
   */
  ngDoCheck(): void {
    const open = !!this.open
    this.applyInputLabel()
    if (open !== this.lastOpen || (open && this.initialValue !== this.lastInitial)) {
      this.lastOpen = open
      this.lastInitial = this.initialValue ?? ''
      if (open) {
        this.value.set(this.initialValue ?? '')
        this.pending.set(false)
        this.pendingInputFocus = true
      }
    }
  }

  /**
   * Moves focus into the dialog's input after the render (the input ends up
   * focused, exactly as React's post-Modal focus effect leaves it). Does
   * nothing without a rendered input.
   */
  focusInput(): void {
    this.inputComponent?.inputEl?.nativeElement.focus()
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
