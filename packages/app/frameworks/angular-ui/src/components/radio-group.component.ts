/**
 * Angular RadioGroup UI component with UIClassMap-driven styling.
 *
 * @module
 */

import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core'

import type { RadioOption, Size, UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

/**
 * Angular RadioGroup UI component with UIClassMap-driven styling.
 */
@Component({
  selector: 'mol-radio-group',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      [class]="className"
      [style]="style"
      [attr.data-testid]="testId"
      role="radiogroup"
      [attr.aria-label]="label"
    >
      @if (label) {
        <div [class]="groupLabelClasses">{{ label }}</div>
      }
      <div [class]="directionClasses">
        @for (option of options; track option.value) {
          <label [class]="getOptionLabelClasses(option)">
            <input
              type="radio"
              [name]="label"
              [value]="option.value"
              [checked]="value === option.value"
              [disabled]="disabled || option.disabled"
              [attr.data-state]="value === option.value ? 'checked' : 'unchecked'"
              [class]="radioClasses"
              (change)="onRadioChange(option.value)"
            />
            <span [class]="cm.controlText">{{ option.label }}</span>
          </label>
        }
      </div>
      @if (error) {
        <p [class]="errorClasses">{{ error }}</p>
      }
    </div>
  `,
})
/**
 * Molecule Radio Group class.
 */
export class MoleculeRadioGroup {
  @Input() options: RadioOption<string>[] = []
  @Input() value?: string
  @Input() size?: Size
  @Input() label?: string
  @Input() direction: 'horizontal' | 'vertical' = 'vertical'
  @Input() error?: string
  @Input() className?: string
  @Input() style?: Record<string, string>
  @Input() testId?: string
  @Input() disabled = false

  @Output() valueChange = new EventEmitter<string>()

  /**
   * Retrieves the current UI class map.
   * @returns The UIClassMap instance for styling.
   */
  get cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * Computes the CSS classes for the radio group label.
   * @returns The group label class name string.
   */
  get groupLabelClasses(): string {
    return this.cm.cn(this.cm.label({}), this.cm.radioGroupLabel)
  }

  /**
   * Computes the CSS classes for the layout direction.
   * @returns The direction layout class name string.
   */
  get directionClasses(): string {
    return this.cm.radioGroupLayout(this.direction)
  }

  /**
   * Computes the CSS classes for radio input elements.
   * @returns The radio input class name string.
   */
  get radioClasses(): string {
    return this.cm.cn(this.cm.radio({ error: !!this.error }), this.cm.cursorPointer)
  }

  /**
   * Computes the CSS classes for the error message.
   * @returns The error class name string.
   */
  get errorClasses(): string {
    return this.cm.cn(this.cm.formError, this.cm.sp('mt', 1))
  }

  /**
   * Computes the CSS classes for an individual radio option label.
   * @param option - The radio option to compute classes for.
   * @returns The option label class name string.
   */
  getOptionLabelClasses(option: RadioOption<string>): string {
    const isDisabled = this.disabled || option.disabled
    return this.cm.cn(this.cm.controlLabel, isDisabled && this.cm.controlDisabled)
  }

  /**
   * Handles radio option selection change.
   * @param optionValue - The value of the selected radio option.
   */
  onRadioChange(optionValue: string): void {
    this.valueChange.emit(optionValue)
  }
}
