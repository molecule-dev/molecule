/**
 * Textarea component (React parity).
 *
 * @module
 */

import {
  type AfterViewChecked,
  type AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  inject,
  Output,
  ViewChild,
} from '@angular/core'

import type { Size, UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import type { FormFieldContext } from '../utilities/form-field-context.js'
import { fieldContext } from '../utilities/form-field-context.js'
import { moveRestAttributes } from '../utilities/rest-attrs.js'
import { styleText } from '../utilities/style.js'

/**
 * Textarea component.
 *
 * The host is the `div.inputWrapper` React renders. React's textarea
 * `onChange` fires on `input` events; a controlled `value` is restored after
 * user input exactly like React's controlled-input state restore.
 * `autoResize` recomputes the inline height after every check and on real
 * `input` events (matching React's effect + native listener pair).
 */
@Component({
  selector: 'div[mol-textarea]',
  standalone: true,
  inputs: [
    'size',
    'label',
    'error',
    'hint',
    'autoResize',
    'minRows',
    'maxRows',
    'className',
    'style',
    'testId',
    'disabled',
    'required',
    'value',
    'defaultValue',
    'placeholder',
    'name',
    'id',
    'rows',
  ],
  host: {
    '[class]': 'cm().inputWrapper',
  },
  template: `@if (label) {
      <label
        [attr.for]="textareaId()"
        [class]="cm().cn(cm().label({ required: !!required }), cm().labelBlock)"
        >{{ label }}</label
      >
    }
    <textarea
      [attr.id]="textareaId()"
      [attr.name]="name"
      [attr.placeholder]="placeholder"
      [disabled]="disabled"
      [attr.required]="required ? '' : null"
      [attr.rows]="rows || minRows || 3"
      [attr.aria-invalid]="error || fieldContext()?.invalid ? 'true' : 'false'"
      [attr.aria-describedby]="mergedDescribedBy()"
      [class]="classes()"
      [attr.style]="hostStyle()"
      [attr.data-testid]="testId"
      (input)="handleInput($event)"
      (change)="handleChange($event)"
      #textareaEl
    ></textarea>
    @if (error) {
      <p [attr.id]="textareaId() + '-error'" [class]="cm().formError">{{ error }}</p>
    }
    @if (hint && !error) {
      <p [attr.id]="textareaId() + '-hint'" [class]="cm().formHint">{{ hint }}</p>
    }`,
})
export class Textarea implements AfterViewInit, AfterViewChecked {
  /** Textarea size. */
  size?: Size
  /** Field label. */
  label?: string
  /** Error message (associates via aria-describedby). */
  error?: string
  /** Hint text (shown without an error). */
  hint?: string
  /** Whether the box resizes to its content. */
  autoResize?: boolean
  /** Minimum rendered rows (autoResize floor). */
  minRows?: number
  /** Maximum rendered rows (autoResize ceiling). */
  maxRows?: number
  /** Extra classes joined onto the textarea classes. */
  className?: string
  /** Inline style object (React camelCase). */
  style?: Record<string, unknown>
  /** `data-testid` for the textarea. */
  testId?: string
  /** Disables the textarea. */
  disabled?: boolean
  /** Marks the textarea required (label styling). */
  required?: boolean
  /** Controlled value. */
  value?: string
  /** Uncontrolled initial value. */
  defaultValue?: string
  /** Placeholder text. */
  placeholder?: string
  /** Form field name. */
  name?: string
  /** Explicit textarea id. */
  id?: string
  /** Explicit rows attribute. */
  rows?: number

  /** Fires the raw `input` event (React's textarea onChange). */
  @Output() readonly change = new EventEmitter<Event>()

  /** The native textarea (React's `...rest` spread target). */
  @ViewChild('textareaEl') textareaEl?: ElementRef<HTMLTextAreaElement>

  private readonly host = inject(ElementRef)
  /** The `aria-describedby` the caller spread onto the host (React's rest). */
  private restDescribedBy: string | null = null
  /** Whether the rest-describedby value was captured. */
  private restDescribedByCaptured = false

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * The textarea id (`id`, `name`, or a stable generated id; the DOM
   * normalizer renumbers generated ids in order of appearance, like React's
   * `useId`).
   * @returns The id value.
   */
  textareaId(): string {
    return this.id || this.fieldContext()?.id || this.name || 'r0'
  }

  /**
   * The aria-describedby target (error or hint paragraph).
   * @returns The id or null.
   */
  describedBy(): string | null {
    if (this.error) return `${this.textareaId()}-error`
    if (this.hint) return `${this.textareaId()}-hint`
    return null
  }
  /**
   * The nearest enclosing `FormField` context (React's cloned props).
   * @returns The context, or null.
   */
  fieldContext(): FormFieldContext | null {
    return fieldContext(this.host.nativeElement as HTMLElement)
  }

  /**
   * The final `aria-describedby`: a rest-provided value first, then the
   * enclosing FormField's error/hint target (React's cloneElement join).
   * @returns The attribute value, or null.
   */
  mergedDescribedBy(): string | null {
    const target = this.fieldContext()?.describedBy
    if (target) return [this.restDescribedBy, target].filter(Boolean).join(' ')
    return this.restDescribedBy ?? this.describedBy()
  }

  /**
   * Computes the textarea class list.
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(
      this.cm().textarea({ error: !!this.error, size: this.size }),
      this.className,
    )
  }

  /**
   * Serializes the inline style for the textarea: `autoResize` neutralizes the
   * bond's min-height class (`minHeight: 0`, `resize: none`) and the caller's
   * style still wins, exactly like React's spread.
   * @returns The style attribute text.
   */
  hostStyle(): string | null {
    return styleText(this.autoResize ? { minHeight: 0, resize: 'none', ...this.style } : this.style)
  }

  /**
   * React's textarea onChange: the `input` event, with the controlled value
   * restored afterwards and the autoResize height recomputed (React listens
   * for native `input` events on the element itself).
   *
   * @param event - The native input event.
   */
  handleInput(event: Event): void {
    event.stopPropagation()
    this.change.emit(event)
    const textarea = this.textareaEl?.nativeElement
    if (this.value !== undefined && textarea && textarea.value !== this.value)
      textarea.value = this.value
    this.resize()
  }

  /**
   * The native change event never reaches the host (its `change` output
   * binding would record it a second time; React's onChange already fired on
   * the input event).
   *
   * @param event - The native change event.
   */
  handleChange(event: Event): void {
    event.stopPropagation()
  }

  /**
   * Sizes the box to its content: React's `resize()` — height `auto`, then
   * clamp `scrollHeight` between `minRows * lineHeight` and
   * `maxRows * lineHeight` (`lineHeight` falls back to 20 when the computed
   * value does not parse, matching React's `parseInt(...) || 20`).
   */
  resize(): void {
    const element = this.textareaEl?.nativeElement
    if (!this.autoResize || !element) return
    element.style.height = 'auto'
    const lineHeight = parseInt(window.getComputedStyle(element).lineHeight) || 20
    const minHeight = (this.minRows ?? 3) * lineHeight
    const maxHeight = this.maxRows ? this.maxRows * lineHeight : Infinity
    const newHeight = Math.min(Math.max(element.scrollHeight, minHeight), maxHeight)
    element.style.height = `${newHeight}px`
  }

  /**
   * Moves rest attributes onto the textarea, applies the initial value (React
   * sets a textarea's value through the PROPERTY — the `value` attribute is
   * never rendered) and runs the first autoResize pass (React's mount effect).
   */
  ngAfterViewInit(): void {
    if (!this.restDescribedByCaptured) {
      this.restDescribedBy = this.host.nativeElement.getAttribute('aria-describedby')
      this.restDescribedByCaptured = true
    }
    moveRestAttributes(this.host.nativeElement, this.textareaEl?.nativeElement)
    this.applyValue(true)
    this.resize()
  }

  /**
   * Re-applies a controlled value and recomputes the autoResize height after
   * every check (React re-runs the value effect whenever `value` changes;
   * running here covers that and any other input change in one place).
   */
  ngAfterViewChecked(): void {
    this.applyValue(false)
    this.resize()
  }

  /**
   * Writes the value to the textarea's value property: the controlled
   * `value` every check, the `defaultValue` only at mount (uncontrolled
   * typing afterwards is the user's, exactly like React).
   *
   * @param initial - Whether this is the mount pass.
   */
  private applyValue(initial: boolean): void {
    const textarea = this.textareaEl?.nativeElement
    if (!textarea) return
    if (this.value !== undefined) {
      const next = String(this.value)
      if (textarea.value !== next) textarea.value = next
    } else if (initial && this.defaultValue !== undefined && textarea.value === '') {
      textarea.value = String(this.defaultValue)
    }
  }
}
