/**
 * Angular Badge UI component with UIClassMap-driven styling.
 *
 * @module
 */

import { ChangeDetectionStrategy, Component, Input } from '@angular/core'

import type { ColorVariant, Size, UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

/**
 * Angular Badge UI component with UIClassMap-driven styling.
 */
@Component({
  selector: 'mol-badge',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span [class]="badgeClasses" [style]="style" [attr.data-testid]="testId">
      <ng-content></ng-content>
    </span>
  `,
})
/**
 * Molecule Badge class.
 */
export class MoleculeBadge {
  @Input() color: ColorVariant = 'primary'
  @Input() variant: 'solid' | 'outline' | 'subtle' = 'solid'
  @Input() size?: Size
  @Input() rounded = true
  @Input() className?: string
  @Input() style?: Record<string, string>
  @Input() testId?: string

  /**
   * Retrieves the current UI class map.
   * @returns The UIClassMap instance for styling.
   */
  private get cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * Computes the combined CSS classes for the badge element.
   * @returns The badge class name string.
   */
  get badgeClasses(): string {
    return this.cm.cn(
      this.cm.badge({ variant: this.color, size: this.size }),
      !this.rounded && this.cm.badgeSquare,
      this.className,
    )
  }
}
