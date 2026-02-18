/**
 * Accordion component class generator for Svelte.
 *
 * @module
 */

import type { IconData } from '@molecule/app-icons'
import { getIcon } from '@molecule/app-icons'
import { getClassMap } from '@molecule/app-ui'

/**
 * Options for generating accordion classes.
 */
export interface AccordionClassOptions {
  className?: string
}

/**
 * Generate classes for the accordion container.
 *
 * Usage in Svelte:
 * ```svelte
 * <script>
 *   import {
 *     getAccordionClasses, getAccordionItemClass,
 *     getAccordionTriggerClasses, getAccordionContentClass, getAccordionContentInnerClass,
 *   } from '`@molecule/app-ui-svelte`'
 *   export let items = []
 *   let expandedItems = []
 *   $: containerClass = getAccordionClasses()
 * </script>
 * <div class={containerClass}>
 *   {#each items as item}
 *     <div class={getAccordionItemClass()} data-state={expandedItems.includes(item.value) ? 'open' : 'closed'}>
 *       <button class={getAccordionTriggerClasses()} data-state={...} on:click={() => toggle(item.value)}>
 *         {item.header}
 *         <svg class={cm.accordionChevron}>...</svg>
 *       </button>
 *       {#if expandedItems.includes(item.value)}
 *         <div class={getAccordionContentClass()}>
 *           <div class={getAccordionContentInnerClass()}>{item.content}</div>
 *         </div>
 *       {/if}
 *     </div>
 *   {/each}
 * </div>
 * ```
 * @param options - The options.
 * @returns The resulting string.
 */
export function getAccordionClasses(options: AccordionClassOptions = {}): string {
  const { className } = options
  const cm = getClassMap()
  return cm.cn(cm.accordionRoot, className)
}

/**
 * Get the accordion item class string.
 *
 * @returns The accordion item class string.
 */
export function getAccordionItemClass(): string {
  return getClassMap().accordionItem
}

/**
 * Generate classes for an accordion trigger button.
 *
 * @param className - Optional CSS class name to append.
 * @returns The resulting class string.
 */
export function getAccordionTriggerClasses(className?: string): string {
  const cm = getClassMap()
  return cm.cn(cm.accordion(), cm.accordionTriggerBase, className)
}

/**
 * Get the accordion content wrapper class string.
 *
 * @returns The accordion content wrapper class string.
 */
export function getAccordionContentClass(): string {
  return getClassMap().accordionContent
}

/**
 * Get the accordion content inner padding class string.
 *
 * @returns The accordion content inner padding class string.
 */
export function getAccordionContentInnerClass(): string {
  return getClassMap().accordionContentInner
}

/**
 * Chevron icon class for accordion triggers.
 *
 * @returns The accordion chevron class string.
 */
export function getAccordionChevronClass(): string {
  return getClassMap().accordionChevron
}

/**
 * Accordion chevron class constant.
 *
 * @deprecated Use getAccordionChevronClass() instead.
 */
export const accordionChevronClass = /* @__PURE__ */ getClassMap().accordionChevron

/**
 * Get icon data for the accordion chevron.
 *
 * @returns Icon data for a downward chevron from the current icon set
 */
export function getAccordionChevronIconData(): IconData {
  return getIcon('chevron-down')
}

/**
 * Helper to manage accordion expanded state.
 * Handles single/multiple expansion and collapsibility logic.
 *
 * @param expandedItems - The currently expanded item values.
 * @param itemValue - The value of the item being toggled.
 * @param options - Toggle behavior options.
 * @param options.multiple - Whether multiple items can be expanded simultaneously.
 * @param options.collapsible - Whether all items can be collapsed.
 * @returns The updated array of expanded item values.
 */
export function toggleAccordionItem(
  expandedItems: string[],
  itemValue: string,
  options: { multiple?: boolean; collapsible?: boolean } = {},
): string[] {
  const { multiple = false, collapsible = true } = options

  if (expandedItems.includes(itemValue)) {
    // Collapsing
    if (!collapsible && expandedItems.length === 1) {
      return expandedItems
    }
    return expandedItems.filter((v) => v !== itemValue)
  } else {
    // Expanding
    if (multiple) {
      return [...expandedItems, itemValue]
    }
    return [itemValue]
  }
}
