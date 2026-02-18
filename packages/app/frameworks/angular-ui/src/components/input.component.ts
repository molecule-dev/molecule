/**
 * Angular Input UI component with UIClassMap-driven styling.
 *
 * @module
 */

import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core'

import { t } from '@molecule/app-i18n'
import type { InputType, Size, UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { getIconSvg } from '../utilities/render-icon.js'

/**
 * Angular Input UI component with UIClassMap-driven styling.
 */
@Component({
  selector: 'mol-input',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div [class]="cm.inputWrapper">
      @if (label) {
        <label [attr.for]="inputId" [class]="labelClasses">
          {{ label }}
        </label>
      }
      <div [class]="cm.inputInner">
        <input
          [type]="type"
          [id]="inputId"
          [name]="name"
          [value]="value"
          [placeholder]="placeholder"
          [disabled]="disabled"
          [required]="required"
          [readOnly]="readOnly"
          [attr.aria-invalid]="!!error"
          [attr.aria-describedby]="ariaDescribedBy"
          [class]="inputClasses"
          [style]="style"
          [attr.data-testid]="testId"
          [attr.maxlength]="maxLength"
          [attr.minlength]="minLength"
          [attr.pattern]="pattern"
          [attr.autocomplete]="autoComplete"
          (input)="handleInput.emit($event)"
          (change)="handleChange.emit($event)"
          (focus)="handleFocus.emit($event)"
          (blur)="handleBlur.emit($event)"
        />
        @if (clearable && value) {
          <div [class]="cm.inputClearButton">
            <button
              type="button"
              (click)="handleClear.emit()"
              [class]="cm.inputClearButton"
              [attr.aria-label]="clearAriaLabel"
            >
              <span [innerHTML]="clearIconSvg"></span>
            </button>
          </div>
        }
      </div>
      @if (error) {
        <p [id]="inputId + '-error'" [class]="formErrorClass">
          {{ error }}
        </p>
      }
      @if (hint && !error) {
        <p [id]="inputId + '-hint'" [class]="formHintClass">
          {{ hint }}
        </p>
      }
    </div>
  `,
})
/**
 * Molecule Input class.
 */
export class MoleculeInput {
  @Input() type: InputType = 'text'
  @Input() size: Size = 'md'
  @Input() label?: string
  @Input() error?: string
  @Input() hint?: string
  @Input() clearable = false
  @Input() clearLabel?: string
  @Input() className?: string
  @Input() style?: Record<string, string>
  @Input() testId?: string
  @Input() disabled = false
  @Input() required = false
  @Input() readOnly = false
  @Input() value?: string | number
  @Input() placeholder?: string
  @Input() name?: string
  @Input() id?: string
  @Input() maxLength?: number
  @Input() minLength?: number
  @Input() pattern?: string
  @Input() autoComplete?: string

  @Output() handleInput = new EventEmitter<Event>()
  @Output() handleChange = new EventEmitter<Event>()
  @Output() handleFocus = new EventEmitter<FocusEvent>()
  @Output() handleBlur = new EventEmitter<FocusEvent>()
  @Output() handleClear = new EventEmitter<void>()

  /**
   * Retrieves the current UI class map.
   * @returns The UIClassMap instance for styling.
   */
  get cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * Computes the accessible clear button label.
   * @returns The localized aria-label for the clear button.
   */
  get clearAriaLabel(): string {
    return this.clearLabel || t('ui.input.clear', undefined, { defaultValue: 'Clear' })
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
   * Resolves the input element ID.
   * @returns The resolved ID from the id or name input.
   */
  get inputId(): string {
    return this.id || this.name || ''
  }

  /**
   * Computes the aria-describedby attribute value.
   * @returns The ID of the describing element, or null if none.
   */
  get ariaDescribedBy(): string | null {
    if (this.error) return `${this.inputId}-error`
    if (this.hint) return `${this.inputId}-hint`
    return null
  }

  /**
   * Computes the CSS classes for the input label.
   * @returns The label class name string.
   */
  get labelClasses(): string {
    return this.cm.cn(this.cm.label({ required: this.required }), this.cm.labelBlock)
  }

  /**
   * Computes the combined CSS classes for the input element.
   * @returns The input class name string.
   */
  get inputClasses(): string {
    return this.cm.cn(
      this.cm.input({ error: !!this.error, size: this.size }),
      this.clearable && this.cm.inputPadRight,
      this.className,
    )
  }

  /**
   * Generates the SVG markup for the clear button icon.
   * @returns The SVG string for the clear icon.
   */
  get clearIconSvg(): string {
    return getIconSvg('x-mark', this.cm.iconSm)
  }
}
