/**
 * Dropdown component class generator for Svelte.
 *
 * @module
 */

import { getClassMap } from '@molecule/app-ui'

/**
 * Dropdown placement type.
 */
export type DropdownPlacement =
  | 'top'
  | 'top-start'
  | 'top-end'
  | 'bottom'
  | 'bottom-start'
  | 'bottom-end'
  | 'left'
  | 'right'

/**
 * Dropdown alignment type.
 */
export type DropdownAlign = 'start' | 'center' | 'end'

/**
 * Absolute top/left pixel position for a dropdown element.
 */
export interface DropdownPosition {
  top: number
  left: number
}

/**
 * Options for generating dropdown content classes.
 */
export interface DropdownContentClassOptions {
  className?: string
}

/**
 * Generate classes for the dropdown menu content container.
 *
 * Usage in Svelte:
 * ```svelte
 * <script>
 *   import {
 *     getDropdownContentClasses, getDropdownItemClasses, getDropdownSeparatorClass,
 *     calculateDropdownPosition, dropdownTriggerClass,
 *   } from '`@molecule/app-ui-svelte`'
 *   export let items = []
 *   export let placement = 'bottom-start'
 *   let open = false
 *   let triggerEl, menuEl
 *   let position = { top: 0, left: 0 }
 *   $: contentClass = getDropdownContentClasses()
 * </script>
 * <div bind:this={triggerEl} class={dropdownTriggerClass} on:click={() => open = !open}>
 *   <slot name="trigger" />
 * </div>
 * {#if open}
 *   <div bind:this={menuEl} role="menu" data-state="open" class={contentClass}
 *     style="position:absolute;top:{position.top}px;left:{position.left}px;z-index:50;">
 *     {#each items as item}
 *       {#if item.separator}
 *         <div class={getDropdownSeparatorClass()} role="separator" />
 *       {:else}
 *         <div role="menuitem" class={getDropdownItemClasses({ disabled: item.disabled })} on:click={() => onSelect(item.value)}>
 *           {item.label}
 *         </div>
 *       {/if}
 *     {/each}
 *   </div>
 * {/if}
 * ```
 * @param options - The options.
 * @returns The resulting string.
 */
export function getDropdownContentClasses(options: DropdownContentClassOptions = {}): string {
  const { className } = options
  const cm = getClassMap()
  return cm.cn(cm.dropdownContent, className)
}

/**
 * Generate classes for a dropdown menu item.
 *
 * @param options - The options.
 * @param options.disabled - Whether the item is disabled.
 * @param options.className - Optional CSS class name to append.
 * @returns The resulting class string.
 */
export function getDropdownItemClasses(
  options: { disabled?: boolean; className?: string } = {},
): string {
  const { disabled = false, className } = options
  const cm = getClassMap()
  return cm.cn(cm.dropdownItem, disabled && cm.dropdownItemDisabled, className)
}

/**
 * Get the dropdown separator class string.
 *
 * @returns The dropdown separator class string.
 */
export function getDropdownSeparatorClass(): string {
  return getClassMap().dropdownSeparator
}

/**
 * Get the dropdown label class string.
 *
 * @returns The dropdown label class string.
 */
export function getDropdownLabelClass(): string {
  return getClassMap().dropdownLabel
}

/**
 * Dropdown trigger wrapper class.
 *
 * @returns The dropdown trigger class string.
 */
export function getDropdownTriggerClass(): string {
  return getClassMap().dropdownTrigger
}

/**
 * Dropdown item icon container class.
 *
 * @returns The dropdown item icon class string.
 */
export function getDropdownItemIconClass(): string {
  return getClassMap().dropdownItemIcon
}

/**
 * Dropdown item label class.
 *
 * @returns The dropdown item label class string.
 */
export function getDropdownItemLabelClass(): string {
  return getClassMap().dropdownItemLabel
}

/**
 * Dropdown item shortcut class.
 * @returns The resulting string.
 */
export function getDropdownItemShortcutClass(): string {
  return getClassMap().dropdownItemShortcut
}

/**
 * The dropdown trigger class.
 *
 */
export const dropdownTriggerClass = /* @__PURE__ */ getClassMap().dropdownTrigger

/**
 * Dropdown item icon class constant.
 *
 * @deprecated Use getDropdownItemIconClass() instead.
 */
export const dropdownItemIconClass = /* @__PURE__ */ getClassMap().dropdownItemIcon

/**
 * Dropdown item label class constant.
 *
 * @deprecated Use getDropdownItemLabelClass() instead.
 */
export const dropdownItemLabelClass = /* @__PURE__ */ getClassMap().dropdownItemLabel

/**
 * Dropdown item shortcut class constant.
 */
export const dropdownItemShortcutClass = /* @__PURE__ */ getClassMap().dropdownItemShortcut

/**
 * Calculate dropdown menu position based on trigger element and placement.
 *
 * @param triggerRect - The bounding rect of the trigger element.
 * @param menuRect - The bounding rect of the menu element.
 * @param placement - The desired placement of the dropdown.
 * @param align - The alignment within the placement axis.
 * @param offset - The pixel offset from the trigger element.
 * @returns The calculated absolute position for the dropdown.
 */
export function calculateDropdownPosition(
  triggerRect: DOMRect,
  menuRect: DOMRect,
  placement: DropdownPlacement,
  align: DropdownAlign = 'start',
  offset = 4,
): DropdownPosition {
  let top = 0
  let left: number

  // Vertical positioning
  if (placement.startsWith('top')) {
    top = triggerRect.top + window.scrollY - menuRect.height - offset
  } else if (placement.startsWith('bottom')) {
    top = triggerRect.bottom + window.scrollY + offset
  } else if (placement === 'left' || placement === 'right') {
    top = triggerRect.top + window.scrollY + (triggerRect.height - menuRect.height) / 2
  }

  // Horizontal positioning
  if (placement === 'left') {
    left = triggerRect.left + window.scrollX - menuRect.width - offset
  } else if (placement === 'right') {
    left = triggerRect.right + window.scrollX + offset
  } else {
    // For top/bottom placements, use align
    switch (align) {
      case 'start':
        left = triggerRect.left + window.scrollX
        break
      case 'end':
        left = triggerRect.right + window.scrollX - menuRect.width
        break
      case 'center':
      default:
        left = triggerRect.left + window.scrollX + (triggerRect.width - menuRect.width) / 2
        break
    }
  }

  // Handle top-start, top-end, bottom-start, bottom-end
  if (placement.endsWith('-start')) {
    left = triggerRect.left + window.scrollX
  } else if (placement.endsWith('-end')) {
    left = triggerRect.right + window.scrollX - menuRect.width
  }

  return { top, left }
}
