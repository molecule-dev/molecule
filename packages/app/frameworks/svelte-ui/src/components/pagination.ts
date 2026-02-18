/**
 * Pagination component class generator for Svelte.
 *
 * @module
 */

import { t } from '@molecule/app-i18n'
import type { IconData } from '@molecule/app-icons'
import { getIcon } from '@molecule/app-icons'
import type { Size } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { generatePaginationRange } from '../utilities.js'

/**
 * Options for generating pagination classes.
 */
export interface PaginationClassOptions {
  className?: string
}

/**
 * Generate classes for the pagination nav container.
 *
 * Usage in Svelte:
 * ```svelte
 * <script>
 *   import {
 *     getPaginationClasses, getPaginationContentClass, getPaginationItemClasses,
 *     getPaginationEllipsisClass, generatePaginationRange,
 *   } from '`@molecule/app-ui-svelte`'
 *   import { t } from '`@molecule/app-i18n`'
 *   export let page = 1
 *   export let totalPages = 10
 *   export let siblings = 1
 *   export let boundaries = 1
 *   $: range = generatePaginationRange(page, totalPages, siblings, boundaries)
 *   $: navClass = getPaginationClasses()
 * </script>
 * <nav role="navigation" aria-label={t('ui.pagination.nav')} class={navClass}>
 *   <ul class={getPaginationContentClass()}>
 *     {#each range as item}
 *       {#if item === 'ellipsis'}
 *         <li><span class={getPaginationEllipsisClass()}>...</span></li>
 *       {:else}
 *         <li>
 *           <button class={getPaginationItemClasses({ active: item === page, size })} on:click={() => onChange(item)}>
 *             {item}
 *           </button>
 *         </li>
 *       {/if}
 *     {/each}
 *   </ul>
 * </nav>
 * ```
 * @param options - The options.
 * @returns The resulting string.
 */
export function getPaginationClasses(options: PaginationClassOptions = {}): string {
  const { className } = options
  const cm = getClassMap()
  return cm.cn(cm.paginationRoot, className)
}

/**
 * Get the pagination content (ul) class string.
 *
 * @returns The pagination content class string.
 */
export function getPaginationContentClass(): string {
  return getClassMap().paginationContent
}

/**
 * Get the pagination ellipsis class string.
 *
 * @returns The pagination ellipsis class string.
 */
export function getPaginationEllipsisClass(): string {
  return getClassMap().paginationEllipsis
}

/**
 * Generate classes for a pagination button item.
 *
 * @param options - The options.
 * @param options.active - Whether the item is currently active.
 * @param options.size - The size of the pagination item.
 * @param options.className - Optional CSS class name to append.
 * @returns The resulting class string.
 */
export function getPaginationItemClasses(
  options: {
    active?: boolean
    size?: Size
    className?: string
  } = {},
): string {
  const { active = false, size = 'md', className } = options
  const cm = getClassMap()
  return cm.cn(cm.pagination({ active, size }), cm.paginationInteractive, className)
}

/**
 * Pagination direction to icon name mapping.
 */
const paginationIconMap: Record<string, string> = {
  first: 'chevrons-left',
  prev: 'chevron-left',
  next: 'chevron-right',
  last: 'chevrons-right',
  ellipsis: 'ellipsis-horizontal',
}

/**
 * Get icon data for a pagination navigation direction.
 *
 * @param direction - Navigation direction (first, prev, next, last, ellipsis)
 * @returns Icon data from the current icon set
 */
export function getPaginationIconData(direction: string): IconData {
  const name = paginationIconMap[direction]
  if (!name) {
    throw new Error(
      t(
        'svelte.error.unknownPaginationDirection',
        { direction },
        { defaultValue: `Unknown pagination direction: "${direction}"` },
      ),
    )
  }
  return getIcon(name)
}

// Re-export generatePaginationRange for convenience
export { generatePaginationRange }
