/**
 * Angular Spinner UI component with UIClassMap-driven styling.
 *
 * @module
 */

import { ChangeDetectionStrategy, Component, Input } from '@angular/core'

import { t } from '@molecule/app-i18n'
import type { ColorVariant, Size, UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

/**
 * Angular Spinner UI component with UIClassMap-driven styling.
 */
@Component({
  selector: 'mol-spinner',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      role="status"
      [attr.aria-label]="spinnerLabel"
      [class]="spinnerClasses"
      [style]="computedStyle"
      [attr.data-testid]="testId"
    >
      @if (label) {
        <span [class]="cm.srOnly">{{ label }}</span>
      }
    </div>
  `,
})
/**
 * Molecule Spinner class.
 */
export class MoleculeSpinner {
  @Input() size: Size = 'md'
  @Input() color?: ColorVariant | string
  @Input() label?: string
  @Input() className?: string
  @Input() style?: Record<string, string>
  @Input() testId?: string

  /**
   * Retrieves the current UI class map.
   * @returns The UIClassMap instance for styling.
   */
  get cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * Computes the accessible spinner label.
   * @returns The localized aria-label for the spinner.
   */
  get spinnerLabel(): string {
    return this.label || t('ui.spinner.loading', undefined, { defaultValue: 'Loading' })
  }

  /**
   * Computes the combined CSS classes for the spinner element.
   * @returns The spinner class name string.
   */
  get spinnerClasses(): string {
    return this.cm.cn(this.cm.spinner({ size: this.size }), this.className)
  }

  /**
   * Computes the merged inline styles including custom color.
   * @returns The computed style object with optional custom border color.
   */
  get computedStyle(): Record<string, string> {
    const base: Record<string, string> = { ...this.style }
    if (
      this.color &&
      typeof this.color === 'string' &&
      !['primary', 'secondary', 'success', 'warning', 'error', 'info'].includes(this.color)
    ) {
      base['borderColor'] = this.color
      base['borderTopColor'] = 'transparent'
    }
    return base
  }
}
