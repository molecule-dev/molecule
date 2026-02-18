/**
 * Angular Tooltip UI component with UIClassMap-driven styling.
 *
 * @module
 */

import {
  ChangeDetectionStrategy,
  Component,
  type ElementRef,
  Input,
  type OnDestroy,
  ViewChild,
} from '@angular/core'

import type { TooltipPlacement, UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

/**
 * Angular Tooltip UI component with UIClassMap-driven styling.
 *
 * Wraps child content and shows a tooltip on hover/focus.
 */
@Component({
  selector: 'mol-tooltip',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      #trigger
      [class]="cm.tooltipTrigger"
      (mouseenter)="show()"
      (mouseleave)="hide()"
      (focus)="show()"
      (blur)="hide()"
    >
      <ng-content></ng-content>
    </div>
    @if (isVisible) {
      <div
        #tooltipEl
        role="tooltip"
        [class]="tooltipClasses"
        [style]="tooltipStyle"
        [attr.data-testid]="testId"
      >
        {{ content }}
      </div>
    }
  `,
})
/**
 * Molecule Tooltip class.
 */
export class MoleculeTooltip implements OnDestroy {
  @Input() content = ''
  @Input() placement: TooltipPlacement = 'top'
  @Input() delay = 0
  @Input() hasArrow = false
  @Input() className?: string
  @Input() style?: Record<string, string>
  @Input() testId?: string

  @ViewChild('trigger') triggerRef?: ElementRef<HTMLDivElement>
  @ViewChild('tooltipEl') tooltipRef?: ElementRef<HTMLDivElement>

  isVisible = false
  tooltipStyle: Record<string, string> = {}
  private timeoutId?: ReturnType<typeof setTimeout>

  /**
   * Retrieves the current UI class map.
   * @returns The UIClassMap instance for styling.
   */
  get cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * Computes the combined CSS classes for the tooltip content.
   * @returns The tooltip class name string.
   */
  get tooltipClasses(): string {
    return this.cm.cn(this.cm.tooltipContent, this.className)
  }

  /**
   * Shows the tooltip with optional delay.
   */
  show(): void {
    if (this.delay > 0) {
      this.timeoutId = setTimeout(() => {
        this.isVisible = true
        this.updatePosition()
      }, this.delay)
    } else {
      this.isVisible = true
      requestAnimationFrame(() => this.updatePosition())
    }
  }

  /**
   * Hides the tooltip and cancels any pending delay.
   */
  hide(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId)
    }
    this.isVisible = false
  }

  /**
   * Clears pending timeouts on component destruction.
   */
  ngOnDestroy(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId)
    }
  }

  /**
   * Calculates and applies the tooltip position relative to the trigger.
   */
  private updatePosition(): void {
    if (!this.triggerRef?.nativeElement || !this.tooltipRef?.nativeElement) return

    const triggerRect = this.triggerRef.nativeElement.getBoundingClientRect()
    const tooltipRect = this.tooltipRef.nativeElement.getBoundingClientRect()
    const offset = 8

    const { top, left, width, height } = triggerRect
    const tooltipWidth = tooltipRect.width
    const tooltipHeight = tooltipRect.height

    const positions: Record<TooltipPlacement, { top: number; left: number }> = {
      top: {
        top: top + window.scrollY - tooltipHeight - offset,
        left: left + window.scrollX + width / 2 - tooltipWidth / 2,
      },
      bottom: {
        top: top + window.scrollY + height + offset,
        left: left + window.scrollX + width / 2 - tooltipWidth / 2,
      },
      left: {
        top: top + window.scrollY + height / 2 - tooltipHeight / 2,
        left: left + window.scrollX - tooltipWidth - offset,
      },
      right: {
        top: top + window.scrollY + height / 2 - tooltipHeight / 2,
        left: left + window.scrollX + width + offset,
      },
      'top-start': {
        top: top + window.scrollY - tooltipHeight - offset,
        left: left + window.scrollX,
      },
      'top-end': {
        top: top + window.scrollY - tooltipHeight - offset,
        left: left + window.scrollX + width - tooltipWidth,
      },
      'bottom-start': {
        top: top + window.scrollY + height + offset,
        left: left + window.scrollX,
      },
      'bottom-end': {
        top: top + window.scrollY + height + offset,
        left: left + window.scrollX + width - tooltipWidth,
      },
    }

    const pos = positions[this.placement]
    this.tooltipStyle = {
      ...this.style,
      position: 'absolute',
      top: `${pos.top}px`,
      left: `${pos.left}px`,
      zIndex: '9999',
    }
  }
}
