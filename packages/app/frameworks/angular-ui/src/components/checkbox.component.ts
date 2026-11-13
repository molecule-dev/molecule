/**
 * Checkbox component (React parity).
 *
 * @module
 */

import {
  type AfterViewChecked,
  Component,
  ElementRef,
  EventEmitter,
  inject,
  Output,
  Renderer2,
  ViewChild,
} from '@angular/core'

import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import type { FormFieldContext } from '../utilities/form-field-context.js'
import { fieldContext } from '../utilities/form-field-context.js'
import { moveRestAttributes } from '../utilities/rest-attrs.js'
import { styleText } from '../utilities/style.js'
import { hasNodes, SlotWrapper } from './button.component.js'

/**
 * Checkbox component.
 *
 * The host is the `div.formFieldWrapper` React renders. The error message is
 * programmatically associated with the input through `aria-describedby`;
 * the input is React's `...rest` spread target, so rest attributes move
 * there at view init.
 */
@Component({
  selector: 'div[mol-checkbox]',
  standalone: true,
  inputs: [
    'label',
    'checked',
    'indeterminate',
    'size',
    'error',
    'className',
    'style',
    'testId',
    'disabled',
    'name',
    'id',
    'defaultChecked',
  ],
  host: {
    '[class]': 'cm().formFieldWrapper',
  },
  template: `<label [class]="cm().controlLabel">
      <input
        type="checkbox"
        [attr.id]="checkboxId()"
        [attr.name]="name"
        [attr.checked]="isChecked() ? '' : null"
        [disabled]="disabled"
        [attr.data-state]="checked ? 'checked' : 'unchecked'"
        [attr.aria-invalid]="error || fieldContext()?.invalid ? 'true' : 'false'"
        [attr.aria-describedby]="mergedDescribedBy()"
        [class]="classes()"
        [attr.style]="hostStyle()"
        [attr.data-testid]="testId"
        (click)="handleClick($event)"
        (change)="handleChange($event)"
        #input
      />
      <span [class]="cm().cn(cm().controlText, disabled && cm().controlDisabled)" #labelSlot
        >{{ label }}<ng-content select="[slot=label]"></ng-content
      ></span>
    </label>
    @if (error) {
      <p [attr.id]="errorId()" [class]="cm().cn(cm().formError, cm().sp('mt', 1))">{{ error }}</p>
    }`,
})
export class Checkbox implements AfterViewChecked {
  /** Checkbox label (text, or projected `[slot=label]` nodes). */
  label?: unknown
  /** Whether the checkbox is checked. */
  checked?: boolean
  /** Whether the checkbox renders the indeterminate state. */
  indeterminate?: boolean
  /** Checkbox size (kept for prop parity). */
  size?: unknown
  /** Error message (renders and associates via aria-describedby). */
  error?: string
  /** Extra classes joined onto the checkbox classes. */
  className?: string
  /** Inline style object (React camelCase). */
  style?: Record<string, unknown>
  /** `data-testid` for the input. */
  testId?: string
  /** Disables the checkbox. */
  disabled?: boolean
  /** Form field name. */
  name?: string
  /** Explicit id (defaults to the name). */
  id?: string
  /** Uncontrolled initial checked state (renders as the checked attribute). */
  defaultChecked?: boolean

  /**
   * The controlled-or-default checked state (React: `checked ?? defaultChecked`).
   * @returns True when the checked attribute renders.
   */
  isChecked(): boolean {
    return (this.checked ?? this.defaultChecked) === true
  }

  /** The genuine native `change` event. */
  @Output() readonly change = new EventEmitter<Event>()

  /** The native input (React's `...rest` spread target). */
  @ViewChild('input') input?: ElementRef<HTMLInputElement>
  /** The label text wrapper. */
  @ViewChild('labelSlot') labelSlot?: ElementRef<HTMLSpanElement>

  private readonly host = inject(ElementRef)
  /** The `aria-describedby` the caller spread onto the host (React's rest). */
  private restDescribedBy: string | null = null
  /** Whether the rest-describedby value was captured. */
  private restDescribedByCaptured = false
  private readonly sync = new SlotWrapper(inject(ElementRef), inject(Renderer2))
  private hasLabel = false
  private syncIndeterminate = false

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * The id of the label-side element (`id` or `name`).
   * @returns The id value or undefined.
   */
  checkboxId(): string | undefined {
    return this.id || this.fieldContext()?.id || this.name
  }

  /**
   * The error message id (a stable generated id, renumbered consistently by
   * the DOM normalizer like React's `useId`).
   * @returns The error element id.
   */
  errorId(): string {
    return `${this.checkboxId() ?? 'r0'}-error`
  }

  /**
   * The nearest enclosing `FormField` context (React's cloned props).
   * @returns The context, or null.
   */
  fieldContext(): FormFieldContext | null {
    return fieldContext(this.host.nativeElement as HTMLElement)
  }

  /**
   * The final `aria-describedby`: the enclosing FormField's error/hint
   * target, then this checkbox's own error (React's cloneElement join).
   * @returns The attribute value, or null.
   */
  mergedDescribedBy(): string | null {
    return (
      this.fieldContext()?.describedBy ??
      this.restDescribedBy ??
      (this.error ? this.errorId() : null)
    )
  }

  /**
   * Computes the checkbox class list.
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(this.cm().checkbox({ error: !!this.error }), this.className)
  }

  /**
   * Serializes the inline style for the input.
   * @returns The style attribute text.
   */
  hostStyle(): string | null {
    return styleText(this.style)
  }

  /**
   * React's checkbox `onChange` fires on the checkbox's CLICK event (React's
   * change-event plugin maps checkbox/radio changes to the click), so the
   * click event object is what callers receive.
   *
   * @param event - The native click event.
   */
  handleClick(event: Event): void {
    this.justClicked = true
    this.change.emit(event)
    queueMicrotask(() => (this.justClicked = false))
  }

  /**
   * A native change that did not come from this tick's click (a synthetic
   * `dispatchEvent`) is forwarded like React would; the event never reaches
   * the host, where the `change` output binding would record it twice. A
   * CONTROLLED checkbox (`checked` prop given) is restored to the prop value
   * afterwards, exactly like React's controlled-input state restore.
   *
   * @param event - The native change event.
   */
  handleChange(event: Event): void {
    event.stopPropagation()
    if (!this.justClicked) this.change.emit(event)
    if (this.checked !== undefined && this.input) this.input.nativeElement.checked = !!this.checked
  }

  private justClicked = false

  /**
   * Applies the indeterminate DOM flag (a property, not an attribute) and
   * React's `{!!label && <span>}` label condition.
   */
  ngAfterViewChecked(): void {
    const input = this.input?.nativeElement
    if (input) {
      if (!this.restDescribedByCaptured) {
        this.restDescribedBy = this.host.nativeElement.getAttribute('aria-describedby')
        this.restDescribedByCaptured = true
      }
      moveRestAttributes(this.host.nativeElement, input)
      if (this.syncIndeterminate !== !!this.indeterminate) {
        input.indeterminate = !!this.indeterminate
        this.syncIndeterminate = !!this.indeterminate
      }
    }
    this.hasLabel = !!this.label || hasNodes(this.labelSlot?.nativeElement)
    this.sync.sync(
      this.labelSlot?.nativeElement,
      this.hasLabel,
      this.labelSlot?.nativeElement.parentElement ?? undefined,
    )
  }
}
