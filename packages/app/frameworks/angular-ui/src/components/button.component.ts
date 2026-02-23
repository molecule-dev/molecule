/**
 * Angular Button UI component with UIClassMap-driven styling.
 *
 * @module
 */

import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core'

import type { ButtonVariant, ColorVariant, Size, UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

/**
 * Angular Button UI component with UIClassMap-driven styling.
 */
@Component({
  selector: 'mol-button',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: 'display: contents' },
  template: `
    <button
      [type]="type"
      [class]="classes"
      [style]="style"
      [attr.data-testid]="testId"
      [disabled]="disabled || loading"
      [attr.aria-busy]="loading"
      (click)="handleClick.emit($event)"
    >
      @if (loading) {
        <span [class]="cm.buttonSpinner"></span>
      }
      @if (loading && loadingText) {
        {{ loadingText }}
      } @else {
        <ng-content></ng-content>
      }
    </button>
  `,
})
/**
 * Molecule Button class.
 */
export class MoleculeButton {
  @Input() variant: ButtonVariant = 'solid'
  @Input() color: ColorVariant = 'primary'
  @Input() size: Size = 'md'
  @Input() loading = false
  @Input() loadingText?: string
  @Input() fullWidth = false
  @Input() className?: string
  @Input() style?: Record<string, string>
  @Input() testId?: string
  @Input() disabled = false
  @Input() type: 'button' | 'submit' | 'reset' = 'button'

  @Output() handleClick = new EventEmitter<MouseEvent>()

  /**
   * Retrieves the current UI class map.
   * @returns The UIClassMap instance for styling.
   */
  get cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * Computes the combined CSS classes for the button element.
   * @returns The button class name string.
   */
  get classes(): string {
    return this.cm.cn(
      this.cm.button({
        variant: this.variant,
        color: this.color,
        size: this.size,
        fullWidth: this.fullWidth,
      }),
      this.className,
    )
  }
}
