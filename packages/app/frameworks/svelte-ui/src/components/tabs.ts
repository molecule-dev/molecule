/**
 * Tabs component class generator for Svelte.
 *
 * @module
 */

import { getClassMap } from '@molecule/app-ui'

/**
 * Options for generating tabs list classes.
 */
export interface TabsListClassOptions {
  fitted?: boolean
  className?: string
}

/**
 * Generate classes for the tabs list container.
 *
 * Usage in Svelte:
 * ```svelte
 * <script>
 *   import { getTabsListClasses, getTabsTriggerClasses, getTabsContentClass } from '`@molecule/app-ui-svelte`'
 *   export let items = []
 *   export let value = ''
 *   export let fitted = false
 *   $: listClass = getTabsListClasses({ fitted })
 * </script>
 * <div class={listClass} role="tablist">
 *   {#each items as item}
 *     <button
 *       role="tab"
 *       aria-selected={value === item.value}
 *       data-state={value === item.value ? 'active' : 'inactive'}
 *       disabled={item.disabled}
 *       class={getTabsTriggerClasses({ fitted })}
 *       on:click={() => onChange(item.value)}
 *     >
 *       {item.label}
 *     </button>
 *   {/each}
 * </div>
 * {#if activeContent}
 *   <div role="tabpanel" class={getTabsContentClass()}>{activeContent}</div>
 * {/if}
 * ```
 * @param options - The options.
 * @returns The resulting string.
 */
export function getTabsListClasses(options: TabsListClassOptions = {}): string {
  const { fitted = false, className } = options
  const cm = getClassMap()
  return cm.cn(cm.tabsList, fitted && cm.tabsFitted, className)
}

/**
 * Generate classes for a tab trigger button.
 *
 * @param options - The options.
 * @param options.fitted - Whether the tab takes equal width.
 * @param options.className - Optional CSS class name to append.
 * @returns The resulting class string.
 */
export function getTabsTriggerClasses(
  options: { fitted?: boolean; className?: string } = {},
): string {
  const { fitted = false, className } = options
  const cm = getClassMap()
  return cm.cn(cm.tabsTrigger, fitted && cm.tabTriggerFitted, className)
}

/**
 * Get the tab content panel class string.
 *
 * @returns The tabs content class string.
 */
export function getTabsContentClass(): string {
  return getClassMap().tabsContent
}
