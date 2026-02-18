/**
 * Angular Select UI component with UIClassMap-driven styling.
 *
 * @module
 */

import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core'

import type { SelectOption, Size, UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

/**
 * Angular Select UI component with UIClassMap-driven styling.
 */
@Component({
  selector: 'mol-select',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div [class]="cm.inputWrapper">
      @if (label) {
        <label [attr.for]="selectId" [class]="labelClasses">
          {{ label }}
        </label>
      }
      <div [class]="cm.inputInner">
        <select
          [id]="selectId"
          [name]="name"
          [value]="value"
          [disabled]="disabled"
          [required]="required"
          [attr.aria-invalid]="!!error"
          [attr.aria-describedby]="ariaDescribedBy"
          [class]="selectClasses"
          [attr.data-testid]="testId"
          (change)="onSelectChange($event)"
        >
          @if (placeholder) {
            <option value="" disabled>{{ placeholder }}</option>
          }
          @if (clearable) {
            <option value="">--</option>
          }
          @for (option of options; track option.value) {
            <option [value]="option.value" [disabled]="option.disabled">
              {{ option.label }}
            </option>
          }
        </select>
      </div>
      @if (error) {
        <p [id]="selectId + '-error'" [class]="formErrorClass">
          {{ error }}
        </p>
      }
      @if (hint && !error) {
        <p [id]="selectId + '-hint'" [class]="formHintClass">
          {{ hint }}
        </p>
      }
    </div>
  `,
})
/**
 * Molecule Select class.
 */
export class MoleculeSelect {
  @Input() options: SelectOption<string>[] = []
  @Input() value?: string
  @Input() size: Size = 'md'
  @Input() label?: string
  @Input() placeholder?: string
  @Input() error?: string
  @Input() hint?: string
  @Input() clearable = false
  @Input() className?: string
  @Input() testId?: string
  @Input() disabled = false
  @Input() required = false
  @Input() name?: string
  @Input() id?: string

  @Output() valueChange = new EventEmitter<string>()
  @Output() handleChange = new EventEmitter<Event>()

  /**
   * Retrieves the current UI class map.
   * @returns The UIClassMap instance for styling.
   */
  get cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * Retrieves the CSS class for form error messages.
   * @returns The form error class name string.
   */
  get formErrorClass(): string {
    return this.cm.formError
  }

  /**
   * Retrieves the CSS class for form hint messages.
   * @returns The form hint class name string.
   */
  get formHintClass(): string {
    return this.cm.formHint
  }

  /**
   * Resolves the select element ID.
   * @returns The resolved ID from the id or name input.
   */
  get selectId(): string {
    return this.id || this.name || ''
  }

  /**
   * Computes the aria-describedby attribute value.
   * @returns The ID of the describing element, or null if none.
   */
  get ariaDescribedBy(): string | null {
    if (this.error) return `${this.selectId}-error`
    if (this.hint) return `${this.selectId}-hint`
    return null
  }

  /**
   * Computes the CSS classes for the select label.
   * @returns The label class name string.
   */
  get labelClasses(): string {
    return this.cm.cn(this.cm.label({ required: this.required }), this.cm.labelBlock)
  }

  /**
   * Computes the combined CSS classes for the select element.
   * @returns The select class name string.
   */
  get selectClasses(): string {
    return this.cm.cn(
      this.cm.select({ error: !!this.error, size: this.size }),
      this.cm.selectNative,
      this.className,
    )
  }

  /**
   * Handles select value change events.
   * @param event - The change event from the select element.
   */
  onSelectChange(event: Event): void {
    const target = event.target as HTMLSelectElement
    this.handleChange.emit(event)
    this.valueChange.emit(target.value)
  }
}
