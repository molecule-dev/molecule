/**
 * FloatingInput component (React parity).
 *
 * @module
 */

import {
  type AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  inject,
  type OnInit,
  Output,
  signal,
  ViewChild,
} from '@angular/core'

import type { FocusEventHandler, KeyboardEventHandler, UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import type { HasElement } from '../utilities/element.js'
import { nextInstanceId } from '../utilities/ids.js'
import { moveRestAttributes } from '../utilities/rest-attrs.js'

/**
 * FloatingInput component.
 *
 * The host is the `span.floatingInputWrapper` React renders; the input and
 * its floating label sit adjacent with no whitespace (both are inline
 * elements, so a space would draw). Works controlled (`value`) and
 * uncontrolled (internal state seeded from `defaultValue`).
 */
@Component({
  selector: 'span[mol-floating-input]',
  standalone: true,
  inputs: [
    'placeholder',
    'className',
    'value',
    'defaultValue',
    'id',
    'onFocus',
    'onBlur',
    'onKeyDown',
  ],
  host: {
    '[class]': 'cm().floatingInputWrapper',
  },
  template: `<input
      [attr.id]="inputId()"
      [attr.placeholder]="placeholder"
      [class]="classes()"
      [attr.value]="currentValue()"
      (input)="handleInput($event)"
      (change)="stopPropagation($event)"
      (focusin)="onFocus?.($event)"
      (focusout)="onBlur?.($event)"
      (keydown)="onKeyDown?.($event)"
      #inputEl
    />
    @if (placeholder) {
      <label [attr.for]="inputId()" [class]="cm().floatingLabel">{{ placeholder }}</label>
    }`,
})
export class FloatingInput implements OnInit, AfterViewInit, HasElement<HTMLInputElement> {
  /** Placeholder text, also rendered as the floating label. */
  placeholder?: string
  /** Extra classes joined onto the input classes. */
  className?: string
  /** Controlled value. */
  value?: string
  /** Uncontrolled initial value (seeds the internal state). */
  defaultValue?: string
  /** Explicit input id. */
  id?: string

  /** React's `onFocus`, which React spreads onto the <input>: its `currentTarget` is that element. */
  onFocus?: FocusEventHandler
  /** React's `onBlur`, which React spreads onto the <input>: its `currentTarget` is that element. */
  onBlur?: FocusEventHandler
  /** React's `onKeyDown`, which React spreads onto the <input>: its `currentTarget` is that element. */
  onKeyDown?: KeyboardEventHandler

  /** Fires the raw `input` event (React's text-input onChange). */
  @Output() readonly change = new EventEmitter<Event>()

  /** The native input (React's `...rest` spread target). */
  private inputEl?: ElementRef<HTMLInputElement>
  /** The native input view query; also feeds the caller's ref element. */
  @ViewChild('inputEl')
  set inputElQuery(ref: ElementRef<HTMLInputElement> | undefined) {
    this.inputEl = ref
    this.inner.set(ref?.nativeElement ?? null)
  }

  private readonly inner = signal<HTMLInputElement | null>(null)
  /** The element a caller's ref receives: the native `<input>`. */
  readonly element = this.inner.asReadonly()

  private readonly host = inject(ElementRef)
  /** The per-instance id used when the caller gives none (React's `useId`). */
  private readonly generatedId = nextInstanceId()
  private internalValue = ''

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * The input id (`id` or a stable generated id; the DOM normalizer renumbers
   * generated ids in order of appearance, like React's `useId`).
   * @returns The id value.
   */
  inputId(): string {
    return this.id || this.generatedId
  }

  /**
   * Computes the input class list.
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(this.cm().input(), this.cm().floatingInput, this.className)
  }

  /**
   * The rendered value: the controlled `value`, else the internal state
   * (seeded from `defaultValue`, updated by typing when uncontrolled).
   * @returns The value string.
   */
  currentValue(): string {
    return this.value !== undefined ? String(this.value) : this.internalValue
  }

  /**
   * React's onChange: the raw `input` event, with the internal state updated
   * when uncontrolled and the controlled value restored afterwards. The
   * native change event never reaches the host (its `change` output binding
   * would record it a second time).
   *
   * @param event - The native input event.
   */
  handleInput(event: Event): void {
    event.stopPropagation()
    const input = event.target as HTMLInputElement
    if (this.value === undefined) this.internalValue = input.value
    this.change.emit(event)
    if (this.value !== undefined && input.value !== String(this.value))
      input.value = String(this.value)
  }

  /**
   * Swallows the native change event (React's onChange already fired on the
   * input event).
   *
   * @param event - The native change event.
   */
  stopPropagation(event: Event): void {
    event.stopPropagation()
  }

  /**
   * Seeds the internal state (inputs are set by now, and the template's
   * value binding evaluates only after this hook).
   */
  ngOnInit(): void {
    this.internalValue = String(this.defaultValue ?? '')
  }

  /**
   * Moves rest attributes (`type`, `name`, `disabled`, `readOnly`,
   * `maxLength`, aria/data) onto the input, where React's `{...props}`
   * spread puts them.
   */
  ngAfterViewInit(): void {
    moveRestAttributes(this.host.nativeElement, this.inputEl?.nativeElement)
  }
}
