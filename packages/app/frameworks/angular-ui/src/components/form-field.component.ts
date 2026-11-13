/**
 * FormField component (React parity): label + field + error/hint wrapper.
 *
 * @module
 */

import {
  type AfterViewInit,
  Component,
  ElementRef,
  inject,
  type OnDestroy,
  Renderer2,
  signal,
  ViewChild,
} from '@angular/core'

import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { provideDomContext, removeDomContext } from '../utilities/dom-context.js'
import type { FormFieldContext } from '../utilities/form-field-context.js'
import { nextInstanceId } from '../utilities/ids.js'
import { styleText } from '../utilities/style.js'
import { SlotWrapper } from './button.component.js'

/** The native controls a single field child may render. */
const FIELD_SELECTOR = 'input, select, textarea'

/**
 * FormField component.
 *
 * The host is the root `<div>` (`div[mol-form-field]`). React clones a single
 * child element, adding `id`, `aria-describedby` and `aria-invalid` to its
 * props; Angular cannot clone a projected component, so those values are
 * registered on the host as a {@link FormFieldContext} that the field
 * components (`Input`, `Select`, `Textarea`, `Checkbox`) read.
 */
@Component({
  selector: 'div[mol-form-field]',
  standalone: true,
  inputs: ['label', 'name', 'error', 'hint', 'required', 'className', 'style', 'testId'],
  host: {
    '[class]': 'classes()',
    '[style]': 'hostStyle()',
    '[attr.data-testid]': 'testId',
  },
  template: `@if (label) {
      <label
        [attr.for]="labelFor() || fieldId()"
        [class]="cm().cn(cm().label({ required: !!required }), cm().labelBlock)"
        >{{ label }}</label
      >
    }
    <span #capture data-mol-field-capture><ng-content></ng-content></span>
    @if (error) {
      <p [attr.id]="errorId" [class]="cm().formError">{{ error }}</p>
    }
    @if (hint && !error) {
      <p [attr.id]="hintId" [class]="cm().formHint">{{ hint }}</p>
    }`,
})
export class FormField implements AfterViewInit, OnDestroy {
  /** Field label. */
  label?: string
  /** Field name (drives the ids). */
  name?: string
  /** Error message (renders and associates via aria-describedby). */
  error?: string
  /** Hint text (shown without an error). */
  hint?: string
  /** Marks the field required (label styling). */
  required?: boolean
  /** Extra classes for the wrapper. */
  className?: string
  /** Inline style object (React camelCase). */
  style?: Record<string, unknown>
  /** `data-testid`. */
  testId?: string

  /** The projected-children capture point. */
  @ViewChild('capture') capture?: ElementRef<HTMLSpanElement>

  /** The label's `for` target (the single child's control id, read after view init). */
  readonly labelFor = signal('')

  /** A generated id used when `name` is absent (the normalizer renumbers it). */
  private readonly generatedId = nextInstanceId()
  private readonly host: ElementRef<HTMLElement> = inject(ElementRef)
  private readonly renderer = inject(Renderer2)
  private readonly sync = new SlotWrapper(this.host, this.renderer)
  /** Cached single-child determination (the capture empties at view init). */
  private singleCache: boolean | null = null

  /** Registers the field context before any projected child resolves it. */
  constructor() {
    provideDomContext(this.host.nativeElement, new FormFieldContextValue(this))
  }

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * The field id (`name`, or a generated id).
   * @returns The id.
   */
  fieldId(): string {
    return this.name || this.generatedId
  }

  /**
   * The error paragraph's id.
   * @returns The id.
   */
  get errorId(): string {
    return `${this.fieldId()}-error`
  }

  /**
   * The hint paragraph's id.
   * @returns The id.
   */
  get hintId(): string {
    return `${this.fieldId()}-hint`
  }

  /**
   * The id the field should describe itself with (error wins over hint).
   * @returns The id, or undefined.
   */
  describedByTarget(): string | undefined {
    if (this.error) return this.errorId
    if (this.hint) return this.hintId
    return undefined
  }

  /**
   * The wrapper class list.
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(this.cm().inputWrapper, this.cm().sp('mb', 4), this.className)
  }

  /**
   * Serializes the wrapper's inline style.
   * @returns The style attribute text.
   */
  hostStyle(): string | null {
    return styleText(this.style)
  }

  /**
   * The capture span (a view query before view init, a DOM lookup after —
   * the span lives directly under the host and is removed at view init).
   * @returns The capture element, or null.
   */
  private captureEl(): HTMLElement | null {
    return (
      this.capture?.nativeElement ??
      this.host.nativeElement.querySelector<HTMLElement>('[data-mol-field-capture]')
    )
  }

  /**
   * Whether the projected content is exactly one element (React clones only a
   * single child). Cached: the children leave the capture span at view init.
   * @returns True for a single element child.
   */
  singleChild(): boolean {
    if (this.singleCache !== null) return this.singleCache
    const capture = this.captureEl()
    if (!capture) return false
    const children = Array.from(capture.childNodes)
    const elements = children.filter((node) => node.nodeType === 1)
    const hasText = children.some((node) => node.nodeType === 3 && (node.textContent ?? '').trim())
    this.singleCache = elements.length === 1 && !hasText
    return this.singleCache
  }

  /**
   * Adopts the projected children bare into the host (React renders them
   * directly), resolves the label target from the single child's control and
   * patches a plain native control child (React's cloneElement props).
   */
  ngAfterViewInit(): void {
    const capture = this.captureEl()
    if (!capture) return
    const host = this.host.nativeElement
    const children = Array.from(capture.childNodes)
    const elements = children.filter((node) => node.nodeType === 1)
    const single = this.singleChild()
    for (const node of children) host.insertBefore(node, capture)
    if (single) {
      const child = elements[0] as HTMLElement
      const control = child.matches(FIELD_SELECTOR)
        ? child
        : child.querySelector<HTMLElement>(FIELD_SELECTOR)
      if (child.matches(FIELD_SELECTOR)) this.patchNativeControl(child)
      this.labelFor.set(control?.id || this.fieldId())
    } else {
      this.labelFor.set(this.fieldId())
    }
    this.sync.sync(capture, false, host)
  }

  /**
   * Applies React's cloned props to a plain native form control child.
   * @param control - The native control element.
   */
  private patchNativeControl(control: HTMLElement): void {
    control.setAttribute('id', this.fieldId())
    const describedBy = this.describedByTarget()
    if (describedBy) {
      const existing = control.getAttribute('aria-describedby')
      control.setAttribute('aria-describedby', [existing, describedBy].filter(Boolean).join(' '))
    }
    if (this.error) control.setAttribute('aria-invalid', 'true')
  }

  /** Removes the context registration (unmount). */
  ngOnDestroy(): void {
    removeDomContext(this.host.nativeElement)
  }
}

/** The field context a `FormField` registers (React's cloned child props). */
class FormFieldContextValue implements FormFieldContext {
  /**
   * Creates the context for a field.
   *
   * @param field - The owning form field.
   */
  constructor(private readonly field: FormField) {}

  /** The field id (only for a single cloned child). */
  get id(): string | undefined {
    return this.field.singleChild() ? this.field.fieldId() : undefined
  }

  /** The error/hint target (only for a single cloned child). */
  get describedBy(): string | undefined {
    return this.field.singleChild() ? this.field.describedByTarget() : undefined
  }

  /** Whether the field is invalid (only for a single cloned child). */
  get invalid(): boolean | undefined {
    return this.field.singleChild() ? !!this.field.error : undefined
  }
}
