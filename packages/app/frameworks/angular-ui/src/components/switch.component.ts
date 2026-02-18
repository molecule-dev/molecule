/**
 * Angular Switch UI component with UIClassMap-driven styling.
 *
 * @module
 */

import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core'

import type { ColorVariant, Size, UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

/**
 * Angular Switch UI component with UIClassMap-driven styling.
 */
@Component({
  selector: 'mol-switch',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <label [class]="wrapperClasses">
      <button
        type="button"
        role="switch"
        [attr.aria-checked]="checked"
        [disabled]="disabled"
        [attr.data-state]="state"
        [class]="switchClasses"
        [style]="style"
        [attr.data-testid]="testId"
        (click)="onToggle()"
      >
        <span [attr.data-state]="state" [class]="thumbClasses"></span>
      </button>
      @if (label) {
        <span [class]="cm.controlText">{{ label }}</span>
      }
    </label>
  `,
})
/**
 * Molecule Switch class.
 */
export class MoleculeSwitch {
  @Input() label?: string
  @Input() checked = false
  @Input() size: Size = 'md'
  @Input() color?: ColorVariant
  @Input() className?: string
  @Input() style?: Record<string, string>
  @Input() testId?: string
  @Input() disabled = false

  @Output() checkedChange = new EventEmitter<boolean>()

  /**
   * Retrieves the current UI class map.
   * @returns The UIClassMap instance for styling.
   */
  get cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * Computes the current checked/unchecked state string.
   * @returns The state string, either "checked" or "unchecked".
   */
  get state(): string {
    return this.checked ? 'checked' : 'unchecked'
  }

  /**
   * Computes the CSS classes for the switch wrapper label.
   * @returns The wrapper class name string.
   */
  get wrapperClasses(): string {
    return this.cm.cn(this.cm.controlLabel, this.disabled && this.cm.controlDisabled)
  }

  /**
   * Computes the combined CSS classes for the switch button.
   * @returns The switch class name string.
   */
  get switchClasses(): string {
    return this.cm.cn(this.cm.switchBase({ size: this.size }), this.className)
  }

  /**
   * Computes the CSS classes for the switch thumb indicator.
   * @returns The thumb class name string.
   */
  get thumbClasses(): string {
    return this.cm.switchThumb({ size: this.size })
  }

  /**
   * Handles the switch toggle action.
   */
  onToggle(): void {
    if (!this.disabled) {
      this.checkedChange.emit(!this.checked)
    }
  }
}
