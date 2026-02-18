/**
 * Angular Toast UI component with UIClassMap-driven styling.
 *
 * @module
 */

import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  type OnDestroy,
  type OnInit,
  Output,
} from '@angular/core'

import { t } from '@molecule/app-i18n'
import type { ColorVariant, UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { getIconSvg } from '../utilities/render-icon.js'

const statusVariantMap: Record<ColorVariant, 'default' | 'success' | 'warning' | 'error' | 'info'> =
  {
    primary: 'default',
    secondary: 'default',
    success: 'success',
    warning: 'warning',
    error: 'error',
    info: 'info',
  }

/**
 * Angular Toast UI component with UIClassMap-driven styling.
 */
@Component({
  selector: 'mol-toast',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (isVisible) {
      <div
        role="alert"
        data-state="open"
        [class]="toastClasses"
        [style]="style"
        [attr.data-testid]="testId"
      >
        @if (showIcon) {
          <span [class]="cm.toastIconWrapper">
            <span [innerHTML]="statusIconSvg"></span>
          </span>
        }
        <div [class]="cm.toastContentWrapper">
          @if (title) {
            <div [class]="titleClass">{{ title }}</div>
          }
          @if (description) {
            <div [class]="descriptionClass">{{ description }}</div>
          } @else {
            <div [class]="descriptionClass">
              <ng-content></ng-content>
            </div>
          }
        </div>
        @if (dismissible) {
          <button
            type="button"
            (click)="onDismiss()"
            [class]="closeButtonClass"
            [attr.aria-label]="closeAriaLabel"
          >
            <span [innerHTML]="dismissIconSvg"></span>
          </button>
        }
      </div>
    }
  `,
})
/**
 * Molecule Toast class.
 */
export class MoleculeToast implements OnInit, OnDestroy {
  @Input() title?: string
  @Input() description?: string
  @Input() status: ColorVariant = 'info'
  @Input() duration = 5000
  @Input() dismissible = true
  @Input() closeLabel?: string
  @Input() position: 'top' | 'top-right' | 'top-left' | 'bottom' | 'bottom-right' | 'bottom-left' =
    'bottom-right'
  @Input() className?: string
  @Input() style?: Record<string, string>
  @Input() testId?: string

  @Output() dismiss = new EventEmitter<void>()

  isVisible = true
  private timer?: ReturnType<typeof setTimeout>

  /**
   * Retrieves the current UI class map.
   * @returns The UIClassMap instance for styling.
   */
  get cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * Computes the accessible close button label.
   * @returns The localized aria-label for the close button.
   */
  get closeAriaLabel(): string {
    return this.closeLabel || t('ui.toast.close', undefined, { defaultValue: 'Close' })
  }

  /**
   * Retrieves the CSS class for the toast title.
   * @returns The title class name string.
   */
  get titleClass(): string {
    return this.cm.toastTitle
  }

  /**
   * Retrieves the CSS class for the toast description.
   * @returns The description class name string.
   */
  get descriptionClass(): string {
    return this.cm.toastDescription
  }

  /**
   * Retrieves the CSS class for the close button.
   * @returns The close button class name string.
   */
  get closeButtonClass(): string {
    return this.cm.toastClose
  }

  /**
   * Determines the icon type based on the toast status.
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
   * Computes the combined CSS classes for the toast container.
   * @returns The toast class name string.
   */
  get toastClasses(): string {
    const variant = statusVariantMap[this.status] || 'default'
    return this.cm.cn(this.cm.toast({ variant }), this.className)
  }

  /**
   * Starts the auto-dismiss timer on component creation.
   */
  ngOnInit(): void {
    if (this.duration > 0) {
      this.timer = setTimeout(() => {
        this.isVisible = false
        this.dismiss.emit()
      }, this.duration)
    }
  }

  /**
   * Clears the auto-dismiss timer on component destruction.
   */
  ngOnDestroy(): void {
    if (this.timer) {
      clearTimeout(this.timer)
    }
  }

  /**
   * Handles the dismiss action by hiding the toast.
   */
  onDismiss(): void {
    this.isVisible = false
    this.dismiss.emit()
  }
}
