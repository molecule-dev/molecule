/**
 * Input component (React parity).
 *
 * @module
 */

import { NgTemplateOutlet } from '@angular/common'
import {
  type AfterViewChecked,
  Component,
  ElementRef,
  EventEmitter,
  inject,
  Output,
  signal,
  TemplateRef,
  ViewChild,
} from '@angular/core'

import {
  MolPlacement,
  setElementPresent,
  type SlotReader,
  usePlacement,
  useTranslation,
} from '@molecule/app-angular'
import type { FocusEventHandler, KeyboardEventHandler, Size, UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import type { HasElement } from '../utilities/element.js'
import type { FormFieldContext } from '../utilities/form-field-context.js'
import { fieldContext } from '../utilities/form-field-context.js'
import { nextInstanceId } from '../utilities/ids.js'
import { MolIconSvg, type ResolvedIcon, resolveIcon } from '../utilities/render-icon.js'
import {
  adoptHostDataMolId,
  moveRestAttributes,
  reapplyRestAttributes,
} from '../utilities/rest-attrs.js'
import { styleText } from '../utilities/style.js'

/**
 * Input component.
 *
 * The host is the `div.inputWrapper` React renders. React's text-input
 * `onChange` fires on `input` events; a controlled `value` is restored after
 * user input exactly like React's controlled-input state restore.
 *
 * The adornment wrappers React renders conditionally
 * (`{!!leftElement && <div …>}` / `{(rightElement || (clearable && value)) && …}`)
 * are always-mounted `<ng-content>` capture points that are taken out of the
 * DOM whenever React would render nothing (`setElementPresent`).
 */
@Component({
  selector: 'div[mol-input]',
  standalone: true,
  hostDirectives: [MolPlacement],
  imports: [MolIconSvg, NgTemplateOutlet],
  inputs: [
    'type',
    'size',
    'align',
    'label',
    'error',
    'hint',
    'leftElement',
    'rightElement',
    'clearable',
    'clearLabel',
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
    'automationId',
    'dataMolId: data-mol-id',
    'onFocus',
    'onBlur',
    'onKeyDown',
  ],
  host: {
    '[class]': 'cm().inputWrapper',
  },
  template: `@if (label) {
      <label
        [attr.for]="inputId()"
        [class]="cm().cn(cm().label({ required: !!required }), cm().labelBlock)"
        >{{ label }}</label
      >
    }
    <div [class]="cm().inputInner">
      <div [class]="cm().inputLeftElement" #leftSlot>
        <ng-content select="[slot=leftElement]"></ng-content>
        @if (asTemplate(leftElement); as tpl) {
          <ng-container [ngTemplateOutlet]="tpl" />
        } @else {
          {{ asText(leftElement) }}
        }
      </div>
      <input
        [attr.type]="type ?? 'text'"
        [attr.id]="inputId()"
        [attr.name]="name"
        [attr.value]="value ?? defaultValue"
        [attr.placeholder]="placeholder"
        [disabled]="disabled"
        [attr.required]="required ? '' : null"
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
        #inputEl
      />
      <div [class]="cm().inputRightElement" #rightSlot>
        @if (clearable && value) {
          <button
            type="button"
            (click)="clear.emit($event)"
            [class]="cm().inputClearButton"
            [attr.aria-label]="clearText()"
          >
            <svg mol-icon [data]="clearIcon()" />
          </button>
        }
        <span [class]="cm().textMuted" #rightInner
          ><ng-content select="[slot=rightElement]"></ng-content>
          @if (asTemplate(rightElement); as tpl) {
            <ng-container [ngTemplateOutlet]="tpl" />
          } @else {
            {{ asText(rightElement) }}
          }
        </span>
      </div>
    </div>
    @if (error) {
      <p [attr.id]="inputId() + '-error'" [class]="cm().formError">{{ error }}</p>
    }
    @if (hint && !error) {
      <p [attr.id]="inputId() + '-hint'" [class]="cm().formHint">{{ hint }}</p>
    }`,
})
export class Input implements AfterViewChecked, HasElement<HTMLInputElement> {
  /** Input type. */
  type?: string
  /** Input size. */
  size?: Size
  /** Text alignment. */
  align?: 'left' | 'center' | 'right'
  /** Field label. */
  label?: string
  /** Error message (associates via aria-describedby). */
  error?: string
  /** Hint text (shown without an error). */
  hint?: string
  /** Left adornment (a TemplateRef input, or projected `[slot=leftElement]`). */
  leftElement?: unknown
  /** Right adornment (a TemplateRef input, or projected `[slot=rightElement]`). */
  rightElement?: unknown
  /** Whether the clear button may render while a value exists. */
  clearable?: boolean
  /** Accessible label of the clear button. */
  clearLabel?: string
  /** Extra classes joined onto the input classes. */
  className?: string
  /** Inline style object (React camelCase). */
  style?: Record<string, unknown>
  /** `data-testid` for the input. */
  testId?: string
  /** Disables the input. */
  disabled?: boolean
  /** Marks the input required (label styling). */
  required?: boolean
  /** Controlled value. */
  value?: string | number
  /** Uncontrolled initial value. */
  defaultValue?: string | number
  /** Placeholder text. */
  placeholder?: string
  /** Form field name. */
  name?: string
  /** Explicit input id. */
  id?: string
  /** `data-mol-id` automation id (React's `automationId`). */
  automationId?: string
  /** A `data-mol-id` given as a plain rest attribute (React's `rootProps` precedence). */
  dataMolId?: string

  /** React's `onFocus`, which React spreads onto the <input>: its `currentTarget` is that element. */
  onFocus?: FocusEventHandler
  /** React's `onBlur`, which React spreads onto the <input>: its `currentTarget` is that element. */
  onBlur?: FocusEventHandler
  /** React's `onKeyDown`, which React spreads onto the <input>: its `currentTarget` is that element. */
  onKeyDown?: KeyboardEventHandler

  /** Fires the raw `input` event (React's text-input onChange). */
  @Output() readonly change = new EventEmitter<Event>()
  /** Fires the clear button's click event. */
  @Output() readonly clear = new EventEmitter<Event>()

  /** The native input (React's `...rest` spread target). */
  inputEl?: ElementRef<HTMLInputElement>
  /** The native input view query; also feeds the caller's ref element. */
  @ViewChild('inputEl')
  set inputElQuery(ref: ElementRef<HTMLInputElement> | undefined) {
    this.inputEl = ref
    this.inner.set(ref?.nativeElement ?? null)
  }

  private readonly inner = signal<HTMLInputElement | null>(null)
  /** The element a caller's ref receives: the native `<input>`, not the label wrapper. */
  readonly element = this.inner.asReadonly()
  /** The left adornment wrapper. */
  @ViewChild('leftSlot') leftSlot?: ElementRef<HTMLDivElement>
  /** The right adornment wrapper. */
  @ViewChild('rightSlot') rightSlot?: ElementRef<HTMLDivElement>
  /** The right adornment inner span (React's ternary else branch). */
  @ViewChild('rightInner') rightInner?: ElementRef<HTMLSpanElement>

  private readonly host = inject(ElementRef)

  /** Whether an adornment wrapper renders on each side (signals the class list reads). */
  private readonly hasLeft = signal(false)
  private readonly hasRight = signal(false)

  /** Attaches or detaches each adornment wrapper exactly when React renders it. */
  constructor() {
    usePlacement((hasContent) => this.syncAdornments(hasContent))
  }

  /** The per-instance id used when the caller gives no `id` or `name` (React's `useId`). */
  private readonly generatedId = nextInstanceId()

  /**
   * Reactive translation, read in the injection context. Its `t` reads the
   * locale, so the view re-renders the text on a locale switch (the static `t`
   * does not).
   */
  private readonly i18n = useTranslation()

  private movedRest = false
  /** The `aria-describedby` the caller spread onto the host (React's rest). */
  private restDescribedBy: string | null = null
  /** The `data-mol-id` a caller bound on the host (React spreads it onto the input). */
  private externalMolId: string | undefined

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * The input id (`id`, `name`, or a stable generated id; the DOM normalizer
   * renumbers generated ids in order of appearance, like React's `useId`).
   * @returns The id value.
   */
  inputId(): string {
    return this.id || this.fieldContext()?.id || this.name || this.generatedId
  }

  /**
   * The aria-describedby target (error or hint paragraph).
   * @returns The id or null.
   */
  describedBy(): string | null {
    if (this.error) return `${this.inputId()}-error`
    if (this.hint) return `${this.inputId()}-hint`
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
   * Computes the input class list.
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(
      this.cm().input({
        error: !!this.error,
        size: this.size ?? 'md',
        align: this.align === 'right' ? undefined : this.align,
      }),
      this.hasLeft() && this.cm().inputPadLeft,
      (this.hasRight() || this.clearable) && this.cm().inputPadRight,
      this.className,
    )
  }

  /**
   * The clear button's accessible label.
   * @returns The label text.
   */
  clearText(): string {
    return this.clearLabel ?? this.i18n.t('ui.input.clear', undefined, { defaultValue: 'Clear' })
  }

  /**
   * The clear button's X glyph.
   * @returns The resolved icon.
   */
  clearIcon(): ResolvedIcon {
    return resolveIcon('x-mark', this.cm().iconSm)
  }

  /**
   * Serializes the inline style for the input.
   * @returns The style attribute text.
   */
  hostStyle(): string | null {
    return styleText(this.style)
  }

  /**
   * The `data-mol-id` value (`automationId` wins over a rest `data-mol-id`).
   * @returns The attribute value.
   */
  molId(): string | undefined {
    return this.automationId ?? this.dataMolId ?? this.externalMolId
  }

  /**
   * React's text-input onChange: the `input` event, with the controlled value
   * restored afterwards.
   *
   * @param event - The native input event.
   */
  handleInput(event: Event): void {
    event.stopPropagation()
    this.change.emit(event)
    const input = this.inputEl?.nativeElement
    if (this.value !== undefined && input && input.value !== String(this.value))
      input.value = String(this.value)
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
   * Puts a `data-mol-id` bound on the host onto the input in the pass that bound it (the host
   * attribute is written after this component's `ngDoCheck`).
   */
  ngAfterViewChecked(): void {
    adoptHostDataMolId(
      this.host.nativeElement,
      this.inputEl?.nativeElement ?? this.host.nativeElement.querySelector('input'),
      (id) => {
        this.externalMolId = id
      },
      () => this.molId(),
    )
  }

  /**
   * Attaches or detaches each adornment wrapper exactly when React renders
   * it. The input's class list reads the presence signals, so the padding
   * classes follow.
   *
   * @param hasContent - Reads whether a slot has content.
   */
  private syncAdornments(hasContent: SlotReader): void {
    // The placement function runs after the view exists (MolPlacement's
    // after-view-init), so the view queries are set here.
    const left = this.leftSlot?.nativeElement
    const right = this.rightSlot?.nativeElement
    const inner =
      this.rightInner?.nativeElement ??
      (right ? (right.querySelector('span') as HTMLElement | null) : null) ??
      undefined
    const hasLeft = this.isGiven(this.leftElement) || hasContent(left)
    const hasRight = this.isGiven(this.rightElement) || hasContent(inner)
    this.hasLeft.set(hasLeft)
    this.hasRight.set(hasRight)
    const clear = !!(this.clearable && this.value)
    setElementPresent(left, hasLeft)
    setElementPresent(inner, hasRight && !clear)
    setElementPresent(right, hasRight || clear)
  }

  /**
   * Moves the caller's rest attributes onto the input and keeps its controlled
   * value in step with the `value` input.
   */
  ngDoCheck(): void {
    // Registering this view against the locale: a switch marks it for check,
    // so this hook runs and the reapply below moves the caller's re-bound
    // rest attribute onto the input. Without the read, zoneless change
    // detection never re-checks this view — the parent's re-bound
    // `[attr.aria-label]` would land on the host and stay there.
    void this.i18n.locale()
    const host = this.host.nativeElement as HTMLElement
    const input = this.inputEl?.nativeElement ?? host.querySelector('input')
    if (!this.movedRest && input) {
      this.restDescribedBy = host.getAttribute('aria-describedby')
      this.movedRest = true
      adoptHostDataMolId(
        host,
        input,
        (id) => {
          this.externalMolId = id
        },
        () => this.molId(),
      )
      moveRestAttributes(host, input)
    }
    // A caller's re-bound rest attribute (`[attr.aria-label]` following a
    // locale switch) lands back on the host; move it onto the input again.
    adoptHostDataMolId(
      host,
      input,
      (id) => {
        this.externalMolId = id
      },
      () => this.molId(),
    )
    reapplyRestAttributes(host, input)
    // React's controlled input: the live value always follows the `value` prop
    // after a re-render (the binding sets the attribute; the property is only
    // moved by the browser on an uncontrolled edit).
    if (this.value !== undefined && input && input.value !== String(this.value))
      input.value = String(this.value)
  }

  /**
   * Casts a node-valued input to its TemplateRef form (the adapter projects
   * node props as templates).
   *
   * @param value - The prop value.
   * @returns The TemplateRef, or null.
   */
  asTemplate(value: unknown): TemplateRef<unknown> | null {
    return value instanceof TemplateRef ? value : null
  }

  /**
   * Renders a plain-string node value (React renders strings as text).
   *
   * @param value - The prop value.
   * @returns The text, or empty.
   */
  asText(value: unknown): string {
    return typeof value === 'string' ? value : ''
  }

  /**
   * Whether a node prop was passed (a TemplateRef or any non-null value).
   *
   * @param value - The prop value.
   * @returns True when given.
   */
  private isGiven(value: unknown): boolean {
    return value !== undefined && value !== null
  }
}
