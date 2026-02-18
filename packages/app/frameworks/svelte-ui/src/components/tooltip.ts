/**
 * Tooltip component class generator for Svelte.
 *
 * @module
 */

import type { TooltipPlacement } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

/**
 * Absolute top/left pixel position for a tooltip element.
 */
export interface TooltipPosition {
  top: number
  left: number
}

/**
 * Options for generating tooltip classes.
 */
export interface TooltipClassOptions {
  className?: string
}

/**
 * Generate classes for the tooltip content element.
 *
 * Usage in Svelte:
 * ```svelte
 * <script>
 *   import { getTooltipClasses, calculateTooltipPosition } from '`@molecule/app-ui-svelte`'
 *   export let placement = 'top'
 *   let triggerEl, tooltipEl
 *   let visible = false
 *   let position = { top: 0, left: 0 }
 *   $: classes = getTooltipClasses()
 * </script>
 * <div bind:this={triggerEl} on:mouseenter={() => visible = true} on:mouseleave={() => visible = false}>
 *   <slot />
 * </div>
 * {#if visible}
 *   <div bind:this={tooltipEl} role="tooltip" class={classes} style="position:absolute;top:{position.top}px;left:{position.left}px;z-index:9999;">
 *     {content}
 *   </div>
 * {/if}
 * ```
 * @param options - The options.
 * @returns The resulting string.
 */
export function getTooltipClasses(options: TooltipClassOptions = {}): string {
  const { className } = options
  const cm = getClassMap()
  return cm.cn(cm.tooltipContent, className)
}

/**
 * Tooltip trigger wrapper class.
 *
 * @returns The tooltip trigger class string.
 */
export function getTooltipTriggerClass(): string {
  return getClassMap().tooltipTrigger
}

/**
 * Tooltip trigger class constant.
 *
 * @deprecated Use getTooltipTriggerClass() instead.
 */
export const tooltipTriggerClass = /* @__PURE__ */ getClassMap().tooltipTrigger

/**
 * Calculate tooltip position based on trigger and tooltip element rects.
 *
 * @param triggerRect - The bounding rect of the trigger element.
 * @param tooltipRect - The bounding rect of the tooltip element.
 * @param placement - The desired tooltip placement.
 * @param offset - The pixel offset from the trigger element.
 * @returns The calculated absolute position for the tooltip.
 */
export function calculateTooltipPosition(
  triggerRect: DOMRect,
  tooltipRect: DOMRect,
  placement: TooltipPlacement,
  offset = 8,
): TooltipPosition {
  const { top, left, width, height } = triggerRect
  const tooltipWidth = tooltipRect.width
  const tooltipHeight = tooltipRect.height

  const positions: Record<TooltipPlacement, TooltipPosition> = {
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

  return positions[placement]
}
