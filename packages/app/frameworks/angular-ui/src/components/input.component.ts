/**
 * Input component (React parity).
 *
 * @module
 */

import { NgTemplateOutlet } from '@angular/common'
import {
  Component,
  type DoCheck,
  ElementRef,
  EventEmitter,
  inject,
  Output,
  Renderer2,
  TemplateRef,
  ViewChild,
} from '@angular/core'

import { t } from '@molecule/app-i18n'
import type { Size, UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import type { FormFieldContext } from '../utilities/form-field-context.js'
import { fieldContext } from '../utilities/form-field-context.js'
import { MolIconSvg, type ResolvedIcon, resolveIcon } from '../utilities/render-icon.js'
import { moveRestAttributes } from '../utilities/rest-attrs.js'
import { styleText } from '../utilities/style.js'
import { hasNodes, SlotWrapper } from './button.component.js'

/**
 * Input component.
 *
 * The host is the `div.inputWrapper` React renders. React's text-input
 * `onChange` fires on `input` events; a controlled `value` is restored after
 * user input exactly like React's controlled-input state restore.
 *
 * The adornment wrappers React renders conditionally
 * (`{!!leftElement && <div …>}` / `{(rightElement || (clearable && value)) && …}`)
 * are always-mounted `<ng-content>` capture points that are detached from the
 * DOM whenever React would render nothing (see {@link SlotWrapper}).
 */
@Component({
  selector: 'div[mol-input]',
  standalone: true,
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
        (input)="handleInput($event)"
        (change)="handleChange($event)"
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
export class Input implements DoCheck {
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

  /** Fires the raw `input` event (React's text-input onChange). */
  @Output() readonly change = new EventEmitter<Event>()
  /** Fires the clear button's click event. */
  @Output() readonly clear = new EventEmitter<Event>()

  /** The native input (React's `...rest` spread target). */
  @ViewChild('inputEl') inputEl?: ElementRef<HTMLInputElement>
  /** The left adornment wrapper. */
  @ViewChild('leftSlot') leftSlot?: ElementRef<HTMLDivElement>
  /** The right adornment wrapper. */
  @ViewChild('rightSlot') rightSlot?: ElementRef<HTMLDivElement>
  /** The right adornment inner span (React's ternary else branch). */
  @ViewChild('rightInner') rightInner?: ElementRef<HTMLSpanElement>

  private readonly host = inject(ElementRef)
  private readonly sync = new SlotWrapper(inject(ElementRef), inject(Renderer2))
  private readonly parents = new Map<Node, HTMLElement>()

  private hasLeft = false
  private hasRight = false
  private movedRest = false
  /** The `aria-describedby` the caller spread onto the host (React's rest). */
  private restDescribedBy: string | null = null

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
    return this.id || this.fieldContext()?.id || this.name || 'r0'
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
      this.hasLeft && this.cm().inputPadLeft,
      (this.hasRight || this.clearable) && this.cm().inputPadRight,
      this.className,
    )
  }

  /**
   * The clear button's accessible label.
   * @returns The label text.
   */
  clearText(): string {
    return this.clearLabel ?? t('ui.input.clear', undefined, { defaultValue: 'Clear' })
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
   * Reconciles the adornment wrappers every check: detects projected slot
   * content (view queries resolve only at view init, so the very first pass —
   * which runs before the view's bindings — falls back to structural sibling
   * lookup), then attaches/detaches each wrapper exactly when React renders
   * it. The input's class list depends on this detection, and `ngDoCheck`
   * runs before the template bindings of the same pass, so the first render
   * already carries the right padding classes.
   */
  ngDoCheck(): void {
    const host = this.host.nativeElement as HTMLElement
    const input = this.inputEl?.nativeElement ?? host.querySelector('input')
    const left =
      this.leftSlot?.nativeElement ??
      (input?.previousElementSibling as HTMLElement | null) ??
      undefined
    const right =
      this.rightSlot?.nativeElement ??
      (input?.nextElementSibling as HTMLElement | null) ??
      undefined
    const inner =
      this.rightInner?.nativeElement ??
      (right ? (right.querySelector('span') as HTMLElement | null) : null) ??
      undefined
    this.hasLeft = this.isGiven(this.leftElement) || hasNodes(left)
    this.hasRight = this.isGiven(this.rightElement) || hasNodes(inner)
    const clear = !!(this.clearable && this.value)
    this.sync.sync(left, this.hasLeft, this.parentOf(left))
    this.sync.sync(inner, this.hasRight && !clear, this.parentOf(inner))
    this.sync.sync(right, this.hasRight || clear, this.parentOf(right))
    if (!this.movedRest && input) {
      this.restDescribedBy = host.getAttribute('aria-describedby')
      moveRestAttributes(host, input)
      this.movedRest = true
    }
    // React's controlled input: the live value always follows the `value` prop
    // after a re-render (the binding sets the attribute; the property is only
    // moved by the browser on an uncontrolled edit).
    if (this.value !== undefined && input && input.value !== String(this.value))
      input.value = String(this.value)
  }

  /**
   * Remembers where an element lives while connected, so a re-attach after a
   * detach lands in the original parent (never the component host).
   *
   * @param el - The wrapper element.
   * @returns The original parent, if known.
   */
  private parentOf(el: HTMLElement | undefined | null): HTMLElement | undefined {
    if (!el) return undefined
    const cached = this.parents.get(el)
    if (cached) return cached
    if (el.parentElement) {
      this.parents.set(el, el.parentElement)
      return el.parentElement
    }
    return undefined
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
