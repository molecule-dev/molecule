/**
 * Angular Modal UI component with UIClassMap-driven styling.
 *
 * @module
 */

import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  inject,
  Input,
  type OnChanges,
  type OnDestroy,
  type OnInit,
  Output,
  type SimpleChanges,
} from '@angular/core'
import { DomSanitizer, type SafeHtml } from '@angular/platform-browser'

import { t } from '@molecule/app-i18n'
import type { ModalSize, UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { getIconSvg } from '../utilities/render-icon.js'

/**
 * Angular Modal UI component with UIClassMap-driven styling.
 */
@Component({
  selector: 'mol-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (open) {
      <!-- Overlay background -->
      <div [class]="overlayClass" aria-hidden="true"></div>

      <!-- Centering wrapper -->
      <div [class]="wrapperClass" (click)="onOverlayClick($event)">
        <!-- Content -->
        <div
          role="dialog"
          aria-modal="true"
          [attr.aria-labelledby]="title ? 'modal-title' : null"
          [class]="contentClasses"
          [style]="style"
          [attr.data-testid]="testId"
          (click)="$event.stopPropagation()"
        >
          @if (title || showCloseButton) {
            <div [class]="headerClass">
              @if (title) {
                <h2 id="modal-title" [class]="titleClass">{{ title }}</h2>
              } @else if (showCloseButton) {
                <div></div>
              }
              @if (showCloseButton) {
                <button
                  type="button"
                  (click)="close.emit()"
                  [class]="closeClass"
                  [attr.aria-label]="closeAriaLabel"
                >
                  <span [innerHTML]="closeIconSvg"></span>
                </button>
              }
            </div>
          }

          <div [class]="bodyClass">
            <ng-content></ng-content>
          </div>

          @if (hasFooter) {
            <div [class]="footerClass">
              <ng-content select="[modal-footer]"></ng-content>
            </div>
          }
        </div>
      </div>
    }
  `,
})
/**
 * Molecule Modal class.
 */
export class MoleculeModal implements OnInit, OnDestroy, OnChanges {
  @Input() open = false
  @Input() title?: string
  @Input() size: ModalSize = 'md'
  @Input() showCloseButton = true
  @Input() closeLabel?: string
  @Input() closeOnOverlayClick = true
  @Input() closeOnEscape = true
  @Input() centered = true
  @Input() preventScroll = true
  @Input() hasFooter = false
  @Input() className?: string
  @Input() style?: Record<string, string>
  @Input() testId?: string

  @Output() close = new EventEmitter<void>()

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
    return this.closeLabel || t('ui.modal.close', undefined, { defaultValue: 'Close' })
  }

  private boundEscapeHandler = this.handleEscape.bind(this)

  /**
   * Retrieves the CSS class for the modal wrapper.
   * @returns The wrapper class name string.
   */
  get wrapperClass(): string {
    return this.cm.dialogWrapper
  }

  /**
   * Retrieves the CSS class for the modal body.
   * @returns The body class name string.
   */
  get bodyClass(): string {
    return this.cm.dialogBody
  }

  /**
   * Retrieves the CSS class for the modal overlay.
   * @returns The overlay class name string.
   */
  get overlayClass(): string {
    return this.cm.dialogOverlay
  }

  /**
   * Retrieves the CSS class for the modal header.
   * @returns The header class name string.
   */
  get headerClass(): string {
    return this.cm.dialogHeader
  }

  /**
   * Retrieves the CSS class for the modal footer.
   * @returns The footer class name string.
   */
  get footerClass(): string {
    return this.cm.dialogFooter
  }

  /**
   * Retrieves the CSS class for the modal title.
   * @returns The title class name string.
   */
  get titleClass(): string {
    return this.cm.dialogTitle
  }

  /**
   * Retrieves the CSS class for the close button.
   * @returns The close button class name string.
   */
  get closeClass(): string {
    return this.cm.dialogClose
  }

  private sanitizer = inject(DomSanitizer)

  /**
   * Generates the SVG markup for the close button icon.
   * @returns The sanitized SVG for the close icon.
   */
  get closeIconSvg(): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(getIconSvg('x-mark', this.cm.iconMd))
  }

  /**
   * Computes the combined CSS classes for the modal content.
   * @returns The modal content class name string.
   */
  get contentClasses(): string {
    return this.cm.cn(this.cm.modal({ size: this.size }), this.className)
  }

  /**
   * Initializes event listeners on component creation.
   */
  ngOnInit(): void {
    this.updateListeners()
  }

  /**
   * Handles input property changes.
   * @param changes - The changed input properties.
   */
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open']) {
      this.updateListeners()
      this.updateBodyScroll()
    }
  }

  /**
   * Cleans up event listeners and body scroll on component destruction.
   */
  ngOnDestroy(): void {
    document.removeEventListener('keydown', this.boundEscapeHandler)
    if (this.preventScroll) {
      document.body.style.overflow = ''
    }
  }

  /**
   * Adds or removes the keyboard escape listener based on open state.
   */
  private updateListeners(): void {
    if (this.open) {
      document.addEventListener('keydown', this.boundEscapeHandler)
    } else {
      document.removeEventListener('keydown', this.boundEscapeHandler)
    }
  }

  /**
   * Updates the document body overflow based on open state.
   */
  private updateBodyScroll(): void {
    if (this.preventScroll) {
      document.body.style.overflow = this.open ? 'hidden' : ''
    }
  }

  /**
   * Handles escape key press to close the modal.
   * @param e - The keyboard event.
   */
  private handleEscape(e: KeyboardEvent): void {
    if (this.closeOnEscape && e.key === 'Escape') {
      this.close.emit()
    }
  }

  /**
   * Handles overlay click to close the modal.
   * @param event - The mouse event from the overlay click.
   */
  onOverlayClick(event: MouseEvent): void {
    if (this.closeOnOverlayClick && event.target === event.currentTarget) {
      this.close.emit()
    }
  }
}
