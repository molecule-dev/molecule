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

/** Arrow square size (px) before the 45° rotation that turns it into a diamond. */
const ARROW_SIZE = 8

/**
 * Returns the arrow's inline position style for a given placement. The arrow
 * has no dedicated ClassMap resolver (`tooltip()` takes no options), so its
 * shape/position is expressed via a small inline style — the sanctioned
 * exception for values ClassMap cannot express. Its color is NOT hardcoded:
 * `var(--color-surface)` / `var(--color-border)` are the same CSS custom
 * properties the `bg-surface`/`border` classes in `tooltipContent` resolve
 * to, so the arrow always matches the tooltip body in both themes.
 *
 * A standalone function (rather than a class member) so it's unit-testable
 * in isolation, matching `getModalWrapperStyle()` in `modal.component.ts`.
 * @param placement - The tooltip's resolved placement.
 * @returns Inline style positioning the rotated-square arrow for that placement.
 */
export function getTooltipArrowStyle(placement: TooltipPlacement): Record<string, string> {
  const half = ARROW_SIZE / 2
  const base: Record<string, string> = {
    position: 'absolute',
    width: `${ARROW_SIZE}px`,
    height: `${ARROW_SIZE}px`,
    background: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
  }
  switch (placement) {
    case 'top':
      return {
        ...base,
        bottom: `${-half}px`,
        left: '50%',
        transform: 'translateX(-50%) rotate(45deg)',
      }
    case 'top-start':
      return { ...base, bottom: `${-half}px`, left: '12px', transform: 'rotate(45deg)' }
    case 'top-end':
      return { ...base, bottom: `${-half}px`, right: '12px', transform: 'rotate(45deg)' }
    case 'bottom':
      return {
        ...base,
        top: `${-half}px`,
        left: '50%',
        transform: 'translateX(-50%) rotate(45deg)',
      }
    case 'bottom-start':
      return { ...base, top: `${-half}px`, left: '12px', transform: 'rotate(45deg)' }
    case 'bottom-end':
      return { ...base, top: `${-half}px`, right: '12px', transform: 'rotate(45deg)' }
    case 'left':
      return {
        ...base,
        right: `${-half}px`,
        top: '50%',
        transform: 'translateY(-50%) rotate(45deg)',
      }
    case 'right':
      return {
        ...base,
        left: `${-half}px`,
        top: '50%',
        transform: 'translateY(-50%) rotate(45deg)',
      }
    default:
      return base
  }
}

/**
 * Angular Tooltip UI component with UIClassMap-driven styling.
 *
 * Wraps child content and shows a tooltip on hover/focus. `hasArrow` renders
 * a small themed pointer at the resolved `placement` edge.
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
      <!--
        Outer positioned wrapper carries the top/left/z-index placement; the
        arrow renders as its SIBLING (not nested inside the visible box),
        because tooltipContent sets overflow-hidden — an arrow meant to poke
        past the box's own edge would be clipped invisible if it were a
        descendant of that element instead.
      -->
      <div [style]="positionStyle">
        <div
          #tooltipEl
          role="tooltip"
          [class]="tooltipClasses"
          [style]="style"
          [attr.data-testid]="testId"
        >
          {{ content }}
        </div>
        @if (hasArrow) {
          <span aria-hidden="true" [style]="arrowStyle"></span>
        }
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
  positionStyle: Record<string, string> = {}
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
   * Retrieves the inline style for the tooltip's arrow element.
   * @returns Inline style positioning the rotated-square arrow.
   */
  get arrowStyle(): Record<string, string> {
    return getTooltipArrowStyle(this.placement)
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
    this.positionStyle = {
      position: 'absolute',
      top: `${pos.top}px`,
      left: `${pos.left}px`,
      zIndex: '9999',
    }
  }
}
