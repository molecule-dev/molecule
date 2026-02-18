/**
 * Utility functions for Svelte UI components.
 *
 * @module
 */

/**
 * Merge class names, filtering out falsy values.
 *
 * Use this in Svelte components to conditionally combine classes:
 * ```svelte
 * <script>
 *   import { cn } from '`@molecule/app-ui-svelte`'
 *   export let variant = 'solid'
 *   export let className = ''
 *   $: classes = cn('base-class', variant === 'solid' && 'solid-variant', className)
 * </script>
 * <button class={classes}><slot /></button>
 * ```
 * @param inputs - Class name strings, or falsy values to be filtered out.
 * @returns A single space-separated class string with falsy values removed.
 */
export function cn(...inputs: (string | undefined | null | false)[]): string {
  return inputs.filter(Boolean).join(' ')
}

/**
 * Gets up to two uppercase initials from a name string.
 * Used by the avatar component for fallback display.
 *
 * @param name - A full name to extract initials from (e.g. "John Doe").
 * @returns The uppercase initials, at most two characters (e.g. "JD").
 */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

/**
 * Generate a pagination range with page numbers and 'ellipsis' markers.
 * Used by pagination components to render page navigation controls.
 * @param currentPage - The currently active page number (1-indexed).
 * @param totalPages - The total number of pages.
 * @param siblings - Number of sibling pages to show on each side of the current page.
 * @param boundaries - Number of pages to always show at the start and end.
 * @returns Array of page numbers and 'ellipsis' string markers.
 */
export function generatePaginationRange(
  currentPage: number,
  totalPages: number,
  siblings: number,
  boundaries: number,
): (number | 'ellipsis')[] {
  const range: (number | 'ellipsis')[] = []

  // Always show first boundary pages
  for (let i = 1; i <= Math.min(boundaries, totalPages); i++) {
    range.push(i)
  }

  // Calculate sibling range
  const siblingStart = Math.max(boundaries + 1, currentPage - siblings)
  const siblingEnd = Math.min(totalPages - boundaries, currentPage + siblings)

  // Add ellipsis after boundary if needed
  if (siblingStart > boundaries + 1) {
    range.push('ellipsis')
  }

  // Add sibling pages
  for (let i = siblingStart; i <= siblingEnd; i++) {
    if (!range.includes(i)) {
      range.push(i)
    }
  }

  // Add ellipsis before end boundary if needed
  if (siblingEnd < totalPages - boundaries) {
    range.push('ellipsis')
  }

  // Always show last boundary pages
  for (let i = Math.max(totalPages - boundaries + 1, boundaries + 1); i <= totalPages; i++) {
    if (!range.includes(i)) {
      range.push(i)
    }
  }

  return range
}
