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
  signal,
  ViewChild,
} from '@angular/core'

import { useTranslation } from '@molecule/app-angular'
import type { FocusEventHandler, KeyboardEventHandler, Size, UIClassMap } from '@molecule/app-ui'
import { fieldLayout, getClassMap } from '@molecule/app-ui'

import type { HasElement } from '../utilities/element.js'
import type { FormFieldContext } from '../utilities/form-field-context.js'
import { fieldContext } from '../utilities/form-field-context.js'
import { nextInstanceId } from '../utilities/ids.js'
import {
  adoptHostDataMolId,
  moveRestAttributes,
  reapplyRestAttributes,
} from '../utilities/rest-attrs.js'
import { styleText } from '../utilities/style.js'

/**
 * Textarea component.
 *
 * The host is the field's outer wrapper React renders (the shared field layout's
 * `root`, a flex column). React's textarea
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
    'automationId',
    'dataMolId: data-mol-id',
    'onFocus',
    'onBlur',
    'onKeyDown',
  ],
  host: {
    '[class]': 'field().root',
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
      [attr.data-mol-id]="molId()"
      (input)="handleInput($event)"
      (change)="handleChange($event)"
      (focusin)="onFocus?.($event)"
      (focusout)="onBlur?.($event)"
      (keydown)="onKeyDown?.($event)"
      #textareaEl
    ></textarea>
    @if (error) {
      <p [attr.id]="textareaId() + '-error'" [class]="cm().formError">{{ error }}</p>
    }
    @if (hint && !error) {
      <p [attr.id]="textareaId() + '-hint'" [class]="cm().formHint">{{ hint }}</p>
    }`,
})
export class Textarea implements AfterViewInit, AfterViewChecked, HasElement<HTMLTextAreaElement> {
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
  /** `data-mol-id` automation id (React's `automationId`). */
  automationId?: string
  /** A `data-mol-id` given as a plain rest attribute (React's `rootProps` precedence). */
  dataMolId?: string

  /** React's `onFocus`, which React spreads onto the <textarea>: its `currentTarget` is that element. */
  onFocus?: FocusEventHandler
  /** React's `onBlur`, which React spreads onto the <textarea>: its `currentTarget` is that element. */
  onBlur?: FocusEventHandler
  /** React's `onKeyDown`, which React spreads onto the <textarea>: its `currentTarget` is that element. */
  onKeyDown?: KeyboardEventHandler

  /** Fires the raw `input` event (React's textarea onChange). */
  @Output() readonly change = new EventEmitter<Event>()

  /** The native textarea (React's `...rest` spread target). */
  private textareaEl?: ElementRef<HTMLTextAreaElement>
  /** The native textarea view query; also feeds the caller's ref element. */
  @ViewChild('textareaEl')
  set textareaElQuery(ref: ElementRef<HTMLTextAreaElement> | undefined) {
    this.textareaEl = ref
    this.inner.set(ref?.nativeElement ?? null)
  }

  private readonly inner = signal<HTMLTextAreaElement | null>(null)
  /** The element a caller's ref receives: the native `<textarea>`. */
  readonly element = this.inner.asReadonly()

  private readonly host = inject(ElementRef)

  /** The per-instance id used when the caller gives no `id` or `name` (React's `useId`). */
  private readonly generatedId = nextInstanceId()

  /**
   * Reactive translation, read in the injection context. Its `locale` marks
   * this view for check on a locale switch (see {@link ngAfterViewChecked}).
   */
  private readonly i18n = useTranslation()

  /** The `aria-describedby` the caller spread onto the host (React's rest). */
  private restDescribedBy: string | null = null
  /** Whether the rest-describedby value was captured. */
  private restDescribedByCaptured = false
  /** The `data-mol-id` a caller bound on the host (React spreads it onto the textarea). */
  private externalMolId: string | undefined

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * The classes of the field's wrapper, from the shared field layout: the host takes `root`.
   * A textarea has no adornments, so it has no control row.
   * @returns The outer wrapper's classes (`root`) and the unused control row's classes.
   */
  field(): ReturnType<typeof fieldLayout> {
    return fieldLayout(this.cm())
  }

  /**
   * The textarea id (`id`, `name`, or a stable generated id; the DOM
   * normalizer renumbers generated ids in order of appearance, like React's
   * `useId`).
   * @returns The id value.
   */
  textareaId(): string {
    return this.id || this.fieldContext()?.id || this.name || this.generatedId
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
   * Serializes the inline style for the textarea. The autoResize row bounds
   * override the ClassMap minimum and use the textarea's own line height.
   * @returns The style attribute text.
   */
  hostStyle(): string | null {
    return styleText(
      this.autoResize
        ? {
            resize: 'none',
            ...this.style,
            minHeight: `${Math.min(this.minRows ?? 3, this.maxRows ?? Infinity)}lh`,
            ...(this.maxRows === undefined ? {} : { maxHeight: `${this.maxRows}lh` }),
          }
        : this.style,
    )
  }

  /**
   * The `data-mol-id` value (`automationId` wins over a rest `data-mol-id`).
   * @returns The attribute value.
   */
  molId(): string | undefined {
    return this.automationId ?? this.dataMolId ?? this.externalMolId
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
   * Sizes the box to its content. The inline CSS bounds clamp the result.
   */
  resize(): void {
    const element = this.textareaEl?.nativeElement
    if (!this.autoResize || !element) return
    element.style.height = 'auto'
    element.style.height = `${element.scrollHeight}px`
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
    adoptHostDataMolId(
      this.host.nativeElement,
      this.textareaEl?.nativeElement,
      (id) => {
        this.externalMolId = id
      },
      () => this.molId(),
    )
    moveRestAttributes(this.host.nativeElement, this.textareaEl?.nativeElement)
    this.applyValue(true)
    this.resize()
  }

  /**
   * Re-applies a controlled value and recomputes the autoResize height after
   * every check (React re-runs the value effect whenever `value` changes;
   * running here covers that and any other input change in one place), and
   * moves a caller's re-bound rest attribute (an accessible label following a
   * locale switch) back onto the textarea.
   */
  ngAfterViewChecked(): void {
    // Registering this view against the locale: a switch marks it for check,
    // so this hook runs and the reapply below moves the caller's re-bound
    // rest attribute onto the textarea. Without the read, zoneless change
    // detection never re-checks this view — the parent's re-bound
    // `[attr.aria-label]` would land on the host and stay there.
    void this.i18n.locale()
    adoptHostDataMolId(
      this.host.nativeElement,
      this.textareaEl?.nativeElement,
      (id) => {
        this.externalMolId = id
      },
      () => this.molId(),
    )
    reapplyRestAttributes(this.host.nativeElement, this.textareaEl?.nativeElement)
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
