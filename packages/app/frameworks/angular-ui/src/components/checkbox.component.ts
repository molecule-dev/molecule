/**
 * Angular Checkbox UI component with UIClassMap-driven styling.
 *
 * @module
 */

import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core'

import type { Size, UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

/**
 * Angular Checkbox UI component with UIClassMap-driven styling.
 */
@Component({
  selector: 'mol-checkbox',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div [class]="cm.formFieldWrapper">
      <label [class]="cm.controlLabel">
        <input
          type="checkbox"
          [id]="checkboxId"
          [name]="name"
          [checked]="checked"
          [disabled]="disabled"
          [attr.data-state]="checked ? 'checked' : 'unchecked'"
          [attr.aria-invalid]="!!error"
          [class]="checkboxClasses"
          [style]="style"
          [attr.data-testid]="testId"
          (change)="handleChange.emit($event)"
        />
        @if (label) {
          <span [class]="labelClasses">{{ label }}</span>
        }
      </label>
      @if (error) {
        <p [class]="errorClasses">{{ error }}</p>
      }
    </div>
  `,
})
/**
 * Molecule Checkbox class.
 */
export class MoleculeCheckbox {
  @Input() label?: string
  @Input() checked = false
  @Input() indeterminate = false
  @Input() size?: Size
  @Input() error?: string
  @Input() className?: string
  @Input() style?: Record<string, string>
  @Input() testId?: string
  @Input() disabled = false
  @Input() name?: string
  @Input() id?: string

  @Output() handleChange = new EventEmitter<Event>()

  /**
   * Retrieves the current UI class map.
   * @returns The UIClassMap instance for styling.
   */
  get cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * Resolves the checkbox input element ID.
   * @returns The resolved ID from the id or name input.
   */
  get checkboxId(): string {
    return this.id || this.name || ''
  }

  /**
   * Computes the combined CSS classes for the checkbox input.
   * @returns The checkbox class name string.
   */
  get checkboxClasses(): string {
    return this.cm.cn(this.cm.checkbox({ error: !!this.error }), this.className)
  }

  /**
   * Computes the CSS classes for the checkbox label text.
   * @returns The label class name string.
   */
  get labelClasses(): string {
    return this.cm.cn(this.cm.controlText, this.disabled && this.cm.controlDisabled)
  }

  /**
   * Computes the CSS classes for the error message.
   * @returns The error class name string.
   */
  get errorClasses(): string {
    return this.cm.cn(this.cm.formError, this.cm.sp('mt', 1))
  }
}
