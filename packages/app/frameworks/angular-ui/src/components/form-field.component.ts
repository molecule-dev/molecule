/**
 * FormField component (React parity): label + field + error/hint wrapper.
 *
 * @module
 */

import { Component, ElementRef, inject, type OnDestroy, signal, ViewChild } from '@angular/core'

import {
  MolPlacement,
  placeContent,
  setElementPresent,
  type SlotReader,
  usePlacement,
} from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { type HasElement, hostElement } from '../utilities/element.js'
import { type FormFieldContext, FormFieldDomContext } from '../utilities/form-field-context.js'
import { nextInstanceId } from '../utilities/ids.js'
import { styleText } from '../utilities/style.js'

/** The native controls a single field child may render. */
const FIELD_SELECTOR = 'input, select, textarea'

/** The attributes React's cloneElement sets on a single native control child. */
const PATCHED_ATTRIBUTES = ['id', 'aria-describedby', 'aria-invalid'] as const

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
  hostDirectives: [MolPlacement],
  inputs: [
    'label',
    'name',
    'error',
    'hint',
    'required',
    'className',
    'style',
    'testId',
    'automationId',
    'dataMolId: data-mol-id',
  ],
  host: {
    '[class]': 'classes()',
    '[style]': 'hostStyle()',
    '[attr.data-testid]': 'testId',
    '[attr.data-mol-id]': 'molId()',
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
export class FormField implements OnDestroy, HasElement<HTMLDivElement> {
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
  /** `data-mol-id` automation id (React's `automationId`). */
  automationId?: string
  /** A `data-mol-id` given as a plain rest attribute (React's `rootProps` precedence). */
  dataMolId?: string

  /** The projected-children capture point. */
  @ViewChild('capture') capture?: ElementRef<HTMLSpanElement>

  /** The label's `for` target (the single child's control id, read after view init). */
  readonly labelFor = signal('')

  /** A generated id used when `name` is absent (the normalizer renumbers it). */
  private readonly generatedId = nextInstanceId()
  private readonly host: ElementRef<HTMLDivElement> = inject(ElementRef)
  /** The element a caller's ref receives: the host `<div>`. */
  readonly element = hostElement(this.host)
  /**
   * Whether the children are one element (React clones only a single child), as
   * the last placement run read them; null before it. A signal, so a child that
   * reads the field context (Input's id) renders again when it changes.
   */
  private readonly singleState = signal<boolean | null>(null)
  /** The native control this field patched, with the attributes it had before. */
  private patched: {
    control: HTMLElement
    attributes: Record<(typeof PATCHED_ATTRIBUTES)[number], string | null>
  } | null = null
  /** The first projected node the last adoption saw: a different one is adopted again. */
  private adopted: Node | null = null
  /** Whether the adopted content was a single element child. */
  private single = false

  /** Registers the field context before any projected child resolves it. */
  constructor() {
    FormFieldDomContext.provide(this.host.nativeElement, new FormFieldContextValue(this))
    usePlacement((hasContent) => this.reconcile(hasContent))
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
   * The `data-mol-id` value (`automationId` wins over a rest `data-mol-id`).
   * @returns The attribute value.
   */
  molId(): string | undefined {
    return (
      this.automationId ??
      this.dataMolId ??
      this.host.nativeElement.getAttribute('data-mol-id') ??
      undefined
    )
  }

  /**
   * The capture span (a view query before the first render, a DOM lookup
   * after — the span lives directly under the host and is detached once its
   * content is adopted).
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
   * single child). Set by each placement run, which reads the children where
   * they render; before the first run they are still inside the capture span.
   * @returns True for a single element child.
   */
  singleChild(): boolean {
    const single = this.singleState()
    if (single !== null) return single
    const capture = this.captureEl()
    if (!capture) return false
    const children = Array.from(capture.childNodes)
    const elements = children.filter((node) => node.nodeType === 1)
    const hasText = children.some((node) => node.nodeType === 3 && (node.textContent ?? '').trim())
    return elements.length === 1 && !hasText
  }

  /**
   * Adopts the projected children bare into the host (React renders them
   * directly), resolves the label target from the single child's control and
   * patches a plain native control child (React's cloneElement props).
   *
   * @param hasContent - Reads whether the slot has content.
   */
  private reconcile(hasContent: SlotReader): void {
    const capture = this.captureEl()
    if (!capture) return
    const children = hasContent.nodes(capture)
    if (children.length === 0) {
      this.adopted = null
      this.single = false
      this.singleState.set(null)
      this.unpatchNativeControl()
      this.labelFor.set(this.fieldId())
      setElementPresent(capture, false)
      return
    }
    const first = children[0]!
    // Angular inserts a list's nodes one at a time, and this runs after each:
    // a second child arriving after the first makes the field "not single" again.
    const single = children.length === 1 && first.nodeType === 1
    if (this.adopted === first && this.single === single) {
      // The adopted control's own id may bind after the first run; keep the
      // label pointed at it as it settles (React adopts the child's id).
      const control = this.single
        ? this.host.nativeElement.querySelector<HTMLElement>(FIELD_SELECTOR)
        : null
      this.labelFor.set(control?.id || this.fieldId())
      setElementPresent(capture, false)
      return
    }
    const host = this.host.nativeElement
    this.singleState.set(single)
    this.single = single
    placeContent(capture, host, capture)
    // React renders a child it no longer clones with its own props.
    this.unpatchNativeControl()
    if (single) {
      const child = first as HTMLElement
      const control = child.matches(FIELD_SELECTOR)
        ? child
        : child.querySelector<HTMLElement>(FIELD_SELECTOR)
      if (child.matches(FIELD_SELECTOR)) this.patchNativeControl(child)
      this.labelFor.set(control?.id || this.fieldId())
    } else {
      this.labelFor.set(this.fieldId())
    }
    setElementPresent(capture, false)
    this.adopted = first
  }

  /**
   * Applies React's cloned props to a plain native form control child.
   * @param control - The native control element.
   */
  private patchNativeControl(control: HTMLElement): void {
    this.patched = {
      control,
      attributes: Object.fromEntries(
        PATCHED_ATTRIBUTES.map((name) => [name, control.getAttribute(name)]),
      ) as Record<(typeof PATCHED_ATTRIBUTES)[number], string | null>,
    }
    control.setAttribute('id', this.fieldId())
    const describedBy = this.describedByTarget()
    if (describedBy) {
      const existing = control.getAttribute('aria-describedby')
      control.setAttribute('aria-describedby', [existing, describedBy].filter(Boolean).join(' '))
    }
    if (this.error) control.setAttribute('aria-invalid', 'true')
  }

  /** Puts back the attributes a patched control had before this field cloned it. */
  private unpatchNativeControl(): void {
    if (this.patched === null) return
    const { control, attributes } = this.patched
    this.patched = null
    for (const name of PATCHED_ATTRIBUTES) {
      const value = attributes[name]
      if (value === null) control.removeAttribute(name)
      else control.setAttribute(name, value)
    }
  }

  /** Removes the context registration (unmount). */
  ngOnDestroy(): void {
    FormFieldDomContext.remove(this.host.nativeElement)
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
