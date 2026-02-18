/**
 * Angular Alert UI component with UIClassMap-driven styling.
 *
 * @module
 */

import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core'

import { t } from '@molecule/app-i18n'
import type { ColorVariant, UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { getIconSvg } from '../utilities/render-icon.js'

const statusVariantMap: Record<ColorVariant, 'default' | 'info' | 'success' | 'warning' | 'error'> =
  {
    primary: 'default',
    secondary: 'default',
    success: 'success',
    warning: 'warning',
    error: 'error',
    info: 'info',
  }

/**
 * Angular Alert UI component with UIClassMap-driven styling.
 */
@Component({
  selector: 'mol-alert',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div role="alert" [class]="alertClasses" [style]="style" [attr.data-testid]="testId">
      @if (showIcon) {
        <span [class]="cm.alertIconWrapper">
          <span [innerHTML]="statusIconSvg"></span>
        </span>
      }
      <div [class]="cm.alertContent">
        @if (title) {
          <h5 [class]="titleClass">{{ title }}</h5>
        }
        <div [class]="descriptionClass">
          <ng-content></ng-content>
        </div>
      </div>
      @if (dismissible) {
        <button
          type="button"
          (click)="dismiss.emit()"
          [class]="cm.alertDismiss"
          [attr.aria-label]="dismissAriaLabel"
        >
          <span [innerHTML]="dismissIconSvg"></span>
        </button>
      }
    </div>
  `,
})
/**
 * Molecule Alert class.
 */
export class MoleculeAlert {
  @Input() title?: string
  @Input() status: ColorVariant = 'info'
  @Input() variant?: 'solid' | 'subtle' | 'outline' | 'left-accent'
  @Input() dismissible = false
  @Input() dismissLabel?: string
  @Input() className?: string
  @Input() style?: Record<string, string>
  @Input() testId?: string

  @Output() dismiss = new EventEmitter<void>()

  /**
   * Retrieves the current UI class map.
   * @returns The UIClassMap instance for styling.
   */
  get cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * Computes the accessible dismiss button label.
   * @returns The localized aria-label for the dismiss button.
   */
  get dismissAriaLabel(): string {
    return this.dismissLabel || t('ui.alert.dismiss', undefined, { defaultValue: 'Dismiss' })
  }

  /**
   * Retrieves the CSS class for the alert title.
   * @returns The title class name string.
   */
  get titleClass(): string {
    return this.cm.alertTitle
  }

  /**
   * Retrieves the CSS class for the alert description.
   * @returns The description class name string.
   */
  get descriptionClass(): string {
    return this.cm.alertDescription
  }

  /**
   * Determines the icon type based on the alert status.
   * @returns The mapped icon type string.
   */
  get iconType(): string {
    return statusVariantMap[this.status] || 'default'
  }

  /**
   * Determines whether the status icon should be shown.
   * @returns True if the icon type is not default.
   */
  get showIcon(): boolean {
    return this.iconType !== 'default'
  }

  private statusIconMap: Record<string, string> = {
    info: 'info-circle',
    success: 'check-circle',
    warning: 'exclamation-triangle',
    error: 'x-circle',
  }

  /**
   * Generates the SVG markup for the status icon.
   * @returns The SVG string for the current status icon.
   */
  get statusIconSvg(): string {
    const name = this.statusIconMap[this.iconType]
    return name ? getIconSvg(name, this.cm.iconMd) : ''
  }

  /**
   * Generates the SVG markup for the dismiss icon.
   * @returns The SVG string for the dismiss button icon.
   */
  get dismissIconSvg(): string {
    return getIconSvg('x-mark', this.cm.iconSm)
  }

  /**
   * Computes the combined CSS classes for the alert container.
   * @returns The alert container class name string.
   */
  get alertClasses(): string {
    const cmVariant = statusVariantMap[this.status] || 'default'
    return this.cm.cn(this.cm.alert({ variant: cmVariant }), this.className)
  }
}
